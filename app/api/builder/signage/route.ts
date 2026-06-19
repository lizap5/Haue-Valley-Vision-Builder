import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { BuilderState } from "@/lib/builder-state";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FLORAL_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  soft_neutral:     { bg: "#F2EDE4", text: "#3D3228", accent: "#B8A89A" },
  romantic_warm:    { bg: "#EDD5CC", text: "#5C2D3A", accent: "#C4857A" },
  wildflower_earthy:{ bg: "#E8C9A8", text: "#4A3020", accent: "#B8895A" },
  bold_rich:        { bg: "#2C1B2E", text: "#F0E8F0", accent: "#9B7EA8" },
  fresh_green:      { bg: "#D4E2D4", text: "#2A3E2A", accent: "#6B8F6B" },
};

function buildDrinkPrompt(drink: string): string {
  return `Professional product photography of a "${drink}" cocktail. Crystal cut-glass tumbler or appropriate glassware, sitting on a marble or stone surface. Soft natural light from the upper left casting gentle shadows. A single olive branch sprig on the left side. Warm cream ivory background. High-end editorial style, beautiful garnish appropriate to the drink. No text, no labels, no signs, no words anywhere in the image.`;
}

export async function POST(req: NextRequest) {
  try {
    const state: BuilderState = await req.json();
    const drink = state.signature_drink ?? "Signature Cocktail";

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "Missing OpenAI key" });
    }

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: buildDrinkPrompt(drink),
      n: 1,
      size: "1024x1792",
      quality: "standard",
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      return NextResponse.json({ ok: false, error: "No image returned" });
    }

    const florals = state.florals ?? "soft_neutral";
    const colors = FLORAL_COLORS[florals] ?? FLORAL_COLORS.soft_neutral;

    return NextResponse.json({
      ok: true,
      drinkImageUrl: imageUrl,
      colors,
      drink,
    });
  } catch (err) {
    console.error("Signage generation error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
