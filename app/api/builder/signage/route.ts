import { NextRequest, NextResponse } from "next/server";
import { BuilderState } from "@/lib/builder-state";
import { signagePalette, signageArtPrompt } from "@/lib/signage-style";

export const maxDuration = 60;

function buildDrinkPrompt(drink: string): string {
  return `Professional product photography of a "${drink}" cocktail. Crystal cut-glass tumbler or appropriate glassware, sitting on a marble or stone surface. Soft natural light from the upper left casting gentle shadows. A single olive branch sprig on the left side. Warm cream ivory background. High-end editorial style, beautiful garnish appropriate to the drink. No text, no labels, no signs, no words anywhere in the image.`;
}

// One image. Resolves to null rather than throwing, so a single slow or
// rejected generation costs its own picture and not the whole set.
async function generate(
  openai: import("openai").default,
  prompt: string,
  size: "1024x1792"
): Promise<string | null> {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size,
      quality: "standard",
    });
    return response.data?.[0]?.url ?? null;
  } catch (err) {
    console.error("Signage image failed:", err);
    return null;
  }
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

    // Three images at once. In series they would exceed the function's time
    // limit; the couple waits for the slowest rather than the sum.
    const [drinkImageUrl, welcomeArtUrl, seatingArtUrl] = await Promise.all([
      generate(openai, buildDrinkPrompt(drink), "1024x1792"),
      generate(openai, signageArtPrompt(state, "welcome"), "1024x1792"),
      generate(openai, signageArtPrompt(state, "seating"), "1024x1792"),
    ]);

    return NextResponse.json({
      ok: true,
      drinkImageUrl,
      welcomeArtUrl,
      seatingArtUrl,
      colors: signagePalette(state),
      drink,
    });
  } catch (err) {
    console.error("Signage generation error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
