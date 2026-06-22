"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";

const vibes = [
  { value: "romantic_garden", label: "Romantic garden party", descriptor: "Soft, lush, and full of bloom" },
  { value: "rustic_elegant", label: "Rustic and elevated", descriptor: "Natural textures, candlelight, warmth" },
  { value: "modern_clean", label: "Modern and refined", descriptor: "Clean lines, intentional, understated" },
  { value: "classic_traditional", label: "Classic and timeless", descriptor: "Formal, polished, enduring" },
  { value: "whimsical", label: "Whimsical and free", descriptor: "Unexpected, joyful, one of a kind" },
];

export default function Step5Vibe() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function confirm() {
    if (!selected) return;
    setBuilderState({ reception_vibe: selected });
    router.push("/builder/6");
  }

  return (
    <StepShell step={5} photo="/images/steps/public-6.jpeg">
      <div className="max-w-xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 5
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          What feeling do you want your reception to have?
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          Choose the atmosphere that feels most like you as a couple.
        </p>

        <div className="flex flex-col gap-3 mb-10">
          {vibes.map((v) => (
            <button
              key={v.value}
              onClick={() => setSelected(v.value)}
              className={`w-full flex flex-col items-start px-6 py-5 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-hv-tan text-left ${
                selected === v.value
                  ? "border-hv-green bg-hv-green text-white"
                  : "border-hv-linen bg-white text-hv-charcoal hover:border-hv-tan"
              }`}
            >
              <span className="font-serif font-light text-lg sm:text-xl leading-snug">{v.label}</span>
              <span className={`font-sans text-[10px] tracking-[0.2em] uppercase mt-1 ${selected === v.value ? "text-white/70" : "text-hv-sage"}`}>
                {v.descriptor}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={confirm}
          disabled={!selected}
          className="font-sans inline-block bg-hv-green text-white text-[11px] tracking-[0.2em] uppercase px-10 py-4 hover:bg-hv-green-dark transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </StepShell>
  );
}
