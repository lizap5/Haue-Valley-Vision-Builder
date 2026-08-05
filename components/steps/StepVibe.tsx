"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";
import TileGrid from "@/components/TileGrid";
import { VIBES } from "@/lib/calculator-options";

export default function StepVibe() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function confirm() {
    if (!selected) return;
    setBuilderState({ vibe: selected });
    router.push("/builder/3");
  }

  return (
    <StepShell step={2}>
      <div className="max-w-3xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 2
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          So tell us, what&apos;s your vibe?
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          We&apos;ll get into your specific aesthetic during planning. Choose the one that feels closest for now.
        </p>

        <div className="mb-10">
          {/* The calculator's vibe artwork has the name printed across the
              photo, so the caption is suppressed to avoid showing it twice.
              TileGrid still captions any tile whose image is missing. */}
          <TileGrid
            options={VIBES}
            selected={selected}
            onSelect={setSelected}
            columns={4}
            showLabels={false}
          />
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
