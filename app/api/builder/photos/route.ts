import { NextRequest, NextResponse } from "next/server";
import { BuilderState } from "@/lib/builder-state";
import { SIGNATURE_DRINKS, AISLE_FLOWERS, ARCHES, labelFor } from "@/lib/calculator-options";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID!;

interface AirtableAttachment {
  url: string;
  thumbnails?: { large?: { url: string } };
}

interface AirtableRecord {
  id: string;
  fields: {
    "Image Name"?: string;
    "Google Drive Link"?: string;
    "Image Preview"?: AirtableAttachment[];
    "Color Tags"?: string[];
    "Space Tags"?: string[];
    "Season Tags"?: string[];
    "Vibe Tags"?: string[];
    "Metal Tags"?: string[];
    "Aisle Tags"?: string[];
    "Arch Tags"?: string[];
    "Ceremony Location Tags"?: string[];
    "Setting Tags"?: string[];
    "Floral Style Tags"?: string[];
    "Mood Tags"?: string[];
    "Drinks Tags"?: string[];
    "Dance Floor Location"?: string[];
    "Notes"?: string;
    [key: string]: unknown;
  };
}

// Field names people reasonably use for the same thing in Airtable. The first
// non-empty match wins, so renaming a column does not silently zero a score.
const FIELD_ALIASES: Record<string, string[]> = {
  vibe:     ["Vibe Tags", "Vibes", "Vibe"],
  space:    ["Space Tags", "Spaces", "Space"],
  season:   ["Season Tags", "Seasons", "Season"],
  color:    ["Color Tags", "Colors", "Color"],
  metal:    ["Metal Tags", "Metals", "Accent Metal"],
  mood:     ["Mood Tags", "Moods", "Mood"],
  drinks:   ["Drinks Tags", "Drink Tags", "Drinks"],
  aisle:    ["Aisle Tags", "Aisle Flowers", "Aisle"],
  arch:     ["Arch Tags", "Arch Selection", "Arch"],
  ceremony: ["Ceremony Location Tags", "Ceremony Location", "Ceremony Tags"],
  setting:  ["Setting Tags", "Setting", "Indoor Outdoor"],
};

// Reads a tag list by logical name, tolerating the alias spellings above.
function tags(record: AirtableRecord, key: keyof typeof FIELD_ALIASES): string[] {
  for (const name of FIELD_ALIASES[key]) {
    const value = record.fields[name];
    if (Array.isArray(value) && value.length) return value as string[];
    if (typeof value === "string" && value.trim()) return [value];
  }
  return [];
}

export interface ScoredPhoto {
  id: string;
  url: string;
  name: string;
  score: number;
  space?: string;
}

// The three slots every mood board must fill, in display order. Each slot
// accepts several Space Tags values, because the library's vocabulary is more
// granular than the board is (a Head Table photo is still a reception photo).
const SPACE_SLOTS: { slot: string; accepts: string[]; prefersNot?: string[] }[] = [
  {
    slot: "Ceremony",
    accepts: [
      "Ceremony", "Ceremony Outdoor", "Ceremony - Indoor", "Ceremony Indoor",
      "Ceremony Area - Stone Wall", "Ceremony Area - Forest View",
      "Ceremony Area - Trees", "Fireplace Indoor",
    ],
  },
  {
    slot: "Reception",
    accepts: ["Reception", "Head Table", "Dance Floor"],
    // A centerpiece close-up is technically a reception photo but does not
    // show the room. Prefer anything else, and fall back only if the library
    // has nothing wider.
    prefersNot: ["Detail Shot"],
  },
  {
    // Was "Upper Patio", which no photo ever carried, so the slot always read
    // "coming soon". A second reception photo shows the whole space, which the
    // first slot's close-up cannot. `used` guarantees it is a different photo.
    slot: "Reception Space",
    accepts: ["Reception", "Dance Floor", "Head Table"],
    prefersNot: ["Detail Shot"],
  },
];

