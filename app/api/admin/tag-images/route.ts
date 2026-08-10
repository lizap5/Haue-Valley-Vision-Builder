import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllRecords, presentFieldsOf, resolveFieldName, imageUrlOf,
  tagImage, buildTagFields, patchRecords,
  isAdminAuthorized, unauthorizedReason,
} from "@/lib/image-tagging";

export const maxDuration = 60;

// Auto-tags the image library with Claude vision, a batch at a time so each
// request finishes well inside the serverless time limit.
//
//   /api/admin/tag-images?token=...&dry=1        preview tags for a few images
//   /api/admin/tag-images?token=...              tag the next batch, preserving
//                                                any column that already has a value
//   /api/admin/tag-images?token=...&overwrite=1  replace existing tags too
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  if (!isAdminAuthorized(req)) {
    return NextResponse.json(unauthorizedReason(req), { status: 401 });
  }

  const dry = url.searchParams.get("dry") === "1";
  // Default is to protect hand-curated tags and only fill empty columns.
  const preserveExisting = url.searchParams.get("overwrite") !== "1";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 6), 12);
  // Each image now costs a download plus a vision call, so a large batch can
  // outrun maxDuration. Stop early and save what is done rather than time out
  // and lose the whole batch.
  const startedAt = Date.now();
  const TIME_BUDGET_MS = 45_000;

  try {
    const records = await fetchAllRecords();
    const present = presentFieldsOf(records);

    // Marker columns proving this tagger has seen a record. Setting Tags is the
    // reliable one: the prompt requires exactly one of Indoor/Outdoor for every
    // photo. Vibe Tags is legitimately empty for photos that match no vibe, so
    // using it alone would re-tag those records on every scheduled run forever.
    const markerColumns = [
      resolveFieldName("setting_tags", present),
      resolveFieldName("vibe_tags", present),
    ];
    const alreadyTagged = (r: { fields: Record<string, unknown> }) =>
      markerColumns.some((col) => {
        const v = r.fields[col];
        return Array.isArray(v) ? v.length > 0 : Boolean(v);
      });

    const withImages = records.filter((r) => imageUrlOf(r));
    // With overwrite, everything is fair game again.
    const pending = preserveExisting ? withImages.filter((r) => !alreadyTagged(r)) : withImages;

    if (!pending.length) {
      return NextResponse.json({
        ok: true,
        message: "Every image with a readable file is already tagged.",
        total: records.length,
        withImages: withImages.length,
        skippedNoImage: records.length - withImages.length,
      });
    }

    const batch = pending.slice(0, limit);

    const results: {
      name: string;
      willWrite?: Record<string, unknown>;
      dropped?: Record<string, string[]>;
      keptExisting?: string[];
      error?: string;
    }[] = [];
    const updates: { id: string; fields: Record<string, unknown> }[] = [];

    let stoppedEarly = false;
    for (const record of batch) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        stoppedEarly = true;
        break;
      }
      const name = (record.fields["Image Name"] as string) ?? record.id;
      try {
        const tags = await tagImage(imageUrlOf(record)!);
        const { fields, dropped, skipped } = buildTagFields(record, tags, present, preserveExisting);
        // Report exactly what would be written, not the raw model output, so a
        // dry run actually verifies the outcome.
        results.push({
          name,
          willWrite: fields,
          ...(Object.keys(dropped).length ? { dropped } : {}),
          ...(skipped.length ? { keptExisting: skipped } : {}),
        });
        if (Object.keys(fields).length) updates.push({ id: record.id, fields });
      } catch (err) {
        results.push({ name, error: String(err).slice(0, 200) });
      }
    }

    // A single unreadable file must not stop the run, so failures are collected
    // per record rather than blocking up front. Only a batch where nothing at
    // all succeeded points at a broken pipeline worth reporting.
    //
    // Requires a few records before drawing that conclusion: the last one or
    // two pending are often the known-bad stragglers everything else already
    // skipped, and reporting those as a pipeline failure is alarming and wrong.
    const succeeded = results.filter((r) => !r.error).length;
    const MIN_BATCH_TO_DIAGNOSE = 3;
    if (results.length >= MIN_BATCH_TO_DIAGNOSE && succeeded === 0) {
      return NextResponse.json({
        ok: false,
        problem: `All ${results.length} images in this batch failed to process.`,
        likelyCause: "The image files cannot be read, or the vision request is being rejected.",
        fix: "Check the errors below. If they mention loading or fetching, run /api/admin/backfill-previews. Otherwise paste these errors for diagnosis.",
        errors: results.map((r) => ({ name: r.name, error: r.error })),
      }, { status: 422 });
    }

    if (dry) {
      const runs = Math.ceil(pending.length / limit);
      return NextResponse.json({
        ok: true,
        dryRun: true,
        mode: preserveExisting ? "preserve existing tags" : "overwrite everything",
        pending: pending.length,
        perRequest: limit,
        estimatedRuns: runs,
        previewedHere: results.length,
        preview: results,
        message: `${pending.length} images still need tags. This preview covers the first ${results.length}. willWrite is exactly what would land in Airtable; dropped lists values rejected for not being valid options. Each call tags up to ${limit}, so expect about ${runs} run${runs === 1 ? "" : "s"}. Nothing was written; remove dry=1 to apply.`,
      });
    }

    const written = updates.length ? await patchRecords(updates) : { ok: 0, failed: 0, errors: [] };
    const remaining = pending.length - written.ok;

    return NextResponse.json({
      ok: written.failed === 0,
      mode: preserveExisting ? "preserve existing tags" : "overwrite everything",
      tagged: written.ok,
      failed: written.failed,
      remaining: Math.max(remaining, 0),
      errors: written.errors.slice(0, 3),
      results: results.map((r) => ({
        name: r.name,
        wrote: r.willWrite ? Object.keys(r.willWrite) : [],
        dropped: r.dropped,
        error: r.error,
      })),
      stoppedEarly,
      message: remaining > 0
        ? `Tagged ${written.ok}.${stoppedEarly ? " Stopped early to stay inside the time limit." : ""} About ${remaining} left, open this URL again to continue.`
        : `Tagged ${written.ok}. All done.`,
    });
  } catch (err) {
    console.error("tag-images error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
