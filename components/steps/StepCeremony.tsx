"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";
import TileGrid from "@/components/TileGrid";
import { CEREMONY_LOCATIONS } from "@/lib/calculator-options";

export default function StepCeremony() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function confirm() {
    if (!selected) return;
    setBuilderState({ ceremony_location: selected });
    router.push("/builder/4");
  }

  return (
    <StepShell step={3}>
      <div className="max-w-3xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 3
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          Choose your ceremony location.
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          You can change your mind later. You&apos;ll see all three on your tour.
        </p>

        <div className="mb-6">
          <TileGrid options={CEREMONY_LOCATIONS} selected={selected} onSelect={setSelected} columns={3} />
        </div>

        <button
          onClick={() => { setBuilderState({ ceremony_location: "unsure" }); router.push("/builder/4"); }}
          className="font-sans text-[10px] tracking-[0.2em] uppercase text-hv-sage hover:text-hv-charcoal transition-colors duration-200 mb-8"
        >
          We haven&apos;t decided yet
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
