import { NextRequest, NextResponse } from "next/server";
import { BuilderState } from "@/lib/builder-state";

// Placeholder content generator — will be replaced with Claude API call
function generateVision(state: BuilderState): {
  heading: string;
  vision: string;
  all_inclusive_paragraph: string;
} {
  const names = state.couple_names || "You two";
  const season = state.season ?? "unsure";
  const vibe = state.reception_vibe ?? "";
  const florals = state.florals ?? "";
  const ceremony = state.ceremony_location ?? "";
  const isAllInclusive = state.all_inclusive_intent ?? false;

  const seasonPhrases: Record<string, string> = {
    spring: "a spring day when the property is just waking up",
    summer: "a summer evening when the light lingers late",
    fall: "a fall afternoon when the colors are at their peak",
    winter: "a winter day with the stillness only that season brings",
    unsure: "your day at Haue Valley",
  };

  const vibePhrases: Record<string, string> = {
    romantic_garden: "soft and lush, full of bloom and romance",
    rustic_elegant: "warm and elevated, with natural textures and candlelight",
    modern_clean: "clean and refined, with every detail intentional",
    classic_traditional: "timeless and polished, the kind that endures",
    whimsical: "unexpected and joyful, entirely one of a kind",
  };

  const floralPhrases: Record<string, string> = {
    soft_neutral: "peonies and ranunculus in ivory, blush, and white",
    romantic_warm: "roses and dahlias in blush, mauve, and burgundy",
    wildflower_earthy: "cosmos and chamomile in cream, peach, and terracotta",
    bold_rich: "garden roses and anemones in deep plum, burgundy, and forest green",
    fresh_green: "hydrangeas and ferns in white, ivory, and lush greenery",
  };

  const ceremonyPhrases: Record<string, string> = {
    outdoor_stone: "exchanging vows in the open air at the stone ceremony space",
    indoor: "saying your vows sheltered inside, intimate and warm",
    unsure: "exchanging vows at Haue Valley",
  };

  const vision = [
    `Picture ${seasonPhrases[season]}. You arrive to ${florals ? floralPhrases[florals] : "florals chosen just for you"} — everywhere you look, beauty that feels intentional rather than overdone.`,
    `Your ceremony sets the tone: ${ceremonyPhrases[ceremony] ?? ceremonyPhrases["unsure"]}, surrounded by the people who matter most. Then the evening opens into a reception that feels ${vibePhrases[vibe] ?? "entirely like you"}.`,
    `This is what Haue Valley is built for. Not a one-size event, but a day that reflects exactly who you are as a couple.`,
  ].join("\n\n");

  const all_inclusive_paragraph = isAllInclusive
    ? `Haue Valley's all-inclusive package means every detail above is handled for you — catering, florals, coordination, and more — so you walk in and simply enjoy the day you pictured.`
    : `Haue Valley works with your preferred vendors and can recommend trusted partners for every element of your day. You bring the vision; we provide the setting and the support.`;

  return {
    heading: `${names}, this is your Haue Valley wedding.`,
    vision,
    all_inclusive_paragraph,
  };
}

export async function POST(req: NextRequest) {
  try {
    const state: BuilderState = await req.json();
    const content = generateVision(state);
    return NextResponse.json(content);
  } catch {
    return NextResponse.json({ error: "Failed to generate vision" }, { status: 500 });
  }
}
