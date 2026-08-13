import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedReason } from "@/lib/image-tagging";
import { importNewDriveFiles } from "@/lib/drive-import";

export const maxDuration = 60;

// Creates an Airtable row for every image in the watched Drive folder that
// does not have one yet. This is the front of the pipeline: previews and tags
// both key off a row existing with a Google Drive Link, and nothing created
// those rows before this.
//
//   /api/admin/import-drive?token=...&dry=1   report only
//   /api/admin/import-drive?token=...         create up to `limit` rows
//
// Runs automatically as the first step of backfill-previews, so the weekly
// cron picks up new photos without a third scheduled job. Hobby allows only
// two, and both are spoken for.
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json(unauthorizedReason(req), { status: 401 });
  }

  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 50);

  try {
    const result = await importNewDriveFiles({ limit, dry });
    return NextResponse.json(result, { status: result.configured ? 200 : 422 });
  } catch (err) {
    console.error("import-drive error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
