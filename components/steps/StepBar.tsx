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
  const [other, setOther] = useState("");
  const [optOut, setOptOut] = useState(false);

  // No cap. The question is what they drink, not which package they are
  // buying, so there is no reason to stop them naming a third thing.
  function toggle(value: string) {
    if (optOut) return;
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  const answered = optOut || selected.length > 0 || other.trim().length > 0;

  function confirm() {
    if (!answered) return;
    setBuilderState({
      signature_drinks: optOut ? [] : selected,
      other_drinks: optOut ? "" : other.trim(),
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
          What do you like to drink?
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-3 max-w-lg mx-auto">
          Tell us and we will have it waiting for you when you come to tour.
        </p>
        <p className="font-sans text-hv-sage text-xs leading-relaxed mb-8 max-w-lg mx-auto">
          Pick as many as you like, or type something else. If you book the all-inclusive package, two of these become your signature drinks, featured with your names on the bar signage.
        </p>

        <div className={`mb-6 ${optOut ? "opacity-30 pointer-events-none" : ""}`}>
          <TileGrid options={SIGNATURE_DRINKS} selected={selected} onSelect={toggle} columns={4} />
        </div>

        {!optOut && (
          <div className="mb-8 max-w-sm mx-auto">
            <label
              htmlFor="other-drinks"
              className="block font-sans text-[10px] tracking-[0.2em] uppercase text-hv-sage mb-2"
            >
              Something else? Tell us
            </label>
            <input
              id="other-drinks"
              type="text"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="An old fashioned, a good cabernet, a Diet Coke"
              className="w-full font-sans text-sm text-hv-charcoal bg-transparent border-b border-hv-linen focus:border-hv-green outline-none py-2 text-center placeholder:text-hv-sage placeholder:opacity-50"
            />
          </div>
        )}

        <label className="flex items-center justify-center gap-3 cursor-pointer mb-8">
          <input
            type="checkbox"
            checked={optOut}
            onChange={(e) => { setOptOut(e.target.checked); if (e.target.checked) { setSelected([]); setOther(""); } }}
            className="w-4 h-4 accent-hv-green"
          />
          <span className="font-sans text-sm text-hv-charcoal">
            We would rather not host alcohol. Mocktails instead.
          </span>
        </label>

        <button
          onClick={confirm}
          disabled={!answered}
          className="font-sans inline-block bg-hv-green text-white text-[11px] tracking-[0.2em] uppercase px-10 py-4 hover:bg-hv-green-dark transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </StepShell>
  );
}