const BAR_SIGN_SPACE = "Bar Sign";

// The library writes drink names loosely: "Rum & Coke" for our "Rum and Coke",
// "Whiskey & Coke" for our "Whiskey Coke". Compare on a normalized form so an
// ampersand or a stray "and" does not lose the match.
function normalizeDrink(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word && word !== "and")
    .join(" ");
}

// Category tags rather than drink names. Every drink photo carries these, so
// they cannot identify which drink a photo shows.
const GENERIC_DRINK_TAGS = new Set(["signature drink", "cocktails", "cocktail", "drinks"]);

function specificDrinkTags(record: AirtableRecord): string[] {
  return tags(record, "drinks").filter((t) => !GENERIC_DRINK_TAGS.has(normalizeDrink(t)));
}

// A drink photo is any record naming a specific drink, however it is filed.
// The library tags these "Bar Area" + "Detail Shot" rather than "Bar Sign",
// so requiring that one space tag would find nothing.
function isDrinkPhoto(record: AirtableRecord): boolean {
  return tags(record, "space").includes(BAR_SIGN_SPACE) || specificDrinkTags(record).length > 0;
}

// Ceremony is the one space with distinct locations, indoor and outdoor.
// When the couple has chosen one, the Ceremony slot prefers a photo of that
// exact location before falling back to any ceremony photo.
const CEREMONY_LOCATION_TAG_MAP: Record<string, string> = {
  stone_wall:  "The Stone Wall",
  fireplace:   "The Fireplace",
  forest_view: "The Forest View",
};

// Several existing Space Tags already name the ceremony site. Treat them as
// equivalent to a Ceremony Location Tag so photos tagged before that field
// existed still match the couple's chosen site.
const CEREMONY_LOCATION_FROM_SPACE: Record<string, string> = {
  "Ceremony Area - Stone Wall":  "The Stone Wall",
  "Ceremony Area - Forest View": "The Forest View",
  "Ceremony Area - Trees":       "The Forest View", // older name for the same site
  "Ceremony - Indoor":           "The Fireplace",
  "Ceremony Indoor":             "The Fireplace",
  "Fireplace Indoor":            "The Fireplace",
};

// Every ceremony site a photo can be read as showing, from either field.
function ceremonyLocationsOf(record: AirtableRecord): string[] {
  const explicit = tags(record, "ceremony");
  const derived = tags(record, "space")
    .map((t) => CEREMONY_LOCATION_FROM_SPACE[t])
    .filter(Boolean);
  return [...new Set([...explicit, ...derived])];
}

