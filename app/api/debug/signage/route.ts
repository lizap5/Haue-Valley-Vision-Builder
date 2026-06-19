import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET() {
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" });
  }

  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: key });

    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: "A professional product photography shot of an Aperol Spritz cocktail in a wine glass with an orange slice garnish, on a marble surface, warm cream background, soft natural light, no text.",
      n: 1,
      size: "1024x1024",
      
    });

    return NextResponse.json({
      ok: true,
      imageUrl: response.data?.[0]?.url,
      keyPresent: true,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      keyPresent: true,
    });
  }
}
