"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";

const floralStyles = [
  { value: "roses", label: "Full and lush", descriptor: "Roses, peonies, and romantic blooms" },
  { value: "greenery", label: "Fresh and organic", descriptor: "Lush greenery, ferns, and natural textures" },
  { value: "white_blooms", label: "Clean and ethereal", descriptor: "White blooms, ivory, and soft neutrals" },
  { value: "hydrangea", label: "Garden and abundant", descriptor: "Hydrangea, wildflowers, and loose arrangements" },
];

export default function Step3Season() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function confirm() {
    if (!selected) return;
    setBuilderState({ floral_style: selected });
    router.push("/builder/4");
  }

  return (
    <StepShell step={3} photo="/images/steps/st-louis-elopement-venue-haue-valley.webp">
      <div className="max-w-xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 3
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          What does your floral vision feel like?
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          Florals set the tone more than almost anything else.
        </p>

        <div className="flex flex-col gap-3 mb-10">
          {floralStyles.map((f) => (
            <button
              key={f.value}
              onClick={() => setSelected(f.value)}
              className={`w-full flex flex-col items-start px-6 py-5 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-hv-tan text-left ${
                selected === f.value
                  ? "border-hv-green bg-hv-green text-white"
                  : "border-hv-linen bg-white text-hv-charcoal hover:border-hv-tan"
              }`}
            >
              <span className="font-serif font-light text-lg sm:text-xl leading-snug">{f.label}</span>
              <span className={`font-sans text-[10px] tracking-[0.2em] uppercase mt-1 ${selected === f.value ? "text-white/70" : "text-hv-sage"}`}>
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
