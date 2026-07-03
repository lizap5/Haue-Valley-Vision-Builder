"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";

const priorities = [
  { value: "photographs", label: "Photographs we'll look at forever", descriptor: "Every detail captured, nothing missed" },
  { value: "guest_experience", label: "Every guest feels taken care of", descriptor: "Hospitality at the center of everything" },
  { value: "atmosphere", label: "A space that takes your breath away", descriptor: "The room says everything before a word is spoken" },
  { value: "stress_free", label: "A day we actually get to enjoy", descriptor: "No running around, no loose ends — just presence" },
  { value: "food_drink", label: "Food and drinks that wow", descriptor: "The bar is high and so is the bar cart" },
  { value: "all_inclusive", label: "Everything handled, start to finish", descriptor: "We want someone else to carry the details" },
];

export default function Step8Priorities() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function confirm() {
    if (!selected) return;
    const hasAllInclusive = selected === "all_inclusive";
    setBuilderState({ priority: selected, all_inclusive_intent: hasAllInclusive });
    router.push("/builder/9");
  }

  return (
    <StepShell step={8} totalSteps={9} photo="/images/steps/public-3.jpeg">
      <div className="max-w-xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 8
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          If you could only have one thing be truly perfect, what would it be?
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          Choose the one that matters most.
        </p>

        <div className="flex flex-col gap-3 mb-10">
          {priorities.map((p) => (
            <button
              key={p.value}
              onClick={() => setSelected(p.value)}
              className={`w-full flex flex-col items-start px-6 py-5 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-hv-tan text-left ${
                selected === p.value
                  ? "border-hv-green bg-hv-green text-white"
                  : "border-hv-linen bg-white text-hv-charcoal hover:border-hv-tan"
              }`}
            >
              <span className="font-serif font-light text-lg sm:text-xl leading-snug">{p.label}</span>
              <span className={`font-sans text-[10px] tracking-[0.2em] uppercase mt-1 ${selected === p.value ? "text-white/70" : "text-hv-sage"}`}>
                {p.descriptor}
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
