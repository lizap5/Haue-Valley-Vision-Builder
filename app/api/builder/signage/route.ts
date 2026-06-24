import { NextRequest, NextResponse } from "next/server";
import { BuilderState } from "@/lib/builder-state";

export const maxDuration = 60;

const FLORAL_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  roses:        { bg: "#EDD5CC", text: "#5C2D3A", accent: "#C4857A" },
  greenery:     { bg: "#D4E2D4", text: "#2A3E2A", accent: "#6B8F6B" },
  white_blooms: { bg: "#F2EDE4", text: "#3D3228", accent: "#B8A89A" },
  hydrangea:    { bg: "#D8E0EC", text: "#2A3550", accent: "#7B92B8" },
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

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: buildDrinkPrompt(drink),
      n: 1,
      size: "1024x1792",
      quality: "standard",
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      return NextResponse.json({ ok: false, error: "No image returned" });
    }

    const floralStyle = state.floral_style ?? "white_blooms";
    const colors = FLORAL_COLORS[floralStyle] ?? FLORAL_COLORS.white_blooms;

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
