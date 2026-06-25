import { NextRequest, NextResponse } from "next/server";
import { BuilderState } from "@/lib/builder-state";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TOURS_TABLE_ID   = process.env.AIRTABLE_TOURS_TABLE_ID!;

// Reverse maps — Airtable label → builder state key
const ROOM_FEELING_REVERSE: Record<string, string> = {
  "Swept away / Romantic":  "romantic",
  "Elevated / Elegant":     "elegant",
  "Right at home / Rustic": "rustic",
  "Amazed / Dramatic":      "dramatic",
  "Enchanted / Garden":     "garden",
};

const FLORAL_STYLE_REVERSE: Record<string, string> = {
  "Full and lush — roses, peonies, and romantic blooms":          "roses",
  "Fresh and organic — lush greenery, ferns, and natural textures": "greenery",
  "Clean and ethereal — white blooms, ivory, and soft neutrals":  "white_blooms",
  "Garden and abundant — hydrangea, wildflowers, and loose arrangements": "hydrangea",
};

const SEASON_REVERSE: Record<string, string> = {
  "Spring": "spring",
  "Summer": "summer",
  "Fall":   "fall",
  "Winter": "winter",
};

const CEREMONY_REVERSE: Record<string, string> = {
  "The Stone Wall":          "stone_wall",
  "The Forest View":         "forest_view",
  "Indoor by the Fireplace": "indoor_fireplace",
  "Undecided":               "unsure",
};

const PHOTO_STYLE_REVERSE: Record<string, string> = {
  "Light and Airy": "airy",
  "Dark and Moody":  "moody",
};

const FLORAL_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  roses:        { bg: "#EDD5CC", text: "#5C2D3A", accent: "#C4857A" },
  greenery:     { bg: "#D4E2D4", text: "#2A3E2A", accent: "#6B8F6B" },
  white_blooms: { bg: "#F2EDE4", text: "#3D3228", accent: "#B8A89A" },
  hydrangea:    { bg: "#D8E0EC", text: "#2A3550", accent: "#7B92B8" },
};

export interface DisplayData {
  coupleNames: string;
  weddingDate: string;
  visionCopy: string;
  styleName: string;
  signatureDrink: string;
  colors: { bg: string; text: string; accent: string };
  photos: Array<{ url: string }>;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const coupleParam = searchParams.get("couple");
  const dateParam   = searchParams.get("date");

  // Password check
  const password = searchParams.get("password");
  const displayPassword = process.env.DISPLAY_PASSWORD;
  if (displayPassword && password !== displayPassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    // Reconstruct builder state for photo scoring
    const state: BuilderState = {
      room_feeling:      ROOM_FEELING_REVERSE[f["Room Feeling"] as string]       as BuilderState["room_feeling"],
      floral_style:      FLORAL_STYLE_REVERSE[f["Floral Style"] as string],
      colors_chosen:     ((f["Colors Chosen"] as string) ?? "").split(", ").filter(Boolean),
      season:            SEASON_REVERSE[f["Season"] as string],
      ceremony_location: CEREMONY_REVERSE[f["Ceremony Location"] as string],
      photography_style: PHOTO_STYLE_REVERSE[f["Photo Style"] as string]         as BuilderState["photography_style"],
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

    const floralKey = FLORAL_STYLE_REVERSE[f["Floral Style"] as string] ?? "white_blooms";
    const colors    = FLORAL_COLORS[floralKey] ?? FLORAL_COLORS.white_blooms;

    const displayData: DisplayData = {
      coupleNames:    (f["Couple Names"] as string) ?? "",
      weddingDate:    (f["Wedding Date"] as string) ?? "",
      visionCopy:     (f["Vision Copy"]  as string) ?? "",
      styleName:      (f["Style Name"]   as string) ?? "",
      signatureDrink: (f["Signature Drink"] as string) ?? "",
      colors,
      photos: topPhotos.map((p: { url: string }) => ({ url: p.url })),
    };

    return NextResponse.json(displayData);
  } catch (err) {
    console.error("Display route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
