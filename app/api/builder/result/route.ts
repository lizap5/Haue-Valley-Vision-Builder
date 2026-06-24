import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { BuilderState } from "@/lib/builder-state";

const client = new Anthropic();

const SEASON_LABELS: Record<string, string> = {
  spring: "Spring (April – May)",
  summer: "Summer (June – August)",
  fall: "Fall (September – November)",
  winter: "Winter (December – March)",
  unsure: "Not yet decided",
};

const CEREMONY_LABELS: Record<string, string> = {
  stone_wall: "The Stone Wall (outdoor, open sky)",
  forest_view: "The Forest View (tree canopy, dappled light)",
  indoor_fireplace: "Indoor by the Fireplace (warm and sheltered)",
  unsure: "Not yet decided",
};

const ROOM_FEELING_LABELS: Record<string, string> = {
  romantic: "Swept away / Romantic",
  elegant: "Elevated / Elegant",
  rustic: "Right at home / Rustic",
  dramatic: "Amazed / Dramatic",
  garden: "Enchanted / Garden",
};

const FLORAL_STYLE_LABELS: Record<string, string> = {
  roses: "Full and lush: roses, peonies, and romantic blooms",
  greenery: "Fresh and organic: lush greenery, ferns, and natural textures",
  white_blooms: "Clean and ethereal: white blooms, ivory, and soft neutrals",
  hydrangea: "Garden and abundant: hydrangea, wildflowers, and loose arrangements",
};

const PRIORITY_LABELS: Record<string, string> = {
  photographs: "Photographs we'll look at forever",
  guest_experience: "Every guest feels taken care of",
  atmosphere: "A space that takes your breath away",
  stress_free: "A day we actually get to enjoy",
  food_drink: "Food and drinks that wow",
  all_inclusive: "Everything handled, start to finish",
};

function buildPrompt(state: BuilderState): string {
  const names = state.couple_names || "this couple";
  const guestLabel =
    state.guest_count === 50 ? "under 50 guests"
    : state.guest_count === 100 ? "50 to 100 guests"
    : state.guest_count === 150 ? "100 to 150 guests"
    : state.guest_count === 200 ? "150 to 200 guests"
    : state.guest_count === 201 ? "over 200 guests"
    : "an intimate group";

  const priority = state.priority ? (PRIORITY_LABELS[state.priority] ?? state.priority) : "Not specified";
  const isAllInclusive = state.all_inclusive_intent ?? state.priority === "all_inclusive";
  const wantsStressFree = state.priority === "stress_free";
  const colorsLabel = (state.colors_chosen ?? []).join(", ") || "Not specified";

  const aiParagraph = isAllInclusive
    ? `Haue Valley's all-inclusive package means every detail above is handled for you: catering, florals, coordination, and more. You walk in and simply enjoy the day you pictured.`
    : wantsStressFree
    ? `You said a stress-free day matters most. It is worth knowing that Haue Valley offers a fully all-inclusive package: catering, florals, coordination, and more, all handled in-house. Many couples find it changes how they experience their wedding day entirely. Ask us about it when you come for your tour.`
    : `Haue Valley works with your preferred vendors and can recommend trusted partners for every element of your day. You bring the vision; we provide the setting and the support.`;

  return `You are writing personalized wedding vision copy for Haue Valley, a private estate wedding venue in Pacific, MO. Your tone is warm, specific, and quietly aspirational. You write like a trusted friend who knows the venue deeply, not like a marketer.

STRICT RULES — violating any of these means the copy is rejected:
- No em dashes anywhere. Use periods or commas instead.
- No exclamation points.
- No words like "dream", "magical", "perfect", "stunning", "breathtaking", "unforgettable", "once-in-a-lifetime", "journey", "fairy tale", or "forever".
- Never use the word "barn" anywhere.
- Do not use the word "unique" or "special".
- Do not use corporate or AI-sounding phrases.
- No markdown of any kind. No hashtags, no asterisks, no bullet points, no headers.
- Write in second person (you/your), present tense.
- Short sentences. Two to three paragraphs. No bullet points.

ABOUT THE COUPLE:
- Names: ${names}
- Guest count: ${guestLabel}
- Season: ${SEASON_LABELS[state.season ?? "unsure"] ?? "Not specified"}
- Wedding date (typed by couple): ${state.wedding_date || "Not provided"}
- How they want guests to feel: ${ROOM_FEELING_LABELS[state.room_feeling ?? ""] ?? "Not specified"}
- Floral vision: ${FLORAL_STYLE_LABELS[state.floral_style ?? ""] ?? "Not specified"}
- Colors chosen: ${colorsLabel}
- Ceremony location: ${CEREMONY_LABELS[state.ceremony_location ?? "unsure"] ?? "Not specified"}
- Photography style: ${state.photography_style === "airy" ? "Light and airy" : state.photography_style === "moody" ? "Dark and moody" : "Not specified"}
- The one thing that matters most: ${priority}
- Signature drink: ${state.signature_drink || "Not specified"}
- Additional notes from couple: ${state.additional_notes || "None"}

If the couple provided a specific wedding date or month, use that exact month or timeframe when referencing their day. If no specific date was given, use the season label instead. Never contradict the date they typed.

Write exactly three paragraphs of vision copy. Each paragraph is two to four sentences. Paint a picture of their day using the details above. Be specific. Reference their actual choices. Do not summarize. Do not list. Make them feel it.

After the three paragraphs, output exactly this separator on its own line:
---
Then output the all-inclusive paragraph exactly as written below. Do not rewrite it. Do not add to it.
${aiParagraph}`;
}

function fallbackVision(state: BuilderState): { heading: string; vision: string; all_inclusive_paragraph: string } {
  const names = state.couple_names || "You two";
  const isAllInclusive = state.all_inclusive_intent ?? state.priority === "all_inclusive";
  const wantsStressFree = state.priority === "stress_free";

  return {
    heading: `${names}, this is your Haue Valley wedding.`,
    vision: [
      "Picture the property on your day. Florals that reflect exactly who you are. Guests who feel the care in every corner.",
      "Your ceremony sets the tone, and the evening that follows carries it forward. Every detail considered. Nothing that feels like filler.",
      "This is what Haue Valley is built for.",
    ].join("\n\n"),
    all_inclusive_paragraph: isAllInclusive
      ? "Haue Valley's all-inclusive package means every detail above is handled for you: catering, florals, coordination, and more. You walk in and simply enjoy the day you pictured."
      : wantsStressFree
      ? "You said a stress-free day matters most. It is worth knowing that Haue Valley offers a fully all-inclusive package: catering, florals, coordination, and more, all handled in-house. Ask us about it when you come for your tour."
      : "Haue Valley works with your preferred vendors and can recommend trusted partners for every element of your day. You bring the vision; we provide the setting and the support.",
  };
}

export async function POST(req: NextRequest) {
  try {
    const state: BuilderState = await req.json();
    const names = state.couple_names || "You two";

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(fallbackVision(state));
    }

    const prompt = buildPrompt(state);

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const [visionPart, aiPart] = raw.split(/\n---\n/);

    const vision = (visionPart ?? "").trim().replace(/^#+\s.+\n?/gm, "").trim();
    const all_inclusive_paragraph = (aiPart ?? "").trim() || fallbackVision(state).all_inclusive_paragraph;

    return NextResponse.json({
      heading: `${names}, this is your Haue Valley wedding.`,
      vision,
      all_inclusive_paragraph,
    });
  } catch (err) {
    console.error("Vision generation error:", err);
    const state: BuilderState = await req.json().catch(() => ({}));
    return NextResponse.json(fallbackVision(state));
  }
}
