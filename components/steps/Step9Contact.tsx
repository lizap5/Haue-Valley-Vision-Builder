"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBuilderState } from "@/lib/builder-state";
import StepShell from "@/components/StepShell";

const guestRanges = [
  { value: 50, label: "Under 50" },
  { value: 100, label: "50 – 100" },
  { value: 150, label: "100 – 150" },
  { value: 200, label: "150 – 200" },
  { value: 201, label: "200+" },
];

export default function Step9Contact() {
  const router = useRouter();
  const [names, setNames] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [budget, setBudget] = useState("");
  const [heardAbout, setHeardAbout] = useState("");
  const [guestCount, setGuestCount] = useState<number | null>(null);
  const [allInclusive, setAllInclusive] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!names.trim()) e.names = "Please enter your names.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Please enter a valid email.";
    return e;
  }

  function confirm() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setBuilderState({
      couple_names: names.trim(),
      email: email.trim(),
      wedding_date: date.trim(),
      additional_notes: notes.trim(),
      budget_range: budget.trim(),
      heard_about: heardAbout.trim(),
      guest_count: guestCount ?? undefined,
      all_inclusive_intent: allInclusive,
    });
    router.push("/builder/result");
  }

  const inputClass = "w-full font-sans text-base text-hv-charcoal border border-hv-linen px-5 py-4 focus:outline-none focus:border-hv-tan placeholder:text-hv-sage/50 bg-white";

  return (
    <StepShell step={9} totalSteps={9} photo="/images/steps/small-wedding-ceremony-st-louis.webp">
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
            <p className="font-sans text-[9px] tracking-[0.25em] uppercase text-hv-sage mb-2">
              Approximate guest count (optional)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {guestRanges.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setGuestCount(guestCount === r.value ? null : r.value)}
                  className={`px-3 py-2 border text-center font-sans text-[11px] tracking-[0.1em] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-hv-tan ${
                    guestCount === r.value
                      ? "border-hv-green bg-hv-green text-white"
                      : "border-hv-linen bg-white text-hv-charcoal hover:border-hv-tan"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <input
              type="text"
              placeholder="Budget range (optional, e.g. $15,000 – $20,000)"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="How did you hear about Haue Valley? (optional)"
              value={heardAbout}
              onChange={(e) => setHeardAbout(e.target.value)}
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
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <button
              type="button"
              role="checkbox"
              aria-checked={allInclusive}
              onClick={() => setAllInclusive(!allInclusive)}
              className={`mt-0.5 w-5 h-5 shrink-0 border flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-hv-tan ${
                allInclusive ? "border-hv-green bg-hv-green" : "border-hv-linen bg-white group-hover:border-hv-tan"
              }`}
            >
              {allInclusive && <span className="block w-2.5 h-2.5 bg-white" />}
            </button>
            <div>
              <p className="font-sans text-sm text-hv-charcoal leading-snug">
                I&apos;m interested in all-inclusive packages
              </p>
              <p className="font-sans text-[10px] tracking-[0.1em] text-hv-sage mt-0.5">
                Catering, florals, coordination, and more — handled for you
              </p>
            </div>
          </label>
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
