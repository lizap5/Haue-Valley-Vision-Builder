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
//   Ceremony Location Tags: The Stone Wall, The Fireplace, The Forest View
//   Setting Tags: Indoor, Outdoor
//   Aisle Tags:  The Feyre Aisle Flowers, The Cassian Aisle Flowers,
//                The Gwen Aisle Flowers, The Velaris Aisle Flowers
//   Arch Tags:   The Feyre Arch Flowers, The Elaine Arch Flowers,
//                The Cassian Arch Flowers, The Gwen Arch Flowers,
//                The Wooden Cross, The Wooden Arbor
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
- space_tags: where at the venue this is (0-2 of): "Ceremony" (any ceremony site, indoor or outdoor), "Reception" (dining tables, dance floor, indoor hall), "Upper Patio" (outdoor patio/terrace lounge area), "Bar Sign" (a printed sign listing drinks), "Detail" (close-up of decor, florals, place settings), "Other"
- setting_tags: exactly one of "Indoor" or "Outdoor", based on where the photo was taken
- ceremony_location_tags: ONLY if this is a ceremony photo, which of Haue Valley's three ceremony sites it shows (0-1 of):
  "The Stone Wall" — outdoor. A long horizontal stone wall stands behind the couple with a rounded stone archway built into the center of it, framing them. Guests sit on backless wooden benches, aisle is poured concrete, trees rise behind the wall.
  "The Fireplace" — indoor. A tall stacked-stone fireplace fills the wall behind the couple, with pillar candles and florals along the mantle. Tall windows on either side with white draped curtains, wooden cross-back chairs (not benches), polished concrete floor.
  "The Forest View" — outdoor. A slim freestanding wooden arbor stands at the end of the aisle with no stone behind it, under a wide canopy of mature green trees, open lawn and sky beyond. Guests sit on backless wooden benches.
  The two outdoor sites are easy to confuse: the deciding detail is a solid stone wall with an arch cut into it (Stone Wall) versus a thin freestanding wooden arbor under trees (Forest View). Return an empty array if it is not a ceremony photo or the site is unclear.
- aisle_tags: ONLY if flowers lining the ceremony aisle are clearly visible (0-1 of): "The Feyre Aisle Flowers" (white and blush clustered arrangements), "The Cassian Aisle Flowers" (white blooms with heavy greenery), "The Gwen Aisle Flowers" (white and green, looser and wilder), "The Velaris Aisle Flowers" (blue, lilac, and purple tones). Return an empty array unless you are confident.
- arch_tags: ONLY if a ceremony arch, arbor, or cross is clearly visible (0-1 of): "The Feyre Arch Flowers" (lush white garden florals with a pop of blush), "The Elaine Arch Flowers" (clean white and black with greens), "The Cassian Arch Flowers" (mostly green with a pop of white), "The Gwen Arch Flowers" (wild, loose, free-form arrangement), "The Wooden Cross" (a bare or lightly decorated wooden cross), "The Wooden Arbor" (a bare or lightly decorated wooden arbor or pergola). Return an empty array unless you are confident.
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

// Alias spellings, matching app/api/builder/photos/route.ts. The script writes
// to whichever column name actually exists in the table, so it works whether
// the field is called "Vibe Tags" or just "Vibes".
const FIELD_ALIASES = {
  vibe_tags:              ["Vibe Tags", "Vibes", "Vibe"],
  space_tags:             ["Space Tags", "Spaces", "Space"],
  ceremony_location_tags: ["Ceremony Location Tags", "Ceremony Location", "Ceremony Tags"],
  setting_tags:           ["Setting Tags", "Setting", "Indoor Outdoor"],
  aisle_tags:             ["Aisle Tags", "Aisle Flowers", "Aisle"],
  arch_tags:              ["Arch Tags", "Arch Selection", "Arch"],
  season_tags:            ["Season Tags", "Seasons", "Season"],
  color_tags:             ["Color Tags", "Colors", "Color"],
  metal_tags:             ["Metal Tags", "Metals", "Accent Metal"],
  mood_tags:              ["Mood Tags", "Moods", "Mood"],
};

// Column names that actually exist in the table, discovered from the records
// we fetched. Populated before tagging starts.
const presentFields = new Set();

function resolveFieldName(key) {
  for (const name of FIELD_ALIASES[key]) {
    if (presentFields.has(name)) return name;
  }
  return FIELD_ALIASES[key][0]; // fall back to the canonical name
}

async function updateRecord(id, tags) {
  const fields = {};
  for (const key of Object.keys(FIELD_ALIASES)) {
    fields[resolveFieldName(key)] = tags[key] ?? [];
  }
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

// Airtable only returns fields that have a value on at least one record, so
// collect every column name we can see to resolve aliases.
for (const r of records) {
  for (const name of Object.keys(r.fields)) presentFields.add(name);
}

const targets = records.filter((r) => {
  if (!imageUrlOf(r)) return false;
  if (RETAG_ALL) return true;
  return !(r.fields[resolveFieldName("vibe_tags")]?.length); // only untagged so far
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
      const extra = [
        (tags.ceremony_location_tags ?? [])[0],
        (tags.aisle_tags ?? [])[0],
        (tags.arch_tags ?? [])[0],
      ].filter(Boolean).join(", ");
      console.log(`✓ ${name}: vibes=[${(tags.vibe_tags ?? []).join(", ")}] spaces=[${(tags.space_tags ?? []).join(", ")}]${extra ? ` ${extra}` : ""}`);
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
