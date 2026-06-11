"use client";

import { useRouter } from "next/navigation";
import { setBuilderState, PhotographyStyle } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";

const options: { value: PhotographyStyle; label: string; descriptor: string; bg: string; textColor: string }[] = [
  {
    value: "airy",
    label: "Light & Airy",
    descriptor: "Bright, soft, and luminous. Whites glow, greenery breathes, and every moment feels like morning.",
    bg: "bg-[#F5F2ED]",
    textColor: "text-hv-charcoal",
  },
  {
    value: "moody",
    label: "Dark & Moody",
    descriptor: "Rich, dramatic, and deeply romantic. Deep shadows, warm candlelight, and an atmosphere you feel.",
    bg: "bg-[#2C2C2C]",
    textColor: "text-white",
  },
];

export default function Step1Photography() {
  const router = useRouter();

  function select(value: PhotographyStyle) {
    setBuilderState({ photography_style: value });
    router.push("/builder/2");
  }

  return (
    <StepShell step={1}>
      <div className="max-w-2xl w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 1
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          What feeling do you want your photos to have?
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-md mx-auto">
          This shapes every image we show you. Choose the one that speaks to you.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => select(opt.value)}
              className={`group relative overflow-hidden ${opt.bg} px-8 py-10 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-hv-tan`}
            >
              <p className={`font-serif font-light text-2xl sm:text-3xl ${opt.textColor} mb-3`}>
                {opt.label}
              </p>
              <p className={`font-sans text-[13px] leading-relaxed ${opt.value === "moody" ? "text-white/70" : "text-hv-sage"}`}>
                {opt.descriptor}
              </p>
              <span className={`block mt-6 font-sans text-[10px] tracking-[0.25em] uppercase ${opt.value === "moody" ? "text-white/50" : "text-hv-tan"}`}>
                This is my style
              </span>
            </button>
          ))}
        </div>
      </div>
    </StepShell>
  );
}
