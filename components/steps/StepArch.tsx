"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";
import TileGrid from "@/components/TileGrid";
import { ARCHES } from "@/lib/calculator-options";

export default function StepArch() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function confirm() {
    if (!selected) return;
    setBuilderState({ arch_selection: selected });
    router.push("/builder/6");
  }

  return (
    <StepShell step={5}>
      <div className="max-w-3xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 5
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          Choose your arch or arbor.
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          Also part of the all-inclusive package. Flowers on the wooden options are removable.
        </p>

        <div className="mb-6">
          <TileGrid options={ARCHES} selected={selected} onSelect={setSelected} columns={3} />
        </div>

        <button
          onClick={() => { setBuilderState({ arch_selection: "unsure" }); router.push("/builder/6"); }}
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
