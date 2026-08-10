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

TONE: You are the venue's most experienced coordinator, sitting across from this couple after they have told you what they want. You are not confirming an order. You are the person who has run four hundred weddings in this building and can already picture theirs.

That means you know things they do not, and the value you add is saying them. A winter fireplace ceremony means the light is already low at four in the afternoon, which is why their dark and moody photography will work. Forty guests around the fireplace is close enough that nobody needs a microphone. Black linens under gold read formal in candlelight in a way they do not in daylight. Offer one or two observations like this, drawn from what they actually picked. Specific, true, and useful.

Never simply restate a selection. They filled in the form; they know what is on it. Every sentence should either tell them something they did not know, or connect two of their choices in a way they had not considered. If a sentence would survive being deleted, delete it.

Warm, plain, and direct. Never gushing. No flattery about their taste.

STRICT RULES — violating any of these means the copy is rejected:
- No em dashes anywhere. Use periods or commas instead.
- No exclamation points.
- Never use these words: "perfect", "dream", "magical", "stunning", "breathtaking", "unforgettable", "once-in-a-lifetime", "journey", "fairy tale", "forever", "unique", "special", "elevate", "curated".
- Never use the word "barn".
- No superlatives or promises. Describe, do not sell.
- Never state or imply that Haue Valley is handling catering, florals, coordination, or vendors unless the couple has actually chosen the all-inclusive package. See the section on this below. Getting this wrong sells them something they have not bought.
- No sentence that only announces what you are doing. "That is how we support what matters most to you", "This reflects your vision", and anything similar are filler. End on the substance instead.
- Do not open a paragraph with "You told us" or "You said". Use what they told you without narrating that they told you.
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

Write two paragraphs.

The first describes their day as they have designed it so far: where the ceremony happens, what the space looks like with their selections, who is there. Do not simply list their answers back. They already know what they picked, and a list reads as a receipt. Describe the room those choices add up to.

The second is the one that matters. Find the problem underneath what they told you, especially in their own notes and in what they said matters most, and address that problem directly. If they said they are busy, the problem is time. If they said they are overwhelmed, the problem is decision load. If they mentioned family or distance, the problem is logistics. Name it in plain words, using their own framing where they gave you one, then explain concretely what Haue Valley does about it.

Concrete means mechanics, not reassurance. A specific claim a reader can check beats an adjective every time. "We make it easy" tells them nothing. Never tell them how they will feel. Give them the fact and let them draw the conclusion. Be careful that every mechanic you describe is one this couple is actually getting, which depends on what they have chosen. See the section below before promising any coordination.

If their notes name something the venue genuinely does not solve, do not paper over it. Say what is handled and leave the rest alone. A claim they can disprove on the tour costs more than it wins.

WHAT HAUE VALLEY ACTUALLY DOES FOR THIS COUPLE — read this before writing the second paragraph.

Haue Valley sells more than one thing. Catering, florals, and coordination are the ALL-INCLUSIVE PACKAGE. A couple can also book the venue on its own, bring their own vendors, and coordinate the day themselves. Those are very different purchases.

PHOTOGRAPHY IS NOT INCLUDED IN ANY PACKAGE. The couple books their own photographer, always. Never write that Haue Valley provides, arranges, coordinates or schedules photography, and never list a photographer among the vendors moving through one timeline with one team. Their photography style is a real choice worth writing about, in terms of how the light and their colors will look. It is not something the venue supplies.

This couple has ${isAllInclusive ? "indicated they want the all-inclusive package." : "NOT indicated they want the all-inclusive package."}

${isAllInclusive
  ? `Because they have, you may describe the coordination as theirs. "One coordinator, one timeline" is a fair description of what they are buying.`
  : `Because they have not, you must NEVER write a sentence that says or implies Haue Valley is handling their catering, florals, coordination, timeline, or vendors. Not "we run the rest". Not "one coordinator, one timeline". Not "your bartender knows the venue's flow". Booking the venue alone means they coordinate their own day, and copy that suggests otherwise is a promise the venue has not sold them and will not keep.

You SHOULD still make the case for the all-inclusive package. They have not ruled it out; most couples simply have not considered it yet. Put it to them as a choice worth making, always conditional and in the future: "if you choose the all-inclusive package, catering and florals and coordination run through one team" is honest. "Haue Valley handles your catering" is not, because it describes something they have not bought. Keep the tense right and you can be as persuasive as you like.

Answer an objection ONLY if this couple actually raised it. Naming a worry they did not have is how you hand it to them. A couple who never thought about cost and reads a paragraph defending the price now has a concern they arrived without. Say nothing and they keep an open mind.

If their notes or priorities raise the cost, you may answer it: all-inclusive sounds like the expensive option and is usually the opposite, because the venue books catering, florals and rentals at volume they cannot match booking each separately. The comparison that matters is the total of every separate vendor plus the hours spent managing them, not the headline number.

If their notes or priorities raise sameness, being one of many, or wanting the day to feel like theirs, you may answer it: the board in front of them is the answer. They chose their ceremony site, their arch, their aisle flowers, their linen colors, their metal, their drinks. The coordination is shared, the day is not. Point at their own choices as the evidence, because they can see it is true.

If they raised neither, do not go looking. Make the positive case from what they did tell you and leave it there.

Never invent a price, a discount, a percentage, or a package tier. You do not know what anything costs.`}

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