// Drive's uc?export=view endpoint often returns an HTML interstitial rather
// than image bytes. The thumbnail endpoint serves a real image, and sz sets
// the long edge in pixels.
function driveToDirectUrl(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1600`;
  return url;
}

function getImageUrl(record: AirtableRecord): string | null {
  const attachments = record.fields["Image Preview"];
  if (attachments?.length) {
    return attachments[0].thumbnails?.large?.url ?? attachments[0].url;
  }
  const driveLink = record.fields["Google Drive Link"];
  if (driveLink) return driveToDirectUrl(driveLink);
  return null;
}

// Maps builder state values to Airtable tag values
const SEASON_MAP: Record<string, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

// Vibe values -> Airtable "Vibe Tags" values (exact calculator names)
const VIBE_TAG_MAP: Record<string, string> = {
  garden_party:         "Garden Party",
  timeless_estate:      "Timeless Estate",
  european_summer:      "European Summer",
  moody_romance:        "Moody Romance",
  colorful_celebration: "Colorful Celebration",
  something_blue:       "Something Blue",
  elevated_western:     "Elevated Western",
  editorial_romance:    "Editorial Romance",
};

// Linen color values -> Airtable "Color Tags" values
const LINEN_COLOR_TAG_MAP: Record<string, string[]> = {
  white:        ["White", "Ivory"],
  ivory:        ["Ivory", "White"],
  beige:        ["Beige", "Ivory"],
  maize_yellow: ["Yellow", "Gold"],
  blush:        ["Blush", "Ivory"],
  dusty_rose:   ["Blush", "Burgundy"],
  burgundy:     ["Burgundy"],
  navy:         ["Navy", "Blue"],
  eggplant:     ["Purple", "Burgundy"],
  lilac:        ["Purple", "Blush"],
  light_blue:   ["Blue"],
  slate_blue:   ["Blue", "Navy"],
  light_olive:  ["Green"],
  forest_green: ["Green", "Emerald"],
  brown:        ["Brown", "Terracotta"],
  light_grey:   ["Grey", "White"],
  black:        ["Black"],
};

function scoreRecord(record: AirtableRecord, state: BuilderState): number {
  let score = 0;

  // Vibe match is the strongest signal: +5
  const vibeTag = VIBE_TAG_MAP[state.vibe ?? ""];
  if (vibeTag && tags(record, "vibe").includes(vibeTag)) score += 5;

  // Their exact aisle flowers and arch: +4 each. These are specific enough
  // that a match is nearly always the right photo to show.
  const aisleTag = labelFor(AISLE_FLOWERS, state.aisle_flowers);
  if (aisleTag && state.aisle_flowers !== "unsure" && tags(record, "aisle").includes(aisleTag)) score += 4;

  const archTag = labelFor(ARCHES, state.arch_selection);
  if (archTag && state.arch_selection !== "unsure" && tags(record, "arch").includes(archTag)) score += 4;

  // Their ceremony location: +4
  const ceremonyTag = CEREMONY_LOCATION_TAG_MAP[state.ceremony_location ?? ""];
  if (ceremonyTag && ceremonyLocationsOf(record).includes(ceremonyTag)) score += 4;

  // Season match: +3
  const seasonTag = SEASON_MAP[state.season ?? ""];
  if (seasonTag && tags(record, "season").includes(seasonTag)) score += 3;

  // Linen color tags: +2 per match
  const chosen = state.linen_colors ?? state.colors_chosen ?? [];
  const colorTags = [...new Set(chosen.flatMap((c) => LINEN_COLOR_TAG_MAP[c] ?? []))];
  for (const tag of colorTags) {
    if (tags(record, "color").includes(tag)) score += 2;
  }

  // Accent metal: +2
  if (state.accent_metal) {
    const metalTag = state.accent_metal === "gold" ? "Gold" : "Silver";
    if (tags(record, "metal").includes(metalTag) || tags(record, "color").includes(metalTag)) score += 2;
  }

  return score;
}

async function fetchAllRecords(): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`);
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      next: { revalidate: 300 }, // cache for 5 minutes
    });

    if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

