"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";

export default function Step9Contact() {
  const router = useRouter();
  const [names, setNames] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!names.trim()) e.names = "Please enter your names.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Please enter a valid email.";
    if (!notes.trim()) e.notes = "Please share anything that helps us prepare for your tour.";
    return e;
  }

  function confirm() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setBuilderState({ couple_names: names.trim(), email: email.trim(), wedding_date: date.trim(), additional_notes: notes.trim() });
    router.push("/builder/result");
  }

  const inputClass = "w-full font-sans text-base text-hv-charcoal border border-hv-linen px-5 py-4 focus:outline-none focus:border-hv-tan placeholder:text-hv-sage/50 bg-white";

  return (
    <StepShell step={9} totalSteps={9}>
      <div className="max-w-md w-full text-center">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-hv-sage mb-4">
          Step 9
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-4xl text-hv-charcoal leading-snug mb-3">
          Almost there.
        </h1>
        <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-10 max-w-sm mx-auto">
          We&apos;ll send your personalized vision to this email. No inbox spam. Just your day.
        </p>

        <div className="flex flex-col gap-4 mb-8 text-left">
          <div>
            <input
              type="text"
              placeholder="Your names (e.g. Emma & James)"
              value={names}
              onChange={(e) => setNames(e.target.value)}
              className={inputClass}
            />
            {errors.names && <p className="font-sans text-[11px] text-red-500 mt-1 pl-1">{errors.names}</p>}
          </div>

          <div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            {errors.email && <p className="font-sans text-[11px] text-red-500 mt-1 pl-1">{errors.email}</p>}
          </div>

          <div>
            <input
              type="text"
              placeholder="Wedding date (optional, even a rough month is great)"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <textarea
              placeholder="Is there anything else we should know? Tell us about yourselves, your vision, or anything that would help us make your tour feel personal."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className={`${inputClass} resize-none`}
            />
            {errors.notes && <p className="font-sans text-[11px] text-red-500 mt-1 pl-1">{errors.notes}</p>}
          </div>
        </div>

        <button
          onClick={confirm}
          className="w-full font-sans bg-hv-green text-white text-[11px] tracking-[0.2em] uppercase px-10 py-4 hover:bg-hv-green-dark transition-colors duration-200"
        >
          Show me my wedding
        </button>

        <p className="font-sans text-[9px] tracking-[0.1em] text-hv-sage opacity-50 mt-5">
          We respect your privacy. Your information is never shared or sold.
        </p>
      </div>
    </StepShell>
  );
}
