"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";

const ranges = [
  { value: 50, label: "Under 50", descriptor: "Intimate" },
  { value: 100, label: "50 – 100", descriptor: "Close-knit" },
  { value: 150, label: "100 – 150", descriptor: "Celebratory" },
  { value: 200, label: "150 – 200", descriptor: "Grand" },
  { value: 201, label: "200+", descriptor: "Full house" },
];

export default function Step2GuestCount() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);

  function confirm() {
    if (selected === null) return;
    setBuilderState({ guest_count: selected });
    router.push("/builder/3");
  }

  return (
    <StepShell step={2}>
      <div className="max-w-xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 2
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          How many guests are you imagining?
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          A rough number is perfect. This helps us show you the right spaces.
        </p>

        <div className="flex flex-col gap-3 mb-10">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => setSelected(r.value)}
              className={`w-full flex items-center justify-between px-7 py-5 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-hv-tan ${
                selected === r.value
                  ? "border-hv-green bg-hv-green text-white"
                  : "border-hv-linen bg-white text-hv-charcoal hover:border-hv-tan"
              }`}
            >
              <span className="font-serif font-light text-xl">{r.label}</span>
              <span className={`font-sans text-[10px] tracking-[0.2em] uppercase ${selected === r.value ? "text-white/70" : "text-hv-sage"}`}>
                {r.descriptor}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={confirm}
          disabled={selected === null}
          className="font-sans inline-block bg-hv-green text-white text-[11px] tracking-[0.2em] uppercase px-10 py-4 hover:bg-hv-green-dark transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </StepShell>
  );
}
