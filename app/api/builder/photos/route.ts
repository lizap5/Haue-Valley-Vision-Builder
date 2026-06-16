import { NextRequest, NextResponse } from "next/server";
import { BuilderState } from "@/lib/builder-state";

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
}

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

const FLORAL_COLOR_MAP: Record<string, string[]> = {
  soft_neutral:    ["Ivory", "White"],
  romantic_warm:   ["Burgundy", "Ivory"],
  wildflower_earthy: ["Terracotta", "Gold"],
  bold_rich:       ["Burgundy", "Teal", "Emerald"],
  fresh_green:     ["Ivory", "White", "Emerald"],
};

const FLORAL_STYLE_MAP: Record<string, string[]> = {
  soft_neutral:    ["White Blooms", "Roses"],
  romantic_warm:   ["Roses", "White Blooms"],
  wildflower_earthy: ["Greenery"],
  bold_rich:       ["Roses", "Greenery"],
  fresh_green:     ["White Blooms", "Greenery"],
};

const VIBE_MOOD_MAP: Record<string, string[]> = {
  romantic_garden:     ["Romantic", "Elegant"],
  rustic_elegant:      ["Rustic", "Elegant"],
  modern_clean:        ["Elegant"],
  classic_traditional: ["Elegant", "Romantic"],
  whimsical:           ["Romantic"],
};

function scoreRecord(record: AirtableRecord, state: BuilderState): number {
  const fields = record.fields;
  let score = 0;

  // Season match: +3
  const seasonTag = SEASON_MAP[state.season ?? ""];
  if (seasonTag && fields["Season Tags"]?.includes(seasonTag)) score += 3;

  // Color tags: +2 per match
  const colorTags = FLORAL_COLOR_MAP[state.florals ?? ""] ?? [];
  for (const tag of colorTags) {
    if (fields["Color Tags"]?.includes(tag)) score += 2;
  }

  // Floral style tags: +2 per match
  const floralTags = FLORAL_STYLE_MAP[state.florals ?? ""] ?? [];
  for (const tag of floralTags) {
    if (fields["Floral Style Tags"]?.includes(tag)) score += 2;
  }

  // Vibe/mood tags: +2 per match
  const vibeTags = VIBE_MOOD_MAP[state.reception_vibe ?? ""] ?? [];
  for (const tag of vibeTags) {
    if (fields["Mood Tags"]?.includes(tag)) score += 2;
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
      return NextResponse.json({ photos: [] });
    }

    const state: BuilderState = await req.json();
    const photoStyle = state.photography_style; // "airy" | "moody"
    const moodFilter = photoStyle === "airy" ? "Airy" : photoStyle === "moody" ? "Moody" : null;

    const allRecords = await fetchAllRecords();

    // Hard filter by photography style, then score the rest
    const eligible = allRecords.filter((r) => {
      const url = getImageUrl(r);
      if (!url) return false;
      if (moodFilter && !r.fields["Mood Tags"]?.includes(moodFilter)) return false;
      return true;
    });

    const scored: ScoredPhoto[] = eligible
      .map((r) => ({
        id: r.id,
        url: getImageUrl(r)!,
        name: r.fields["Image Name"] ?? r.id,
        score: scoreRecord(r, state),
      }))
      .sort((a, b) => b.score - a.score);

    // Deduplicate by score tier -- pick variety (top score, mid, lower)
    const top = scored.slice(0, 10);
    const picks: ScoredPhoto[] = [];
    if (top[0]) picks.push(top[0]);
    if (top[3]) picks.push(top[3]);
    if (top[7]) picks.push(top[7]);
    // Fall back to fill if not enough
    for (let i = 0; picks.length < 3 && i < top.length; i++) {
      if (!picks.find((p) => p.id === top[i].id)) picks.push(top[i]);
    }

    return NextResponse.json({ photos: picks.slice(0, 3) });
  } catch (err) {
    console.error("Photo fetch error:", err);
    return NextResponse.json({ photos: [] });
  }
}
