import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllRecords, driveToDirectUrl, servesAnImage, patchRecords,
  isAdminAuthorized, unauthorizedReason,
} from "@/lib/image-tagging";

export const maxDuration = 60;

// Fills the "Image Preview" attachment field from "Google Drive Link".
// Airtable downloads and hosts its own copy, which both the mood board and
// the auto-tagger can read reliably.
//
//   /api/admin/backfill-previews?token=...&dry=1   report only
//   /api/admin/backfill-previews?token=...         fill up to `limit` records
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  if (!isAdminAuthorized(req)) {
    return NextResponse.json(unauthorizedReason(req), { status: 401 });
  }

  const dry = url.searchParams.get("dry") === "1";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 30), 50);

  try {
    const records = await fetchAllRecords();
    const missing = records.filter((r) => {
      const att = r.fields["Image Preview"] as unknown[] | undefined;
      return !att?.length && r.fields["Google Drive Link"];
    });

    if (!missing.length) {
      return NextResponse.json({
        ok: true,
        message: "Every record already has an Image Preview. Nothing to do.",
        total: records.length,
      });
    }

    // Check a sample before writing anything.
    const sample = missing.slice(0, 3);
    const checks = await Promise.all(
      sample.map((r) => servesAnImage(driveToDirectUrl(r.fields["Google Drive Link"] as string)))
    );
    const reachable = checks.filter(Boolean).length;

    if (reachable === 0) {
      return NextResponse.json({
        ok: false,
        problem: "None of the sampled Google Drive links returned an image.",
        likelyCause: "The Drive files are not shared publicly.",
        fix: 'In Google Drive select the files, choose Share, and set General access to "Anyone with the link" as Viewer. Then run this again.',
        missingPreviews: missing.length,
      }, { status: 422 });
    }

    if (dry) {
      const runs = Math.ceil(missing.length / limit);
      return NextResponse.json({
        ok: true,
        dryRun: true,
        total: records.length,
        missingPreviews: missing.length,
        perRequest: limit,
        estimatedRuns: runs,
        sampleReachable: `${reachable} of ${sample.length}`,
        message: `${missing.length} records need an Image Preview. Each call fills up to ${limit}, so expect about ${runs} run${runs === 1 ? "" : "s"}. Remove dry=1 to start; each response reports how many remain.`,
      });
    }

    const batch = missing.slice(0, limit);
    const result = await patchRecords(
      batch.map((r) => ({
        id: r.id,
        fields: { "Image Preview": [{ url: driveToDirectUrl(r.fields["Google Drive Link"] as string) }] },
      }))
    );

    const remaining = missing.length - result.ok;

    return NextResponse.json({
      ok: result.failed === 0,
      filled: result.ok,
      failed: result.failed,
      remaining,
      errors: result.errors.slice(0, 3),
      message: remaining > 0
        ? `Filled ${result.ok}. ${remaining} still to go, run this again to continue.`
        : `Filled ${result.ok}. All done. Airtable downloads each file in the background, so previews may take a minute to appear.`,
    });
  } catch (err) {
    console.error("backfill-previews error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
