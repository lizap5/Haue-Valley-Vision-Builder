"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";
import TileGrid from "@/components/TileGrid";
import { SIGNATURE_DRINKS, labelFor } from "@/lib/calculator-options";

export default function StepBar() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [optOut, setOptOut] = useState(false);

  function toggle(value: string) {
    if (optOut) return;
    setSelected((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : prev.length < 2
        ? [...prev, value]
        : prev
    );
  }

  function confirm() {
    if (!optOut && selected.length === 0) return;
    setBuilderState({
      signature_drinks: optOut ? [] : selected,
      alcohol_opt_out: optOut,
      // Legacy field used by signage fallback
      signature_drink: optOut ? "" : selected.map((v) => labelFor(SIGNATURE_DRINKS, v)).join(" & "),
    });
    router.push("/builder/10");
  }

  return (
    <StepShell step={9}>
      <div className="max-w-3xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 9
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          Choose your two signature drinks.
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-3 max-w-lg mx-auto">
          With the all-inclusive package, beer, wine, seltzers and Coke products are included, along with two signature drinks featured with your names on the bar signage.
        </p>
        <p className="font-sans text-hv-sage text-xs leading-relaxed mb-8 max-w-lg mx-auto">
          Want something not listed here? There are upgrade options, and we can talk through them on your tour. If you would rather not host alcohol, we can make fun mocktails your signature drinks instead.
        </p>

        <div className={`mb-4 ${optOut ? "opacity-30 pointer-events-none" : ""}`}>
          <TileGrid options={SIGNATURE_DRINKS} selected={selected} onSelect={toggle} columns={4} />
        </div>

        {!optOut && (
          <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-hv-sage mb-6">
            {selected.length} of 2 selected
          </p>
        )}

        <label className="flex items-center justify-center gap-3 cursor-pointer mb-8">
          <input
            type="checkbox"
            checked={optOut}
            onChange={(e) => { setOptOut(e.target.checked); if (e.target.checked) setSelected([]); }}
            className="w-4 h-4 accent-hv-green"
          />
          <span className="font-sans text-sm text-hv-charcoal">
            We want to opt out of alcohol. Mocktails instead.
          </span>
        </label>

        <button
          onClick={confirm}
          disabled={!optOut && selected.length === 0}
          className="font-sans inline-block bg-hv-green text-white text-[11px] tracking-[0.2em] uppercase px-10 py-4 hover:bg-hv-green-dark transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </StepShell>
  );
}
