import { NextRequest, NextResponse } from "next/server";
import { BuilderState } from "@/lib/builder-state";
import { signagePalette, signageArtPrompt } from "@/lib/signage-style";

export const maxDuration = 60;

// A couple hosting no alcohol still gets a bar sign. They are not having
// nothing at the bar, they are having something else, and a grey placeholder
// where everyone else sees a drink reads as an oversight.
function buildMocktailPrompt(): string {
  return `Professional product photography of two elegant non-alcoholic mocktails. Tall crystal cut-glass tumblers with sparkling clear and pale pink drinks, fresh citrus and berry garnishes, mint sprigs. Sitting on a marble surface. Soft natural light from the upper left casting gentle shadows. Warm cream ivory background. High-end editorial style. No bottles, no spirits, no wine glasses. No text, no labels, no signs, no words anywhere in the image.`;
}

function buildDrinkPrompt(drink: string): string {
  return `Professional product photography of a "${drink}" cocktail. Crystal cut-glass tumbler or appropriate glassware, sitting on a marble or stone surface. Soft natural light from the upper left casting gentle shadows. A single olive branch sprig on the left side. Warm cream ivory background. High-end editorial style, beautiful garnish appropriate to the drink. No text, no labels, no signs, no words anywhere in the image.`;
}

// One image, retried once. Concurrent image requests are rate limited, and a
// rejection here used to be indistinguishable from a missing key: the sign
// simply rendered blank. A single retry after a pause clears the throttle.
async function generate(
  openai: import("openai").default,
  prompt: string
): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await openai.images.generate({
        // dall-e-3 is not available to newer projects and returns "the model
        // does not exist", which reads like a typo rather than an entitlement.
        model: "gpt-image-1",
        prompt,
        n: 1,
        // gpt-image-1 offers a different set of sizes; 1024x1792 is rejected.
        size: "1024x1536",
        quality: "medium",
      });
      const image = response.data?.[0];
      // This model returns base64 rather than a URL to fetch.
      if (image?.b64_json) return `data:image/png;base64,${image.b64_json}`;
      if (image?.url) return image.url;
    } catch (err) {
      console.error(`Signage image attempt ${attempt + 1} failed:`, err);
      if (attempt === 0) await new Promise((r) => setTimeout(r, 3000));
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const state: BuilderState = await req.json();
    // A couple who asked for no alcohol gets no cocktail, generated or
    // otherwise. Note ?? would not have caught this: opting out leaves
    // signature_drink an empty string rather than undefined, so the old
    // fallback quietly generated a cocktail from a nameless drink.
    const teetotal = state.alcohol_opt_out === true;
    // Only the tiles they tapped may name the sign. The free text box holds
    // a sentence, not a drink: "I like margaritas and Skip likes dark beer"
    // was printed across a couple's bar signage. That answer belongs in
    // Airtable and the staff email, where it is read by a person, and
    // nowhere near the artwork.
    const drink =
      state.signature_drink?.trim() ||
      (state.alcohol_opt_out ? "Mocktails" : "Cocktails");

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "Missing OpenAI key" });
    }

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Two images, not three: one border serves both signs. Three at once was
    // enough concurrency to get the later two throttled, which is why the
    // signs came back bare while the drink arrived fine.
    const [drinkImageUrl, artUrl] = await Promise.all([
      generate(openai, teetotal ? buildMocktailPrompt() : buildDrinkPrompt(drink)),
      generate(openai, signageArtPrompt(state)),
    ]);

    return NextResponse.json({
      ok: true,
      drinkImageUrl,
      welcomeArtUrl: artUrl,
      seatingArtUrl: artUrl,
      colors: signagePalette(state),
      drink: teetotal ? "Mocktails" : drink,
      // Surfaced so a blank sign can be told from a missing key without
      // reading the function logs.
      artGenerated: Boolean(artUrl),
    });
  } catch (err) {
    console.error("Signage generation error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
