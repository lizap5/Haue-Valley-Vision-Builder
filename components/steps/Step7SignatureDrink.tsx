"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";

export default function Step7SignatureDrink() {
  const router = useRouter();
  const [drink, setDrink] = useState("");

  function confirm() {
    if (!drink.trim()) return;
    setBuilderState({ signature_drink: drink.trim() });
    router.push("/builder/8");
  }

  return (
    <StepShell step={7} totalSteps={9} photo="/images/steps/IMG_8941.jpg.webp">
      <div className="max-w-xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 7
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          If your wedding had a signature drink, what would it be?
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          Don&apos;t overthink it. This one&apos;s just for fun.
        </p>

        <div className="mb-10 text-left">
          <input
            type="text"
            placeholder="e.g. Lavender gin spritz, classic Old Fashioned, spicy margarita..."
            value={drink}
            onChange={(e) => setDrink(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") confirm(); }}
            className="w-full font-sans text-base text-hv-charcoal border border-hv-linen px-5 py-4 focus:outline-none focus:border-hv-tan placeholder:text-hv-sage/50 bg-white"
          />
        </div>

        <button
          onClick={confirm}
          disabled={!drink.trim()}
          className="font-sans inline-block bg-hv-green text-white text-[11px] tracking-[0.2em] uppercase px-10 py-4 hover:bg-hv-green-dark transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </StepShell>
  );
}
