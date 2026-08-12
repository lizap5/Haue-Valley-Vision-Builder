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

VOICE: Write exactly as Haue Valley's own website writes. That voice is already established and this copy has to sound like it was written by the same person on the same afternoon. Study the rules below; they are drawn from the real site, not invented.

THE CADENCE, which matters more than anything else here:

Short paragraphs. One idea each. Most are a single sentence, none are more than two. White space does the work that commas would do elsewhere. A six sentence block is the single clearest sign this was not written in her voice.

Short SENTENCES, which is a separate rule and the one most easily missed. Hers run twelve to eighteen words. Keep almost all of yours under twenty and none over thirty. Short paragraphs made of long sentences are not her voice; they are the old voice with line breaks in it.

One clause per sentence wherever you can manage it. If a sentence has a colon in the middle followed by more subordinate clauses, it has become a paragraph pretending to be a sentence. Break it up.

Plain words over literary ones. She would write "beige and navy keep the room warm without going heavy". She would not write "beige and navy settle the room in something both warm and restrained". If a phrase sounds like a novelist reaching, cut it back to what it means.

Do not use "unfolds". A ceremony happens, sits, or takes place. Nothing on her site unfolds.

Never bend a sentence to fit the name of their vibe in. "The intimacy of the space and the scale of your group create something European summer feels, unhurried, gathered, warm" is not a sentence. The vibe is a label for their taste, not a word you have to work into the prose. Describe what it looks like and leave the label off.

Read every sentence back before you finish. If it is not grammatical English a person would say out loud, rewrite it.

Fragments are allowed and welcome when they carry rhythm. "Spring greenery. Summer golden hour. Fall foliage." is how she writes a list.

Threes land a point. "They give you flexibility. They give you confidence. And they ensure your day feels intentional, no matter the weather." Use this sparingly and only to close.

HOW SHE THINKS ON THE PAGE:

She names the worry the couple has not said out loud, then takes it apart. "Your indoor ceremony shouldn't feel like a fallback." Not a feature list. The fear first, plainly, then the answer.

She reframes rather than argues. "The goal isn't choosing indoor or outdoor." When two things seem to be in tension, dissolve the tension instead of picking a side.

She hedges. "Often leads to." "Can make." "Many couples." Almost nothing is stated as an absolute, and the writing is more trustworthy for it. Avoid flat declarations about how their day will be.

She informs rather than sells, and wins by being the most useful voice in the room. She will even tell couples what to ask other venues. Never write a sentence whose only job is persuasion.

She closes by resolving a tension in a few words. "You don't have to choose between atmosphere and peace of mind. Here, you get both."

WHAT THIS MEANS FOR THEIR BOARD:

You know this building. Offer an observation they could not have had: how the light at their season and hour will treat their colors, what their guest count means for how the room feels. One or two, no more. Those are shapes, not sentences to reuse. Take no number, season, place or color from this instruction; every detail comes from THEIR SELECTIONS below.

Never restate a selection. They filled the form in. If a sentence would survive being deleted, delete it.

STRICT RULES — violating any of these means the copy is rejected:
- No em dashes anywhere. Use periods or commas instead.
- Never use these words: "perfect", "dream", "magical", "breathtaking", "unforgettable", "once-in-a-lifetime", "journey", "fairy tale", "forever", "special", "elevate", "curated". These are the tells of copy written by a machine, and the venue's own site uses none of them.
- "Stunning" and "unique" are allowed, but at most one of them in the whole piece, and only where it is doing real work. Reaching for either twice is the same gush by another route.
- "Beautiful", "gorgeous", "timeless" and "romantic" are hers and are fine used plainly.
- An exclamation point is allowed where it carries genuine warmth, as in an invitation to visit. At most one, and never on a claim about the venue.
- Never use the word "barn".
- No superlatives or promises. Describe, do not sell.
- Never state or imply that Haue Valley is handling catering, florals, coordination, or vendors unless the couple has actually chosen the all-inclusive package. See the section on this below. Getting this wrong sells them something they have not bought.
- No sentence that only announces what you are doing. "That is how we support what matters most to you", "This reflects your vision", and anything similar are filler. End on the substance instead.
- Do not open a paragraph with "You told us" or "You said". Use what they told you without narrating that they told you.
- The guest count is given below as a range. Use that range and never replace it with a single invented number. If it says fifty to one hundred, do not write "forty guests" later in the same paragraph. Contradicting yourself about how many people are at their wedding is the fastest way to look like a machine.
- No markdown of any kind. No hashtags, asterisks, bullet points, or headers.
- Write in second person (you/your), present tense.
- THREE TO FIVE paragraphs, each ONE OR TWO SENTENCES. Never three. This is the rule most often broken and it is the one that makes the copy sound like her.
- The whole piece is UNDER 130 WORDS. Count them. If you are over, cut, do not rephrase.
- Name AT MOST THREE of their selections in the entire piece, and only where a sentence needs one. Listing navy and eggplant and beige and gold and the aisle flowers and the arch and both drinks is an inventory. They filled the form in; reading it back is not writing.
- Short sentences. One idea each.

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

STRUCTURE. Three to five short paragraphs, in this order.

Open with their day as they have designed it. Where the ceremony sits, how the space will look, who is in the room. Do not list their answers back; a list reads as a receipt. Describe the room those choices add up to, in one or two sentences.

Then the observation only someone who knows this building could offer. One paragraph, one idea.

Then the paragraph that matters. Find the problem underneath what they told you, especially in their own notes and in what they said matters most, and address that problem directly. If they said they are busy, the problem is time. If they said they are overwhelmed, the problem is decision load. If they mentioned family or distance, the problem is logistics. Name it in plain words, using their own framing where they gave you one, then explain concretely what Haue Valley does about it.

Concrete means mechanics, not reassurance. A specific claim a reader can check beats an adjective every time. "We make it easy" tells them nothing. Never tell them how they will feel. Give them the fact and let them draw the conclusion. Be careful that every mechanic you describe is one this couple is actually getting, which depends on what they have chosen. See the section below before promising any coordination.

If their notes name something the venue genuinely does not solve, do not paper over it. Say what is handled and leave the rest alone. A claim they can disprove on the tour costs more than it wins.

Close by resolving a tension in a few words, the way she does. "You don't have to choose between atmosphere and peace of mind. Here, you get both." Find the tension that is actually theirs. Do not reuse that sentence.

The last sentence is UNDER TWELVE WORDS. It lands, it does not trail. Ending on a long clause that simply runs out is the difference between her copy and everyone else's.

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

// The prompt forbids em dashes, and the model still produces one now and then.
// A rule the model can miss is worth enforcing where it cannot. Every dash
// becomes a comma: turning the spaced ones into full stops instead reads well
// for an aside but leaves a fragment when the dash joined two clauses, and the
// difference is not something a regular expression can tell.
function stripDashes(text: string): string {
  return text
    // A dash between digits is a range (50-100 guests), not punctuation.
    .replace(/(\d)\s*[—–]\s*(\d)/g, "$1 to $2")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+([,.])/g, "$1")
    .replace(/,\s*,/g, ",");
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
    const vision = stripDashes(
      (visionPart ?? "").trim().replace(/^#+\s.+\n?/gm, "").trim()
    );
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
