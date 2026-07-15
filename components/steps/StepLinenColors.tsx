"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";
import { LINEN_COLORS } from "@/lib/calculator-options";

export default function StepLinenColors() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : prev.length < 3
        ? [...prev, value]
        : prev
    );
  }

  function confirm() {
    if (selected.length === 0) return;
    setBuilderState({ linen_colors: selected });
    router.push("/builder/7");
  }

  return (
    <StepShell step={6}>
      <div className="max-w-2xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 6
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          Select your favorite linen and napkin colors.
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          Choose up to three. We have more colors available; these are the most popular.
        </p>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-4">
          {LINEN_COLORS.map((c) => {
            const isSelected = selected.includes(c.value);
            const isDisabled = !isSelected && selected.length >= 3;
            return (
              <button
                key={c.value}
                onClick={() => toggle(c.value)}
                disabled={isDisabled}
                title={c.label}
                className={`group flex flex-col items-center gap-1.5 focus:outline-none ${isDisabled ? "opacity-30 cursor-not-allowed" : ""}`}
              >
                <div
                  className={`w-full aspect-square border border-black/5 transition-all duration-200 ${
                    isSelected ? "ring-2 ring-offset-2 ring-hv-green scale-105" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
                <span className={`font-sans text-[9px] tracking-[0.1em] uppercase leading-tight ${isSelected ? "text-hv-green font-medium" : "text-hv-sage"}`}>
                  {c.label}
                </span>
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
