import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { BuilderState } from "@/lib/builder-state";
import {
  VIBES, AISLE_FLOWERS, ARCHES, LINEN_COLORS, ACCENT_METALS,
  SIGNATURE_DRINKS, CEREMONY_LOCATIONS, labelFor,
} from "@/lib/calculator-options";

const client = new Anthropic();

const SEASON_LABELS: Record<string, string> = {
  spring: "Spring (April – May)",
  summer: "Summer (June – August)",
  fall: "Fall (September – November)",
  winter: "Winter (December – March)",
  unsure: "Not yet decided",
};

const PRIORITY_LABELS: Record<string, string> = {
  photographs: "Photographs we'll look at forever",
  guest_experience: "Every guest feels taken care of",
  atmosphere: "A space that feels right the moment you walk in",
  stress_free: "A day we actually get to enjoy",
  food_drink: "Food and drinks people talk about after",
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
  const linens = (state.linen_colors ?? []).map((v) => labelFor(LINEN_COLORS, v)).join(", ") || "Not specified";
  const drinks = (state.signature_drinks ?? []).map((v) => labelFor(SIGNATURE_DRINKS, v)).join(" and ")
    || (state.alcohol_opt_out ? "Opting out of alcohol, mocktails instead" : "Not specified");

  const aiParagraph = isAllInclusive
    ? `Haue Valley's all-inclusive package means every detail above is handled for you: catering, florals, coordination, and more. You walk in and enjoy the day you planned.`
    : wantsStressFree
    ? `You said a stress-free day matters most. It is worth knowing that Haue Valley offers a fully all-inclusive package: catering, florals, coordination, and more, all handled in-house. Ask us about it when you come for your tour.`
    : `Haue Valley works with your preferred vendors and can recommend trusted partners for every element of your day. You bring the vision; we provide the setting and the support.`;

  return `You are writing a short summary of a couple's wedding vision for Haue Valley, a private estate wedding venue in Pacific, MO. This appears on their personalized mood board after they complete the vision builder.

TONE: Clear, honest, transparent, helpful, and direct. Write like a knowledgeable venue coordinator confirming what the couple chose and what it will look like, not like a marketer. State facts about their selections. It is fine to be warm, but never gushing.

STRICT RULES — violating any of these means the copy is rejected:
- No em dashes anywhere. Use periods or commas instead.
- No exclamation points.
- Never use these words: "perfect", "dream", "magical", "stunning", "breathtaking", "unforgettable", "once-in-a-lifetime", "journey", "fairy tale", "forever", "unique", "special", "elevate", "curated".
- Never use the word "barn".
- No superlatives or promises. Describe, do not sell.
- No markdown of any kind. No hashtags, asterisks, bullet points, or headers.
- Write in second person (you/your), present tense.
- Short sentences. Exactly two paragraphs, two to four sentences each.

THEIR SELECTIONS:
- Names: ${names}
- Vibe: ${labelFor(VIBES, state.vibe) || "Not specified"}
- Guest count: ${guestLabel}
- Season: ${SEASON_LABELS[state.season ?? "unsure"] ?? "Not specified"}
- Wedding date (typed by couple): ${state.wedding_date || "Not provided"}
- Ceremony location: ${labelFor(CEREMONY_LOCATIONS, state.ceremony_location) || "Not yet decided"}
- Aisle flowers: ${labelFor(AISLE_FLOWERS, state.aisle_flowers) || "Not yet decided"}
- Arch or arbor: ${labelFor(ARCHES, state.arch_selection) || "Not yet decided"}
- Linen and napkin colors: ${linens}
- Accent metal: ${labelFor(ACCENT_METALS, state.accent_metal) || "Not specified"}
- Photography style: ${state.photography_style === "airy" ? "Light and airy" : state.photography_style === "moody" ? "Dark and moody" : "Not specified"}
- Signature drinks: ${drinks}
- What matters most to them: ${priority}
- Additional notes from couple: ${state.additional_notes || "None"}

If the couple provided a specific wedding date or month, use that exact timeframe. If not, use the season. Never contradict the date they typed. Only reference selections they actually made; skip anything marked "Not specified" or "Not yet decided" rather than guessing.

Write two paragraphs. The first describes their day as they have designed it so far: where the ceremony happens, what the space looks like with their selections, who is there. The second connects what they said matters most to how Haue Valley supports it, plainly and specifically.

After the two paragraphs, output exactly this separator on its own line:
---
Then output the all-inclusive paragraph exactly as written below. Do not rewrite it. Do not add to it.
${aiParagraph}`;
}

function fallbackVision(state: BuilderState): { heading: string; style_name: string; vision: string; all_inclusive_paragraph: string } {
  const names = state.couple_names || "You two";
  const isAllInclusive = state.all_inclusive_intent ?? state.priority === "all_inclusive";
  const wantsStressFree = state.priority === "stress_free";
  const vibeName = labelFor(VIBES, state.vibe) || "Your Haue Valley Vision";

  return {
    heading: `${names}, this is your Haue Valley wedding.`,
    style_name: vibeName,
    vision: [
      "Here is what you told us: the spaces you chose, the colors you like, and what matters most to you about the day. This board pulls it together in one place.",
      "When you visit, we will walk the actual spaces, answer your questions directly, and you can see how your choices feel in person.",
    ].join("\n\n"),
    all_inclusive_paragraph: isAllInclusive
      ? "Haue Valley's all-inclusive package means every detail above is handled for you: catering, florals, coordination, and more. You walk in and enjoy the day you planned."
      : wantsStressFree
      ? "You said a stress-free day matters most. It is worth knowing that Haue Valley offers a fully all-inclusive package: catering, florals, coordination, and more, all handled in-house. Ask us about it when you come for your tour."
      : "Haue Valley works with your preferred vendors and can recommend trusted partners for every element of your day. You bring the vision; we provide the setting and the support.",
  };
}

export async function POST(req: NextRequest) {
  try {
    const state: BuilderState = await req.json();
    const names = state.couple_names || "You two";
    // The style name is the couple's chosen vibe, matching the calculator exactly.
    const style_name = labelFor(VIBES, state.vibe) || "Your Haue Valley Vision";

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
      style_name,
      vision: vision || fallbackVision(state).vision,
      all_inclusive_paragraph,
    });
  } catch (err) {
    console.error("Vision generation error:", err);
    const state: BuilderState = await req.json().catch(() => ({}));
    return NextResponse.json(fallbackVision(state));
  }
}
