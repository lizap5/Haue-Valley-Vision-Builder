// Creating the Airtable row from a Drive file is the one step of the pipeline
// nothing owned. Everything downstream is automatic once a row exists with a
// Google Drive Link: backfill-previews attaches the image, tag-images tags it,
// the mood board reads it. Until then a newly uploaded photo is invisible to
// all of it.
//
// The documented alternative was a Zapier "New File in Folder" trigger, which
// misses files that were moved into the folder rather than uploaded to it, and
// misses anything in a subfolder. This does not have that failure mode: it
// lists the folder's current contents on every run and creates whatever is not
// already in Airtable, so a file that arrives by any route is picked up on the
// next pass. The tradeoff is that it only ever looks one folder deep, matching
// the flat-folder rule the library already depends on.
//
// Needs two environment variables:
//   GOOGLE_DRIVE_FOLDER_ID  the watched folder's id, from its URL
//   GOOGLE_DRIVE_API_KEY    a Google Cloud API key with the Drive API enabled
//
// An API key is enough because the folder and its files are already shared
// "anyone with the link" -- the mood board could not render Drive thumbnails
// otherwise, and backfill-previews already fails loudly when that sharing is
// missing. A service account would also work and would not need public
// sharing, but it is a great deal more setup for no gain here.

import { fetchAllRecords, createRecords } from "@/lib/image-tagging";

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID ?? "";
const DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY ?? "";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

export function driveImportConfigured(): boolean {
  return Boolean(DRIVE_FOLDER_ID && DRIVE_API_KEY);
}

// The file id out of any Drive link shape the library has ever stored: the
// /d/<id>/view form this module writes, and the ?id=<id> form of older rows.
// Matching on the id rather than the whole string means a link that was
// rewritten by hand, or stored in the other format, still counts as present
// and does not get imported a second time.
export function driveFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function driveViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

// Direct children of the watched folder only, images only, excluding trash.
// Paginated: the library is already ~170 files and Drive caps a page at 1000.
export async function listFolderImages(): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set(
      "q",
      `'${DRIVE_FOLDER_ID}' in parents and trashed = false and mimeType contains 'image/'`
    );
    url.searchParams.set("fields", "nextPageToken,files(id,name,mimeType)");
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("key", DRIVE_API_KEY);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Drive list failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
    }
    const data = await res.json();
    files.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return files;
}

export interface ImportResult {
  ok: boolean;
  configured: boolean;
  driveFiles?: number;
  alreadyInAirtable?: number;
  newFiles?: number;
  created?: number;
  failed?: number;
  remaining?: number;
  errors?: string[];
  sample?: string[];
  message: string;
}

// Lists the folder, subtracts what Airtable already holds, and creates rows for
// the rest. Bounded per call like every other admin route, and reports what is
// left so a caller can run it again.
export async function importNewDriveFiles(
  { limit = 25, dry = false }: { limit?: number; dry?: boolean } = {}
): Promise<ImportResult> {
  if (!driveImportConfigured()) {
    return {
      ok: false,
      configured: false,
      message:
        "Drive import is not configured. Set GOOGLE_DRIVE_FOLDER_ID and GOOGLE_DRIVE_API_KEY in Vercel, then redeploy Production (env vars are snapshotted at build time).",
    };
  }

  const [driveFiles, records] = await Promise.all([listFolderImages(), fetchAllRecords()]);

  const known = new Set(
    records
      .map((r) => driveFileId((r.fields["Google Drive Link"] as string) ?? ""))
      .filter(Boolean) as string[]
  );

  const fresh = driveFiles.filter((f) => !known.has(f.id));

  if (!fresh.length) {
    return {
      ok: true,
      configured: true,
      driveFiles: driveFiles.length,
      alreadyInAirtable: driveFiles.length,
      newFiles: 0,
      created: 0,
      remaining: 0,
      message: `All ${driveFiles.length} images in the folder are already in Airtable. Nothing to import.`,
    };
  }

  if (dry) {
    return {
      ok: true,
      configured: true,
      driveFiles: driveFiles.length,
      alreadyInAirtable: driveFiles.length - fresh.length,
      newFiles: fresh.length,
      sample: fresh.slice(0, 5).map((f) => f.name),
      message: `${fresh.length} new image${fresh.length === 1 ? "" : "s"} would be imported. Remove dry=1 to create them.`,
    };
  }

  const batch = fresh.slice(0, limit);
  const result = await createRecords(
    batch.map((f) => ({
      fields: {
        "Image Name": f.name,
        "Google Drive Link": driveViewUrl(f.id),
      },
    }))
  );

  const remaining = fresh.length - result.ok;

  return {
    ok: result.failed === 0,
    configured: true,
    driveFiles: driveFiles.length,
    alreadyInAirtable: driveFiles.length - fresh.length,
    newFiles: fresh.length,
    created: result.ok,
    failed: result.failed,
    remaining,
    errors: result.errors.slice(0, 3),
    sample: batch.slice(0, 5).map((f) => f.name),
    message:
      remaining > 0
        ? `Imported ${result.ok}. ${remaining} still to go, run this again to continue.`
        : `Imported ${result.ok}. Previews and tags follow on the next backfill and tagging run.`,
  };
}
