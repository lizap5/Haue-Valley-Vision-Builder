import { NextRequest, NextResponse } from "next/server";
import { BuilderState } from "@/lib/builder-state";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TOURS_TABLE_ID = process.env.AIRTABLE_TOURS_TABLE_ID!;

const SEASON_LABELS: Record<string, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
  unsure: "Not sure",
};

const PHOTO_STYLE_LABELS: Record<string, string> = {
  airy: "Light and Airy",
  moody: "Dark and Moody",
};

const ROOM_FEELING_LABELS: Record<string, string> = {
  romantic: "Swept away / Romantic",
  elegant: "Elevated / Elegant",
  rustic: "Right at home / Rustic",
  dramatic: "Amazed / Dramatic",
  garden: "Enchanted / Garden",
};

const FLORAL_STYLE_LABELS: Record<string, string> = {
  roses: "Full and lush — roses, peonies, and romantic blooms",
  greenery: "Fresh and organic — lush greenery, ferns, and natural textures",
  white_blooms: "Clean and ethereal — white blooms, ivory, and soft neutrals",
  hydrangea: "Garden and abundant — hydrangea, wildflowers, and loose arrangements",
};

const CEREMONY_LABELS: Record<string, string> = {
  stone_wall: "The Stone Wall",
  forest_view: "The Forest View",
  indoor_fireplace: "Indoor by the Fireplace",
  unsure: "Undecided",
};

const PRIORITY_LABELS: Record<string, string> = {
  photographs: "Photographs we'll look at forever",
  guest_experience: "Every guest feels taken care of",
  atmosphere: "A space that takes your breath away",
  stress_free: "A day we actually get to enjoy",
  food_drink: "Food and drinks that wow",
  all_inclusive: "Everything handled, start to finish",
};

const GUEST_COUNT_LABELS: Record<number, string> = {
  50: "Under 50",
  100: "50 – 100",
  150: "100 – 150",
  200: "150 – 200",
  201: "200+",
};

export async function POST(req: NextRequest) {
  try {
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !TOURS_TABLE_ID) {
      return NextResponse.json({ ok: false, error: "Missing Airtable config" });
    }

    const state: BuilderState = await req.json();

    const fields: Record<string, unknown> = {
      "Couple Names":             state.couple_names ?? "",
      "Email":                    state.email ?? "",
      "Wedding Date":             state.wedding_date ?? "",
      "Photo Style":              PHOTO_STYLE_LABELS[state.photography_style ?? ""] ?? "",
      "Room Feeling":             ROOM_FEELING_LABELS[state.room_feeling ?? ""] ?? "",
      "Floral Style":             FLORAL_STYLE_LABELS[state.floral_style ?? ""] ?? "",
      "Colors Chosen":            (state.colors_chosen ?? []).join(", "),
      "Season":                   SEASON_LABELS[state.season ?? ""] ?? "",
      "Ceremony Location":        CEREMONY_LABELS[state.ceremony_location ?? ""] ?? "",
      "Signature Drink":          state.signature_drink ?? "",
      "The One Thing":            PRIORITY_LABELS[state.priority ?? ""] ?? "",
      "Guest Count":              GUEST_COUNT_LABELS[state.guest_count ?? 0] ?? "",
      "All-Inclusive Interest":   state.all_inclusive_intent ?? false,
      "Budget Range":             state.budget_range ?? "",
      "How They Heard About Us":  state.heard_about ?? "",
      "Additional Notes":         state.additional_notes ?? "",
      "Tour Status":              "Upcoming",
      "Vision Builder Completed": true,
      "Submitted At":             new Date().toISOString(),
    };

    const cleanFields = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== "" && v !== null && v !== undefined)
    );

    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TOURS_TABLE_ID}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: cleanFields }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Airtable Tours write error:", err);
      return NextResponse.json({ ok: false, error: err }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
