import { NextRequest, NextResponse } from "next/server";
import { BuilderState } from "@/lib/builder-state";
import { VIBES, CEREMONY_LOCATIONS, SIGNATURE_DRINKS } from "@/lib/calculator-options";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TOURS_TABLE_ID   = process.env.AIRTABLE_TOURS_TABLE_ID!;

// Generic "label as stored in Airtable" -> "builder value" reverse lookup,
// built straight from the same option lists the builder and photo scorer
// use. Keeping this generic (instead of a hand-typed map that can drift)
// means it can never fall out of sync with what /api/builder/submit writes.
function reverseByLabel(list: { value: string; label: string }[]): Record<string, string> {
  return Object.fromEntries(list.map((o) => [o.label, o.value]));
}

const VIBE_REVERSE      = reverseByLabel(VIBES);
const CEREMONY_REVERSE  = reverseByLabel(CEREMONY_LOCATIONS);
const DRINK_REVERSE     = reverseByLabel(SIGNATURE_DRINKS);

const SEASON_REVERSE: Record<string, string> = {
  Spring: "spring",
  Summer: "summer",
  Fall:   "fall",
  Winter: "winter",
};

const PHOTO_STYLE_REVERSE: Record<string, string> = {
  "Light and Airy": "airy",
  "Dark and Moody":  "moody",
};

export interface DisplayData {
  coupleNames: string;
  weddingDate: string;
  visionCopy: string;
  styleName: string;
  signatureDrink: string;
  ceremonyLocation: string;
  colors: { bg: string; text: string; accent: string };
  photos: Array<{ url: string }>;
}

// A single neutral, on-brand scheme. The old per-couple scheme was derived
// from a "Floral Style" field the current builder never writes (it was
// replaced by "vibe" during the rework), so there's no reliable per-couple
// signal left in Airtable to drive this — better to show one scheme that
// always looks intentional than to guess wrong for every couple.
const DEFAULT_COLORS = { bg: "#F2EDE4", text: "#3D3228", accent: "#B8A89A" };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const coupleParam = searchParams.get("couple");
  const dateParam   = searchParams.get("date");

  if (!coupleParam && !dateParam) {
    return NextResponse.json({ error: "Provide couple or date param" }, { status: 400 });
  }

  try {
    // Build Airtable filter
    let formula: string;
    if (coupleParam) {
      formula = `FIND(LOWER("${coupleParam.toLowerCase()}"), LOWER({Couple Names})) > 0`;
    } else {
      formula = `{Wedding Date} = "${dateParam}"`;
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TOURS_TABLE_ID}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1&sort[0][field]=Submitted At&sort[0][direction]=desc`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Airtable error" }, { status: 502 });
    }

    const data = await res.json();
    const record = data.records?.[0];

    if (!record) {
      return NextResponse.json({ error: "No record found" }, { status: 404 });
    }

    const f = record.fields;

    // Reconstruct builder state for photo scoring from the fields the
    // CURRENT /api/builder/submit route actually writes. Note: aisle
    // flowers, arch selection, linen colors, and accent metal are only
    // folded into the free-text "Additional Notes" field today, not stored
    // as their own columns, so they can't be reconstructed here — the
    // scorer still works well off vibe, ceremony, season, photo style, and
    // drinks alone.
    const favoriteDrinkLabels = ((f["Favorite Drinks"] as string) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const state: BuilderState = {
      vibe:               VIBE_REVERSE[f["Style Name"] as string],
      ceremony_location:  CEREMONY_REVERSE[f["Ceremony Location"] as string],
      season:             SEASON_REVERSE[f["Season"] as string],
      photography_style:  PHOTO_STYLE_REVERSE[f["Photo Style"] as string] as BuilderState["photography_style"],
      signature_drinks:   favoriteDrinkLabels.map((label) => DRINK_REVERSE[label]).filter(Boolean),
    };

    // Fetch scored photos using internal photos API
    const photosRes = await fetch(
      new URL("/api/builder/photos", req.url).toString(),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      }
    );

    const photosData = photosRes.ok ? await photosRes.json() : { photos: [] };
    const topPhotos  = (photosData.photos ?? []).slice(0, 2);

    const displayData: DisplayData = {
      coupleNames:    (f["Couple Names"] as string) ?? "",
      weddingDate:    (f["Wedding Date"] as string) ?? "",
      visionCopy:     (f["Vision Copy"]  as string) ?? "",
      styleName:      (f["Style Name"]   as string) ?? "",
      signatureDrink: favoriteDrinkLabels.join(" & "),
      ceremonyLocation: (f["Ceremony Location"] as string) ?? "",
      colors:         DEFAULT_COLORS,
      photos: topPhotos.map((p: { url: string }) => ({ url: p.url })),
    };

    return NextResponse.json(displayData);
  } catch (err) {
    console.error("Display route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
