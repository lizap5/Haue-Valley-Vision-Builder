// Auto-tag the Airtable image library with Claude vision.
//
// Usage:
//   node scripts/tag-images.mjs           # tag records missing Vibe Tags
//   node scripts/tag-images.mjs --all     # re-tag EVERY record (fresh start)
//   node scripts/tag-images.mjs --dry     # show what would be written, write nothing
//
// Required env vars (same as the app): AIRTABLE_API_KEY, AIRTABLE_BASE_ID,
// AIRTABLE_TABLE_ID (image library table), ANTHROPIC_API_KEY.
//
// The script writes these fields (all multi-select in Airtable — options must
// exist BEFORE running, Airtable rejects unknown option values by default):
//   Vibe Tags:   Garden Party, Timeless Estate, European Summer, Moody Romance,
//                Colorful Celebration, Something Blue, Elevated Western, Editorial Romance
//   Space Tags:  Ceremony, Reception, Upper Patio, Bar Sign, Detail, Other
//   Season Tags: Spring, Summer, Fall, Winter
//   Color Tags:  White, Ivory, Beige, Yellow, Gold, Blush, Burgundy, Navy, Blue,
//                Purple, Green, Emerald, Brown, Terracotta, Grey, Black, Silver
//   Metal Tags:  Gold, Silver
//   Mood Tags:   Airy, Moody

import Anthropic from "@anthropic-ai/sdk";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID || !process.env.ANTHROPIC_API_KEY) {
  console.error("Missing env vars. Need AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_ID, ANTHROPIC_API_KEY.");
  process.exit(1);
}

const RETAG_ALL = process.argv.includes("--all");
const DRY_RUN = process.argv.includes("--dry");

const client = new Anthropic();

const PROMPT = `You are tagging a wedding venue photo for Haue Valley, a private estate wedding venue in Pacific, MO. Tag it so it can be matched to couples' style preferences.

Return a JSON object with exactly these keys (arrays may be empty when nothing clearly applies — do not guess):

- vibe_tags: which of these aesthetics the photo clearly fits (0-3 of): "Garden Party" (soft pastel florals, daylight, playful garden feel), "Timeless Estate" (black & white, classic, formal), "European Summer" (white/yellow, citrus, crisp linen, Mediterranean feel), "Moody Romance" (dark tones, candlelight, deep florals), "Colorful Celebration" (bold saturated multicolor, joyful), "Something Blue" (blue tones throughout), "Elevated Western" (pampas, dried grasses, warm neutrals, refined rustic), "Editorial Romance" (clean white, candles, glass, minimal high-fashion feel)
- space_tags: where at the venue this is (0-2 of): "Ceremony" (outdoor stone wall, forest ceremony site, or indoor fireplace ceremony), "Reception" (dining tables, dance floor, indoor hall), "Upper Patio" (outdoor patio/terrace lounge area), "Bar Sign" (a printed sign listing drinks), "Detail" (close-up of decor, florals, place settings), "Other"
- season_tags: seasons this could plausibly be (0-2): "Spring", "Summer", "Fall", "Winter"
- color_tags: dominant decor colors (0-4 of): "White", "Ivory", "Beige", "Yellow", "Gold", "Blush", "Burgundy", "Navy", "Blue", "Purple", "Green", "Emerald", "Brown", "Terracotta", "Grey", "Black", "Silver"
- metal_tags: visible accent metals (0-2): "Gold", "Silver"
- mood_tags: photographic feel (exactly 1): "Airy" (bright, light) or "Moody" (dark, dramatic)

Use ONLY the exact strings listed. Return only valid JSON, no markdown.`;

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

function imageUrlOf(record) {
  const att = record.fields["Image Preview"];
  if (att?.length) return att[0].thumbnails?.large?.url ?? att[0].url;
  return null;
}

async function tagOne(url) {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "url", url } },
        { type: "text", text: PROMPT },
      ],
    }],
  });
  const raw = message.content[0].text.trim().replace(/^```json\n?|```$/g, "");
  return JSON.parse(raw);
}

async function updateRecord(id, tags) {
  const fields = {
    "Vibe Tags":   tags.vibe_tags ?? [],
    "Space Tags":  tags.space_tags ?? [],
    "Season Tags": tags.season_tags ?? [],
    "Color Tags":  tags.color_tags ?? [],
    "Metal Tags":  tags.metal_tags ?? [],
    "Mood Tags":   tags.mood_tags ?? [],
  };
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${id}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    }
  );
  if (!res.ok) throw new Error(`Airtable update failed for ${id}: ${res.status} ${await res.text()}`);
}

const records = await fetchAllRecords();
const targets = records.filter((r) => {
  if (!imageUrlOf(r)) return false;
  if (RETAG_ALL) return true;
  return !(r.fields["Vibe Tags"]?.length); // only untagged (no Vibe Tags yet)
});

console.log(`${records.length} records in library, ${targets.length} to tag${DRY_RUN ? " (dry run)" : ""}.`);

let done = 0, failed = 0;
for (const record of targets) {
  const name = record.fields["Image Name"] ?? record.id;
  try {
    const tags = await tagOne(imageUrlOf(record));
    if (DRY_RUN) {
      console.log(`[dry] ${name}:`, JSON.stringify(tags));
    } else {
      await updateRecord(record.id, tags);
      console.log(`✓ ${name}: vibes=[${(tags.vibe_tags ?? []).join(", ")}] spaces=[${(tags.space_tags ?? []).join(", ")}]`);
    }
    done++;
  } catch (err) {
    failed++;
    console.error(`✗ ${name}: ${err.message}`);
  }
  // stay well under Airtable's 5 req/s limit
  await new Promise((r) => setTimeout(r, 300));
}

console.log(`\nDone. ${done} tagged, ${failed} failed.`);
