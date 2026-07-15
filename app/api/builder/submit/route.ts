import { NextRequest, NextResponse } from "next/server";
import { BuilderState } from "@/lib/builder-state";
import {
  VIBES, AISLE_FLOWERS, ARCHES, LINEN_COLORS, ACCENT_METALS,
  SIGNATURE_DRINKS, CEREMONY_LOCATIONS, labelFor,
} from "@/lib/calculator-options";

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
      "Vibe":                     labelFor(VIBES, state.vibe),
      "Ceremony Location":        state.ceremony_location === "unsure" ? "Undecided" : labelFor(CEREMONY_LOCATIONS, state.ceremony_location),
      "Aisle Flowers":            state.aisle_flowers === "unsure" ? "Undecided" : labelFor(AISLE_FLOWERS, state.aisle_flowers),
      "Arch Selection":           state.arch_selection === "unsure" ? "Undecided" : labelFor(ARCHES, state.arch_selection),
      "Linen Colors":             (state.linen_colors ?? []).map((v) => labelFor(LINEN_COLORS, v)).join(", "),
      "Accent Metal":             labelFor(ACCENT_METALS, state.accent_metal),
      "Season":                   SEASON_LABELS[state.season ?? ""] ?? "",
      "Signature Drinks":         state.alcohol_opt_out ? "No alcohol, mocktails" : (state.signature_drinks ?? []).map((v) => labelFor(SIGNATURE_DRINKS, v)).join(", "),
      "The One Thing":            PRIORITY_LABELS[state.priority ?? ""] ?? "",
      "Guest Count":              GUEST_COUNT_LABELS[state.guest_count ?? 0] ?? "",
      "All-Inclusive Interest":   state.all_inclusive_intent ?? false,
      "Budget Range":             state.budget_range ?? "",
      "How They Heard About Us":  state.heard_about ?? "",
      "Additional Notes":         state.additional_notes ?? "",
      "Tour Status":              "Upcoming",
      "Vision Builder Completed": true,
      "Submitted At":             new Date().toISOString().split("T")[0],
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