export async function POST(req: NextRequest) {
  try {
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
      return NextResponse.json({ photos: [], spacePhotos: [], barSigns: [] });
    }

    const state: BuilderState = await req.json();
    const photoStyle = state.photography_style; // "airy" | "moody"
    const moodFilter = photoStyle === "airy" ? "Airy" : photoStyle === "moody" ? "Moody" : null;

    const allRecords = await fetchAllRecords();

    const withUrl = allRecords.filter((r) => getImageUrl(r));

    // --- Bar signs: match the couple's chosen drinks against Drinks Tags ---
    const drinkLabels = (state.signature_drinks ?? []).map((v) => labelFor(SIGNATURE_DRINKS, v));
    const barSigns: ScoredPhoto[] = [];
    const usedSigns = new Set<string>();
    for (const drink of drinkLabels) {
      const wanted = normalizeDrink(drink);
      const sign = withUrl.find(
        (r) =>
          !usedSigns.has(r.id) &&
          specificDrinkTags(r).some((t) => normalizeDrink(t) === wanted)
      );
      if (sign) {
        usedSigns.add(sign.id);
        barSigns.push({ id: sign.id, url: getImageUrl(sign)!, name: drink, score: 0 });
      }
    }

    // --- Style pool: venue photos only, honoring photo style ---
    const stylePool = withUrl.filter((r) => {
      // Keep cocktail close-ups out of the mood board's venue slots.
      if (isDrinkPhoto(r)) return false;
      // Mood Tags mixes photographic feel (Airy, Moody) with aesthetic mood
      // (Rustic, Romantic, Elegant). Only drop a photo when it is explicitly
      // tagged the opposite feel, so an untagged-for-feel photo stays eligible.
      if (moodFilter) {
        const moodTags = tags(r, "mood");
        const opposite = moodFilter === "Airy" ? "Moody" : "Airy";
        if (moodTags.includes(opposite) && !moodTags.includes(moodFilter)) return false;
      }
      return true;
    });

    const scored = stylePool
      .map((r) => ({ record: r, score: scoreRecord(r, state) }))
      .sort((a, b) => b.score - a.score);

    const used = new Set<string>();

    // --- Guaranteed space slots: best-scoring photo for each required space ---
    const chosenCeremonyTag = CEREMONY_LOCATION_TAG_MAP[state.ceremony_location ?? ""];
    const spacePhotos: ScoredPhoto[] = [];
    for (const { slot, accepts, prefersNot } of SPACE_SLOTS) {
      const inSpace = (s: { record: AirtableRecord }) =>
        !used.has(s.record.id) && tags(s.record, "space").some((t) => accepts.includes(t));

      // Preferred candidates first, then anything in the space. A slot never
      // goes empty just because every photo carries an avoided tag.
      const preferred = (s: { record: AirtableRecord }) =>
        inSpace(s) && !tags(s.record, "space").some((t) => prefersNot?.includes(t));

      // For the ceremony slot, show the location they actually picked
      // (indoor Fireplace or an outdoor space) before any ceremony photo.
      const hit =
        (slot === "Ceremony" && chosenCeremonyTag
          ? scored.find(
              (s) => inSpace(s) && ceremonyLocationsOf(s.record).includes(chosenCeremonyTag)
            )
          : undefined) ?? scored.find(preferred) ?? scored.find(inSpace);

      if (hit) {
        used.add(hit.record.id);
        spacePhotos.push({
          id: hit.record.id,
          url: getImageUrl(hit.record)!,
          name: (hit.record.fields["Image Name"] as string) ?? hit.record.id,
          score: hit.score,
          space: slot,
        });
      }
    }

    // --- Three more style-matched photos, spread across the score range ---
    const remaining = scored.filter((s) => !used.has(s.record.id));
    const stylePicks: ScoredPhoto[] = [];
    const indices = [0, 3, 7];
    for (const i of indices) {
      const s = remaining[i];
      if (s && !stylePicks.find((p) => p.id === s.record.id)) {
        stylePicks.push({
          id: s.record.id,
          url: getImageUrl(s.record)!,
          name: (s.record.fields["Image Name"] as string) ?? s.record.id,
          score: s.score,
        });
      }
    }
    for (let i = 0; stylePicks.length < 3 && i < remaining.length; i++) {
      const s = remaining[i];
      if (!stylePicks.find((p) => p.id === s.record.id)) {
        stylePicks.push({
          id: s.record.id,
          url: getImageUrl(s.record)!,
          name: (s.record.fields["Image Name"] as string) ?? s.record.id,
          score: s.score,
        });
      }
    }

    return NextResponse.json({
      // Legacy key: first three images for anything still reading `photos`
      photos: [...spacePhotos, ...stylePicks].slice(0, 3),
      spacePhotos,
      stylePhotos: stylePicks,
      barSigns,
    });
  } catch (err) {
    console.error("Photo fetch error:", err);
    return NextResponse.json({ photos: [], spacePhotos: [], stylePhotos: [], barSigns: [] });
  }
}
