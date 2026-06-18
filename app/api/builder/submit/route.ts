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

const CEREMONY_LABELS: Record<string, string> = {
  outdoor_stone: "Outdoor stone space",
  indoor: "Indoor",
  unsure: "Undecided",
};

const VIBE_LABELS: Record<string, string> = {
  romantic_garden: "Romantic garden party",
  rustic_elegant: "Rustic and elevated",
  modern_clean: "Modern and refined",
  classic_traditional: "Classic and timeless",
  whimsical: "Whimsical and free",
};

const FLORAL_LABELS: Record<string, string> = {
  soft_neutral: "Soft and neutral",
  romantic_warm: "Romantic and warm",
  wildflower_earthy: "Wildflower and earthy",
  bold_rich: "Bold and rich",
  fresh_green: "Fresh and green",
};

const PRIORITY_LABELS: Record<string, string> = {
  food_drink: "Amazing food and drinks",
  photography: "Stunning photography",
  dance_party: "A dance floor that never empties",
  guest_experience: "Guest experience above everything",
  decor_florals: "Show-stopping decor and florals",
  stress_free: "A stress-free day",
  intimate_moments: "Quiet intimate moments",
  all_inclusive: "Having everything handled for us",
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

    const priorities = (state.priorities ?? [])
      .map((p) => PRIORITY_LABELS[p] ?? p);

    const fields: Record<string, unknown> = {
      "Couple Names":             state.couple_names ?? "",
      "Email":                    state.email ?? "",
      "Wedding Date":             state.wedding_date ?? "",
      "Season":                   SEASON_LABELS[state.season ?? ""] ?? "",
      "Guest Count":              GUEST_COUNT_LABELS[state.guest_count ?? 0] ?? "",
      "Photo Style":              PHOTO_STYLE_LABELS[state.photography_style ?? ""] ?? "",
      "Ceremony Location":        CEREMONY_LABELS[state.ceremony_location ?? ""] ?? "",
      "Reception Vibe":           VIBE_LABELS[state.reception_vibe ?? ""] ?? "",
      "Florals and Colors":       FLORAL_LABELS[state.florals ?? ""] ?? "",
      "Signature Drink":          state.signature_drink ?? "",
      "Priorities":               priorities,
      "All-Inclusive Interest":   state.all_inclusive_intent ?? false,
      "Additional Notes":         state.additional_notes ?? "",
      "Vision Builder Completed": true,
      "Submitted At":             new Date().toISOString(),
    };

    // Strip out empty strings so Airtable doesn't reject mismatched field types
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
