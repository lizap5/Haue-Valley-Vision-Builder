"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";

const seasons = [
  { value: "spring", label: "Spring", detail: "April – May" },
  { value: "summer", label: "Summer", detail: "June – August" },
  { value: "fall", label: "Fall", detail: "September – November" },
  { value: "winter", label: "Winter", detail: "December – March" },
  { value: "unsure", label: "Not sure yet", detail: "" },
];

export default function Step3Season() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function confirm() {
    if (!selected) return;
    setBuilderState({ season: selected });
    router.push("/builder/4");
  }

  return (
    <StepShell step={3} photo="/images/steps/st-louis-elopement-venue-haue-valley.webp">
      <div className="max-w-xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 3
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          What time of year are you thinking?
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          Each season transforms the property in a different way.
        </p>

        <div className="flex flex-col gap-3 mb-10">
          {seasons.map((s) => (
            <button
              key={s.value}
              onClick={() => setSelected(s.value)}
              className={`w-full flex items-center justify-between px-7 py-5 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-hv-tan ${
                selected === s.value
                  ? "border-hv-green bg-hv-green text-white"
                  : "border-hv-linen bg-white text-hv-charcoal hover:border-hv-tan"
              }`}
            >
              <span className="font-serif font-light text-xl">{s.label}</span>
              {s.detail && (
                <span className={`font-sans text-[10px] tracking-[0.2em] uppercase ${selected === s.value ? "text-white/70" : "text-hv-sage"}`}>
                  {s.detail}
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
