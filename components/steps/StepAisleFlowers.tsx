"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";
import TileGrid from "@/components/TileGrid";
import { AISLE_FLOWERS } from "@/lib/calculator-options";

export default function StepAisleFlowers() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function confirm() {
    if (!selected) return;
    setBuilderState({ aisle_flowers: selected });
    router.push("/builder/5");
  }

  return (
    <StepShell step={4}>
      <div className="max-w-3xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 4
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          Now choose your aisle flowers.
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          Yes, these are included. And you can change your mind later.
        </p>

        <div className="mb-6">
          <TileGrid options={AISLE_FLOWERS} selected={selected} onSelect={setSelected} columns={4} />
        </div>

        <button
          onClick={() => { setBuilderState({ aisle_flowers: "unsure" }); router.push("/builder/5"); }}
          className="font-sans text-[10px] tracking-[0.2em] uppercase text-hv-sage hover:text-hv-charcoal transition-colors duration-200 mb-8"
        >
          Skip, we&apos;re not sure yet
        </button>

        <div>
          <button
            onClick={confirm}
            disabled={!selected}
            className="font-sans inline-block bg-hv-green text-white text-[11px] tracking-[0.2em] uppercase px-10 py-4 hover:bg-hv-green-dark transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </StepShell>
  );
}
