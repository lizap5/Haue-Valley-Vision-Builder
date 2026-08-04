// Shared logic for maintaining the Airtable image library: filling in missing
// image attachments, and auto-tagging images with Claude vision.
//
// Used by the admin routes under /api/admin. Kept here so the tag vocabulary
// lives in exactly one place alongside the scoring in api/builder/photos.

import Anthropic from "@anthropic-ai/sdk";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID!;

export interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

// Admin routes are reachable two ways: a person pasting a URL with ?token=,
// and Vercel Cron, which sends `Authorization: Bearer $CRON_SECRET` and cannot
// carry a secret in the path.
export function isAdminAuthorized(req: Request): boolean {
  const adminToken = process.env.ADMIN_TOKEN ?? "";
  const cronSecret = process.env.CRON_SECRET ?? "";

  if (adminToken) {
    const token = new URL(req.url).searchParams.get("token");
    if (token === adminToken) return true;
  }

  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth === `Bearer ${cronSecret}`) return true;
  }

  return false;
}

// Alias spellings, matching app/api/builder/photos/route.ts. Lets the table
// call a column "Vibes" or "Vibe Tags" without silently breaking.
export const FIELD_ALIASES: Record<string, string[]> = {
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

export function resolveFieldName(key: string, present: Set<string>): string {
  for (const name of FIELD_ALIASES[key]) {
    if (present.has(name)) return name;
  }
  return FIELD_ALIASES[key][0];
}

export function presentFieldsOf(records: AirtableRecord[]): Set<string> {
  const present = new Set<string>();
  for (const r of records) {
    for (const name of Object.keys(r.fields)) present.add(name);
  }
  return present;
}

// Drive's uc?export=view endpoint often returns an HTML interstitial rather
// than image bytes. The thumbnail endpoint serves a real image.
export function driveToDirectUrl(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1600`;
  return url;
}

export function imageUrlOf(record: AirtableRecord): string | null {
  const att = record.fields["Image Preview"] as
    | { url: string; thumbnails?: { large?: { url: string } } }[]
    | undefined;
  if (att?.length) return att[0].thumbnails?.large?.url ?? att[0].url;
  const link = record.fields["Google Drive Link"] as string | undefined;
  if (link) return driveToDirectUrl(link);
  return null;
}

// Confirms a URL actually serves an image before spending a vision call on it.
export async function servesAnImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    const type = res.headers.get("content-type") ?? "";
    return res.ok && type.startsWith("image/");
  } catch {
    return false;
  }
}

export async function fetchAllRecords(): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`);
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Airtable fetch failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

// Airtable accepts up to 10 records per PATCH.
export async function patchRecords(
  updates: { id: string; fields: Record<string, unknown> }[]
): Promise<{ ok: number; failed: number; errors: string[] }> {
  let ok = 0, failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < updates.length; i += 10) {
    const batch = updates.slice(i, i + 10);
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ records: batch }),
    });
    if (res.ok) {
      ok += batch.length;
    } else {
      failed += batch.length;
      errors.push(`${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
  }

  return { ok, failed, errors };
}

// ---------------------------------------------------------------------------
// Claude vision tagging
// ---------------------------------------------------------------------------

export const TAG_PROMPT = `You are tagging a wedding venue photo for Haue Valley, a private estate wedding venue in Pacific, MO. Tag it so it can be matched to couples' style preferences.

Return a JSON object with exactly these keys (arrays may be empty when nothing clearly applies — do not guess):

- vibe_tags: which of these aesthetics the photo clearly fits (0-3 of): "Garden Party" (soft pastel florals, daylight, playful garden feel), "Timeless Estate" (black & white, classic, formal), "European Summer" (white/yellow, citrus, crisp linen, Mediterranean feel), "Moody Romance" (dark tones, candlelight, deep florals), "Colorful Celebration" (bold saturated multicolor, joyful), "Something Blue" (blue tones throughout), "Elevated Western" (pampas, dried grasses, warm neutrals, refined rustic), "Editorial Romance" (clean white, candles, glass, minimal high-fashion feel)
- space_tags: where at the venue this is, using ONLY these existing options (0-3 of): "Ceremony Area - Stone Wall", "Ceremony Area - Forest View", "Ceremony - Indoor", "Ceremony Outdoor", "Fireplace Indoor", "Reception", "Head Table", "Dance Floor", "Bar Area", "Bar Sign" (a printed sign listing drink names), "Upper Patio", "Detail Shot", "Florals", "Exterior", "Bridal Suite", "Grooms Room", "Forest", "Field", "Grassy Hillside", "Waterfall", "Bridge", "Gates", "Silo", "Ivy Wall", "Ruins", "Rocks", "Cabin", "With Cows", "Other"
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
- mood_tags: the photographic feel plus any aesthetic moods that apply (1-4). Always include exactly one of "Airy" (bright, light) or "Moody" (dark, dramatic). Then add any of these that fit: "Romantic", "Elegant", "Rustic", "Dramatic", "Candlelit"

Use ONLY the exact strings listed. Return only valid JSON, no markdown.`;

export async function tagImage(url: string): Promise<Record<string, string[]>> {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 700,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "url", url } },
        { type: "text", text: TAG_PROMPT },
      ],
    }],
  });
  const raw = (message.content[0] as { type: string; text: string }).text
    .trim()
    .replace(/^```json\n?|```$/g, "");
  return JSON.parse(raw);
}

// Builds the Airtable field patch for one record's tags.
//
// preserveExisting keeps any column that already has a value, so hand-curated
// tags survive. Only empty columns get filled.
export function buildTagFields(
  record: AirtableRecord,
  tags: Record<string, string[]>,
  present: Set<string>,
  preserveExisting: boolean
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  for (const key of Object.keys(FIELD_ALIASES)) {
    const column = resolveFieldName(key, present);
    const current = record.fields[column];
    const hasValue = Array.isArray(current) ? current.length > 0 : Boolean(current);

    if (preserveExisting && hasValue) continue;

    const value = tags[key];
    if (!Array.isArray(value)) continue;
    // Skip writing an empty array over an already-empty cell; it is a no-op
    // that only risks an Airtable validation error.
    if (!value.length && !hasValue) continue;

    fields[column] = value;
  }

  return fields;
}
