"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";

const PALETTES = [
  {
    family: "Soft & Neutral",
    colors: [
      { value: "ivory", label: "Ivory", hex: "#F8F3EC" },
      { value: "blush", label: "Blush", hex: "#F2C5B0" },
      { value: "champagne", label: "Champagne", hex: "#E8D5B0" },
      { value: "sage", label: "Sage", hex: "#B5C4B1" },
    ],
  },
  {
    family: "Romantic",
    colors: [
      { value: "dusty_rose", label: "Dusty Rose", hex: "#D4959A" },
      { value: "mauve", label: "Mauve", hex: "#B57B8A" },
      { value: "burgundy", label: "Burgundy", hex: "#7C2D3E" },
      { value: "wine", label: "Wine", hex: "#5E1A2C" },
    ],
  },
  {
    family: "Natural & Earthy",
    colors: [
      { value: "terracotta", label: "Terracotta", hex: "#C4714A" },
      { value: "rust", label: "Rust", hex: "#A8522A" },
      { value: "mocha", label: "Mocha", hex: "#8B6355" },
      { value: "moss", label: "Moss", hex: "#5A6B45" },
    ],
  },
  {
    family: "Bold & Rich",
    colors: [
      { value: "navy", label: "Navy", hex: "#1E2D5A" },
      { value: "plum", label: "Plum", hex: "#5C2A5E" },
      { value: "forest", label: "Forest", hex: "#2D4A30" },
      { value: "black", label: "Black", hex: "#1A1A1A" },
    ],
  },
];

export default function Step4Ceremony() {
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
    setBuilderState({ colors_chosen: selected });
    router.push("/builder/5");
  }

  return (
    <StepShell step={4} photo="/images/steps/public-5.jpeg">
      <div className="max-w-xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 4
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          Pick your colors.
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          Choose up to three that feel most like you.
        </p>

        <div className="flex flex-col gap-6 mb-4">
          {PALETTES.map((palette) => (
            <div key={palette.family} className="text-left">
              <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-hv-sage mb-3">
                {palette.family}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {palette.colors.map((c) => {
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
                        className={`w-full aspect-square transition-all duration-200 ${
                          isSelected
                            ? "ring-2 ring-offset-2 ring-hv-green scale-105"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className={`font-sans text-[9px] tracking-[0.15em] uppercase leading-none ${isSelected ? "text-hv-green font-medium" : "text-hv-sage"}`}>
                        {c.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
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
