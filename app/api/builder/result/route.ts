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
  outdoor_stone: "Outdoor stone ceremony space (open air)",
  indoor: "Indoor ceremony",
  unsure: "Not yet decided",
};

const VIBE_LABELS: Record<string, string> = {
  romantic_garden: "Romantic garden party",
  rustic_elegant: "Rustic and elevated",
  modern_clean: "Modern and refined",
  classic_traditional: "Classic and timeless",
  whimsical: "Whimsical and free",
};

const FLORAL_LABELS: Record<string, string> = {
  soft_neutral: "Soft and neutral: ivory, blush, white / peonies, ranunculus, garden roses",
  romantic_warm: "Romantic and warm: blush, mauve, burgundy / roses, dahlias, sweet peas",
  wildflower_earthy: "Wildflower and earthy: cream, peach, terracotta / cosmos, chamomile, dried grasses",
  bold_rich: "Bold and rich: deep plum, burgundy, forest green / garden roses, anemones, eucalyptus",
  fresh_green: "Fresh and green: white, ivory, lush greenery / hydrangeas, ferns, lily of the valley",
};

const PRIORITY_LABELS: Record<string, string> = {
  food_drink: "Amazing food and drinks",
  photography: "Stunning photography",
  dance_party: "A dance floor that never empties",
  guest_experience: "Guest experience above everything",
  decor_florals: "Show-stopping decor and florals",
  stress_free: "A stress-free day",
  intimate_moments: "Quiet, intimate moments",
  all_inclusive: "Having everything handled for us",
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

  const priorities = (state.priorities ?? [])
    .map((p) => PRIORITY_LABELS[p] ?? p)
    .join(", ");

  const isAllInclusive = state.all_inclusive_intent ?? false;
  const wantsStressFree = (state.priorities ?? []).includes("stress_free");

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
- Ceremony location: ${CEREMONY_LABELS[state.ceremony_location ?? "unsure"] ?? "Not specified"}
- Reception vibe: ${VIBE_LABELS[state.reception_vibe ?? ""] ?? "Not specified"}
- Florals and colors: ${FLORAL_LABELS[state.florals ?? ""] ?? "Not specified"}
- Photography style: ${state.photography_style === "airy" ? "Light and airy" : state.photography_style === "moody" ? "Dark and moody" : "Not specified"}
- What matters most: ${priorities || "Not specified"}
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
  const isAllInclusive = state.all_inclusive_intent ?? false;
  const wantsStressFree = (state.priorities ?? []).includes("stress_free");

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
