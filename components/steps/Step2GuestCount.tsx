"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";

const feelings = [
  { value: "romantic", label: "Swept away", descriptor: "Romantic" },
  { value: "elegant", label: "Elevated", descriptor: "Elegant" },
  { value: "rustic", label: "Right at home", descriptor: "Rustic" },
  { value: "dramatic", label: "Amazed", descriptor: "Dramatic" },
  { value: "garden", label: "Enchanted", descriptor: "Garden" },
];

export default function Step2GuestCount() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function confirm() {
    if (!selected) return;
    setBuilderState({ room_feeling: selected });
    router.push("/builder/3");
  }

  return (
    <StepShell step={2} photo="/images/steps/public-2.jpeg">
      <div className="max-w-xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 2
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          Your guests walk through the doors and feel&hellip;
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          This is the moment that sets everything else.
        </p>

        <div className="flex flex-col gap-3 mb-10">
          {feelings.map((f) => (
            <button
              key={f.value}
              onClick={() => setSelected(f.value)}
              className={`w-full flex items-center justify-between px-7 py-5 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-hv-tan ${
                selected === f.value
                  ? "border-hv-green bg-hv-green text-white"
                  : "border-hv-linen bg-white text-hv-charcoal hover:border-hv-tan"
              }`}
            >
              <span className="font-serif font-light text-xl">{f.label}</span>
              <span className={`font-sans text-[10px] tracking-[0.2em] uppercase ${selected === f.value ? "text-white/70" : "text-hv-sage"}`}>
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
