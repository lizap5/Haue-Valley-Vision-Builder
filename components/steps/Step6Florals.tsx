"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";

const spaces = [
  {
    value: "stone_wall",
    label: "The Stone Wall",
    descriptor: "Outdoor ceremony · Surrounded by nature, open sky above",
  },
  {
    value: "forest_view",
    label: "The Forest View",
    descriptor: "Canopy of trees · Dappled light, wild and romantic",
  },
  {
    value: "indoor_fireplace",
    label: "Indoor by the Fireplace",
    descriptor: "Sheltered and warm · Intimate, any season, any weather",
  },
  {
    value: "unsure",
    label: "We haven't decided yet",
    descriptor: "We'll walk you through all three on your tour",
  },
];

export default function Step6Florals() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function confirm() {
    if (!selected) return;
    setBuilderState({ ceremony_location: selected });
    router.push("/builder/7");
  }

  return (
    <StepShell step={6} photo="/images/steps/public.jpeg">
      <div className="max-w-xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 6
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          Where do you see yourselves saying your vows?
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          Haue Valley has three distinct ceremony spaces, each with its own magic.
        </p>

        <div className="flex flex-col gap-3 mb-10">
          {spaces.map((s) => (
            <button
              key={s.value}
              onClick={() => setSelected(s.value)}
              className={`w-full flex flex-col items-start px-6 py-5 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-hv-tan text-left ${
                selected === s.value
                  ? "border-hv-green bg-hv-green text-white"
                  : "border-hv-linen bg-white text-hv-charcoal hover:border-hv-tan"
              }`}
            >
              <span className="font-serif font-light text-lg sm:text-xl leading-snug">{s.label}</span>
              <span className={`font-sans text-[10px] tracking-[0.2em] uppercase mt-1 ${selected === s.value ? "text-white/70" : "text-hv-sage"}`}>
                {s.descriptor}
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
