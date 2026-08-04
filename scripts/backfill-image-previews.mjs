// Populate the empty "Image Preview" attachment field from "Google Drive Link".
//
// Airtable downloads and stores a copy of any URL you write into an attachment
// field, so this converts fragile Drive links into real hosted images. Both the
// auto-tagger and the mood board work far more reliably against attachments.
//
// Usage:
//   node scripts/backfill-image-previews.mjs --dry   # report only, write nothing
//   node scripts/backfill-image-previews.mjs         # fill empty previews
//
// Requires: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_ID.
//
// The Drive files must be shared as "Anyone with the link can view" or Airtable
// cannot fetch them. Run with --dry first; it checks a sample and tells you.

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
  console.error("Missing env vars. Need AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_ID.");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry");

function driveToDirectUrl(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1600`;
  return url;
}

async function servesAnImage(url) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    const type = res.headers.get("content-type") ?? "";
    return res.ok && type.startsWith("image/");
  } catch {
    return false;
  }
}

async function fetchAllRecords() {
  const records = [];
  let offset;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`);
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } });
    if (!res.ok) throw new Error(`Airtable fetch failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

const records = await fetchAllRecords();

const targets = records.filter(
  (r) => !r.fields["Image Preview"]?.length && r.fields["Google Drive Link"]
);

console.log(`${records.length} records, ${targets.length} missing an Image Preview.`);

if (!targets.length) {
  console.log("Nothing to do.");
  process.exit(0);
}

// Check a sample before writing anything.
const sample = targets.slice(0, 3);
const reachable = (
  await Promise.all(sample.map((r) => servesAnImage(driveToDirectUrl(r.fields["Google Drive Link"]))))
).filter(Boolean).length;

console.log(`Sampled ${sample.length} Drive links, ${reachable} served an image.`);

if (reachable === 0) {
  console.error(`
None of the sampled Drive links returned an image. They are almost certainly
not publicly shared. In Google Drive, select the files, choose Share, and set
"General access" to "Anyone with the link" as Viewer. Then re-run.

Nothing was written.`);
  process.exit(1);
}

if (DRY_RUN) {
  console.log(`\n[dry run] Would fill ${targets.length} Image Preview cells. Re-run without --dry to write.`);
  process.exit(0);
}

let done = 0, failed = 0;

// Airtable accepts up to 10 records per PATCH.
for (let i = 0; i < targets.length; i += 10) {
  const batch = targets.slice(i, i + 10);
  const body = {
    records: batch.map((r) => ({
      id: r.id,
      fields: { "Image Preview": [{ url: driveToDirectUrl(r.fields["Google Drive Link"]) }] },
    })),
  };

  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    done += batch.length;
    console.log(`✓ filled ${done}/${targets.length}`);
  } else {
    failed += batch.length;
    console.error(`✗ batch starting at ${i} failed: ${res.status} ${await res.text()}`);
  }

  await new Promise((r) => setTimeout(r, 300));
}

console.log(`\nDone. ${done} filled, ${failed} failed.`);
console.log("Airtable downloads each file in the background, so previews may take a minute to appear.");
