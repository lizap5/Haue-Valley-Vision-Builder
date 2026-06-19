"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";

const priorities = [
  { value: "food_drink", label: "Amazing food and drinks" },
  { value: "photography", label: "Stunning photography" },
  { value: "dance_party", label: "A dance floor that never empties" },
  { value: "guest_experience", label: "Guest experience above everything" },
  { value: "decor_florals", label: "Show-stopping decor and florals" },
  { value: "stress_free", label: "A stress-free day for us" },
  { value: "intimate_moments", label: "Quiet, intimate moments" },
  { value: "all_inclusive", label: "Having everything handled for us" },
];

export default function Step8Priorities() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : prev.length < 3 ? [...prev, value] : prev
    );
  }

  function confirm() {
    if (selected.length === 0) return;
    const hasAllInclusive = selected.includes("all_inclusive");
    setBuilderState({ priorities: selected, all_inclusive_intent: hasAllInclusive });
    router.push("/builder/9");
  }

  return (
    <StepShell step={8} totalSteps={9} photo="/images/steps/public-3.jpeg">
      <div className="max-w-xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 8
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          What matters most to you?
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          Choose up to three. This shapes everything we put together for you.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-left">
          {priorities.map((p) => {
            const isSelected = selected.includes(p.value);
            const isDisabled = !isSelected && selected.length >= 3;
            return (
              <button
                key={p.value}
                onClick={() => toggle(p.value)}
                disabled={isDisabled}
                className={`flex items-center gap-3 px-5 py-4 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-hv-tan ${
                  isSelected
                    ? "border-hv-green bg-hv-green text-white"
                    : isDisabled
                    ? "border-hv-linen bg-white text-hv-charcoal opacity-35 cursor-not-allowed"
                    : "border-hv-linen bg-white text-hv-charcoal hover:border-hv-tan"
                }`}
              >
                <span className={`w-4 h-4 shrink-0 border flex items-center justify-center ${isSelected ? "border-white" : "border-hv-tan"}`}>
                  {isSelected && <span className="block w-2 h-2 bg-white" />}
                </span>
                <span className="font-sans text-sm leading-snug">{p.label}</span>
              </button>
            );
          })}
        </div>

        <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-hv-sage mb-8">
          {selected.length} of 3 selected
        </p>

        <button
          onClick={confirm}
          disabled={selected.length === 0}
          className="font-sans inline-block bg-hv-green text-white text-[11px] tracking-[0.2em] uppercase px-10 py-4 hover:bg-hv-green-dark transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </StepShell>
  );
}
