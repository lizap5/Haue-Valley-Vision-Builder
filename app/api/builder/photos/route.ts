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
  };
}

export interface ScoredPhoto {
  id: string;
  url: string;
  name: string;
  score: number;
  space?: string;
}

// The three spaces every mood board must include, in display order.
// These must match the Space Tags values in the Airtable image library.
const REQUIRED_SPACES = ["Ceremony", "Reception", "Upper Patio"] as const;
const BAR_SIGN_SPACE = "Bar Sign";

// Ceremony is the one space with distinct locations, indoor and outdoor.
// When the couple has chosen one, the Ceremony slot prefers a photo of that
// exact location before falling back to any ceremony photo.
const CEREMONY_LOCATION_TAG_MAP: Record<string, string> = {
  stone_wall:  "The Stone Wall",
  fireplace:   "The Fireplace",
  forest_view: "The Forest View",
};

function driveToDirectUrl(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
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
  const fields = record.fields;
  let score = 0;

  // Vibe match is the strongest signal: +5
  const vibeTag = VIBE_TAG_MAP[state.vibe ?? ""];
  if (vibeTag && fields["Vibe Tags"]?.includes(vibeTag)) score += 5;

  // Their exact aisle flowers and arch: +4 each. These are specific enough
  // that a match is nearly always the right photo to show.
  const aisleTag = labelFor(AISLE_FLOWERS, state.aisle_flowers);
  if (aisleTag && state.aisle_flowers !== "unsure" && fields["Aisle Tags"]?.includes(aisleTag)) score += 4;

  const archTag = labelFor(ARCHES, state.arch_selection);
  if (archTag && state.arch_selection !== "unsure" && fields["Arch Tags"]?.includes(archTag)) score += 4;

  // Their ceremony location: +4
  const ceremonyTag = CEREMONY_LOCATION_TAG_MAP[state.ceremony_location ?? ""];
  if (ceremonyTag && fields["Ceremony Location Tags"]?.includes(ceremonyTag)) score += 4;

  // Season match: +3
  const seasonTag = SEASON_MAP[state.season ?? ""];
  if (seasonTag && fields["Season Tags"]?.includes(seasonTag)) score += 3;

  // Linen color tags: +2 per match
  const chosen = state.linen_colors ?? state.colors_chosen ?? [];
  const colorTags = [...new Set(chosen.flatMap((c) => LINEN_COLOR_TAG_MAP[c] ?? []))];
  for (const tag of colorTags) {
    if (fields["Color Tags"]?.includes(tag)) score += 2;
  }

  // Accent metal: +2
  if (state.accent_metal) {
    const metalTag = state.accent_metal === "gold" ? "Gold" : "Silver";
    if (fields["Metal Tags"]?.includes(metalTag) || fields["Color Tags"]?.includes(metalTag)) score += 2;
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
    for (const drink of drinkLabels) {
      const sign = withUrl.find(
        (r) =>
          r.fields["Space Tags"]?.includes(BAR_SIGN_SPACE) &&
          r.fields["Drinks Tags"]?.some((t) => t.toLowerCase() === drink.toLowerCase())
      );
      if (sign) {
        barSigns.push({ id: sign.id, url: getImageUrl(sign)!, name: drink, score: 0 });
      }
    }

    // --- Style pool: everything that's not a bar sign, honoring photo style ---
    const stylePool = withUrl.filter((r) => {
      if (r.fields["Space Tags"]?.includes(BAR_SIGN_SPACE)) return false;
      if (moodFilter && r.fields["Mood Tags"]?.length && !r.fields["Mood Tags"].includes(moodFilter)) return false;
      return true;
    });

    const scored = stylePool
      .map((r) => ({ record: r, score: scoreRecord(r, state) }))
      .sort((a, b) => b.score - a.score);

    const used = new Set<string>();

    // --- Guaranteed space slots: best-scoring photo for each required space ---
    const chosenCeremonyTag = CEREMONY_LOCATION_TAG_MAP[state.ceremony_location ?? ""];
    const spacePhotos: ScoredPhoto[] = [];
    for (const space of REQUIRED_SPACES) {
      const inSpace = (s: { record: AirtableRecord }) =>
        !used.has(s.record.id) && s.record.fields["Space Tags"]?.includes(space);

      // For the ceremony slot, show the location they actually picked
      // (indoor Fireplace or an outdoor space) before any ceremony photo.
      const hit =
        (space === "Ceremony" && chosenCeremonyTag
          ? scored.find(
              (s) => inSpace(s) && s.record.fields["Ceremony Location Tags"]?.includes(chosenCeremonyTag)
            )
          : undefined) ?? scored.find(inSpace);

      if (hit) {
        used.add(hit.record.id);
        spacePhotos.push({
          id: hit.record.id,
          url: getImageUrl(hit.record)!,
          name: hit.record.fields["Image Name"] ?? hit.record.id,
          score: hit.score,
          space,
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
          name: s.record.fields["Image Name"] ?? s.record.id,
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
          name: s.record.fields["Image Name"] ?? s.record.id,
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
