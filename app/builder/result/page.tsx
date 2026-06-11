"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBuilderState, clearBuilderState, BuilderState } from "@/lib/builder-state";

interface ResultContent {
  heading: string;
  vision: string;
  all_inclusive_paragraph: string;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-8">
        <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-hv-green font-medium">
          Haue Valley
        </p>
        <p className="font-sans text-[9px] tracking-[0.25em] uppercase text-hv-sage mt-0.5">
          Weddings &amp; Events
        </p>
      </div>
      <div className="w-16 h-px bg-hv-linen mb-10" />
      <h2 className="font-serif font-light text-2xl sm:text-3xl text-hv-charcoal mb-4">
        Building your vision&hellip;
      </h2>
      <p className="font-sans text-hv-sage text-sm max-w-xs leading-relaxed">
        We&apos;re putting together everything you told us. Just a moment.
      </p>
      <div className="mt-10 flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-1.5 h-1.5 rounded-full bg-hv-tan animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorScreen() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-hv-green font-medium mb-8">
        Haue Valley
      </p>
      <h2 className="font-serif font-light text-2xl text-hv-charcoal mb-4">
        Something went wrong.
      </h2>
      <p className="font-sans text-hv-sage text-sm mb-8">
        We weren&apos;t able to build your vision. Please try again.
      </p>
      <Link
        href="/builder"
        className="font-sans text-[11px] tracking-[0.2em] uppercase text-hv-green border border-hv-green px-8 py-3 hover:bg-hv-green hover:text-white transition-colors duration-200"
      >
        Start over
      </Link>
    </div>
  );
}

export default function ResultPage() {
  const [state, setState] = useState<BuilderState | null>(null);
  const [content, setContent] = useState<ResultContent | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const s = getBuilderState();
    setState(s);

    fetch("/api/builder/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setContent(data))
      .catch(() => setError(true));
  }, []);

  if (error) return <ErrorScreen />;
  if (!content) return <LoadingScreen />;

  const visionParagraphs = content.vision.split("\n\n");

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <header className="w-full flex justify-center pt-10 pb-2">
        <div className="text-center">
          <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-hv-green font-medium">
            Haue Valley
          </p>
          <p className="font-sans text-[9px] tracking-[0.25em] uppercase text-hv-sage mt-0.5">
            Weddings &amp; Events
          </p>
        </div>
      </header>
      <div className="w-16 h-px bg-hv-linen mx-auto mt-4" />

      {/* Result content */}
      <div className="flex-1 flex flex-col items-center px-6 py-16">
        <div className="max-w-2xl w-full">

          {/* Personalized heading */}
          <h1 className="font-serif font-light text-3xl sm:text-4xl md:text-[2.75rem] text-hv-charcoal leading-tight mb-10 text-center">
            {content.heading}
          </h1>

          {/* Photo grid — placeholder until Airtable is connected */}
          <div className="grid grid-cols-2 gap-3 mb-12">
            <div className="col-span-2 bg-hv-linen aspect-[16/9] flex items-center justify-center">
              <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-hv-sage opacity-50">
                Your venue photos will appear here
              </p>
            </div>
            <div className="bg-hv-linen aspect-square flex items-center justify-center">
              <p className="font-sans text-[9px] tracking-[0.15em] uppercase text-hv-sage opacity-40">
                Photo 2
              </p>
            </div>
            <div className="bg-hv-linen aspect-square flex items-center justify-center">
              <p className="font-sans text-[9px] tracking-[0.15em] uppercase text-hv-sage opacity-40">
                Photo 3
              </p>
            </div>
          </div>

          {/* Vision text */}
          <div className="mb-8">
            {visionParagraphs.map((p, i) => (
              <p
                key={i}
                className="font-sans text-hv-charcoal text-base sm:text-lg leading-relaxed mb-5"
              >
                {p}
              </p>
            ))}
          </div>

          {/* Thin rule */}
          <div className="w-16 h-px bg-hv-linen mx-auto mb-8" />

          {/* All-inclusive paragraph */}
          <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-12 text-center max-w-lg mx-auto">
            {content.all_inclusive_paragraph}
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-5">
            <a
              href="https://hauevalleyweddings.com/contact"
              className="font-sans inline-block bg-hv-green text-white text-[11px] tracking-[0.2em] uppercase px-12 py-4 hover:bg-hv-green-dark transition-colors duration-200"
            >
              Schedule your tour
            </a>
            <button
              onClick={() => {
                clearBuilderState();
                window.location.href = "/builder";
              }}
              className="font-sans text-[10px] tracking-[0.2em] uppercase text-hv-sage hover:text-hv-charcoal transition-colors duration-200"
            >
              Start over
            </button>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="w-full flex justify-center pb-10">
        <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-hv-sage opacity-50">
          Pacific, MO
        </p>
      </footer>

    </main>
  );
}
