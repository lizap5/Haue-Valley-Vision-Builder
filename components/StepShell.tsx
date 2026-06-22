"use client";

import { useEffect } from "react";
import Link from "next/link";

interface StepShellProps {
  step: number;
  totalSteps?: number;
  photo?: string;
  children: React.ReactNode;
}

export default function StepShell({ step, totalSteps = 9, photo, children }: StepShellProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="w-full flex justify-between items-center px-5 sm:px-8 pt-8 pb-2">
        <Link href="/builder" className="text-center">
          <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-hv-green font-medium">
            Haue Valley
          </p>
          <p className="font-sans text-[9px] tracking-[0.25em] uppercase text-hv-sage mt-0.5">
            Weddings &amp; Events
          </p>
        </Link>
        <p className="font-sans text-[9px] tracking-[0.2em] uppercase text-hv-sage opacity-50">
          {step} of {totalSteps}
        </p>
      </header>

      {/* Progress bar */}
      <div className="w-full h-px bg-hv-linen mt-2">
        <div
          className="h-px bg-hv-tan transition-all duration-500"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step photo */}
      {photo && (
        <div className="w-full aspect-[4/3] sm:aspect-[16/7] overflow-hidden bg-hv-linen">
          <img
            src={photo}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {children}
      </div>

      {/* Footer */}
      <footer className="w-full flex justify-center pb-8">
        <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-hv-sage opacity-40">
          Pacific, MO
        </p>
      </footer>
    </main>
  );
}
