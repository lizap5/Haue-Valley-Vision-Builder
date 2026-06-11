"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";

const floralStyles = [
  { value: "lush_white", label: "Lush and all white", descriptor: "Peonies, ranunculus, garden roses" },
  { value: "wildflower", label: "Wildflower and organic", descriptor: "Loose, natural, gathered from the field" },
  { value: "romantic_color", label: "Romantic with color", descriptor: "Blush, burgundy, mauve" },
  { value: "bold_jewel", label: "Bold jewel tones", descriptor: "Deep plum, terracotta, rich green" },
  { value: "minimal_greenery", label: "Minimal with lots of greenery", descriptor: "Clean, architectural, modern" },
];

export default function Step6Florals() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function confirm() {
    if (!selected) return;
    setBuilderState({ florals: selected });
    router.push("/builder/7");
  }

  return (
    <StepShell step={6}>
      <div className="max-w-xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 6
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          What do your florals look like?
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          Flowers set the entire tone. Choose the palette that speaks to you.
        </p>

        <div className="flex flex-col gap-3 mb-10">
          {floralStyles.map((f) => (
            <button
              key={f.value}
              onClick={() => setSelected(f.value)}
              className={`w-full flex items-center justify-between px-7 py-5 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-hv-tan ${
                selected === f.value
                  ? "border-hv-green bg-hv-green text-white"
                  : "border-hv-linen bg-white text-hv-charcoal hover:border-hv-tan"
              }`}
            >
              <span className="font-serif font-light text-xl text-left leading-snug">{f.label}</span>
              <span className={`font-sans text-[10px] tracking-[0.2em] uppercase text-right ml-4 shrink-0 ${selected === f.value ? "text-white/70" : "text-hv-sage"}`}>
                {f.descriptor}
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
