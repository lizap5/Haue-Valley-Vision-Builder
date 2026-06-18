"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";

const locations = [
  { value: "outdoor_stone", label: "Outdoor stone ceremony space", descriptor: "Open air, surrounded by nature" },
  { value: "indoor", label: "Indoor ceremony", descriptor: "Warm and sheltered, any weather" },
  { value: "unsure", label: "We haven't decided yet", descriptor: "" },
];

export default function Step4Ceremony() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function confirm() {
    if (!selected) return;
    setBuilderState({ ceremony_location: selected });
    router.push("/builder/5");
  }

  return (
    <StepShell step={4} photo="/images/steps/step-4.jpg">
      <div className="max-w-xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 4
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          Where do you see yourselves saying your vows?
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          Haue Valley has two distinct ceremony spaces, each with its own character.
        </p>

        <div className="flex flex-col gap-3 mb-10">
          {locations.map((l) => (
            <button
              key={l.value}
              onClick={() => setSelected(l.value)}
              className={`w-full flex items-center justify-between px-7 py-5 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-hv-tan ${
                selected === l.value
                  ? "border-hv-green bg-hv-green text-white"
                  : "border-hv-linen bg-white text-hv-charcoal hover:border-hv-tan"
              }`}
            >
              <span className="font-serif font-light text-xl text-left leading-snug">{l.label}</span>
              {l.descriptor && (
                <span className={`font-sans text-[10px] tracking-[0.2em] uppercase text-right ml-4 shrink-0 ${selected === l.value ? "text-white/70" : "text-hv-sage"}`}>
                  {l.descriptor}
                </span>
              )}
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
