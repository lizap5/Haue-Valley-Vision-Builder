"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBuilderState, clearBuilderState, BuilderState } from "@/lib/builder-state";
import { ScoredPhoto } from "@/app/api/builder/photos/route";
import BarSign from "@/components/signage/BarSign";
import WelcomeSign from "@/components/signage/WelcomeSign";
import SeatingChart from "@/components/signage/SeatingChart";

interface SignageData {
  ok: boolean;
  drinkImageUrl?: string;
  colors?: { bg: string; text: string; accent: string };
  drink?: string;
}

interface ResultContent {
  heading: string;
  style_name: string;
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

function proxied(url: string) {
  return `/api/proxy/image?url=${encodeURIComponent(url)}`;
}

function PhotoGrid({ photos }: { photos: ScoredPhoto[] }) {
  if (!photos.length) {
    return (
      <div className="grid grid-cols-2 gap-3 mb-12">
        <div className="col-span-2 bg-hv-linen aspect-[16/9]" />
        <div className="bg-hv-linen aspect-square" />
        <div className="bg-hv-linen aspect-square" />
      </div>
    );
  }

  const [first, second, third] = photos;

  return (
    <div className="grid grid-cols-2 gap-3 mb-12">
      {first && (
        <div className="col-span-2 relative aspect-[16/9] overflow-hidden bg-hv-linen">
          <img src={proxied(first.url)} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      {second && (
        <div className="relative aspect-square overflow-hidden bg-hv-linen">
          <img src={proxied(second.url)} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      {third && (
        <div className="relative aspect-square overflow-hidden bg-hv-linen">
          <img src={proxied(third.url)} alt="" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}

function ShareButton({ styleName, coupleNames }: { styleName: string; coupleNames: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareData = {
      title: `${coupleNames} — ${styleName}`,
      text: `We just built our wedding vision at Haue Valley Weddings. Take a look.`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled — no action needed
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard unavailable — silent fail
      }
    }
  }

  return (
    <button
      onClick={handleShare}
      className="font-sans text-[11px] tracking-[0.2em] uppercase text-hv-green border border-hv-green px-12 py-4 hover:bg-hv-green hover:text-white transition-colors duration-200"
    >
      {copied ? "Link copied" : "Share your vision"}
    </button>
  );
}

export default function ResultPage() {
  const [content, setContent] = useState<ResultContent | null>(null);
  const [photos, setPhotos] = useState<ScoredPhoto[]>([]);
  const [signage, setSignage] = useState<SignageData | null>(null);
  const [signageLoading, setSignageLoading] = useState(true);
  const [localState, setLocalState] = useState<BuilderState>({});
  const [error, setError] = useState(false);

  useEffect(() => {
    const s: BuilderState = getBuilderState();
    setLocalState(s);

    // Fire-and-forget: write to Airtable
    fetch("/api/builder/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    }).catch(() => {});

    // Vision + photos unblock the page immediately
    Promise.all([
      fetch("/api/builder/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),

      fetch("/api/builder/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      }).then((r) => r.json()).catch(() => ({ photos: [] })),
    ])
      .then(([visionData, photoData]) => {
        setContent(visionData);
        setPhotos(photoData.photos ?? []);
        // Fire-and-forget: send vision email once content is ready
        fetch("/api/builder/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: s, content: visionData }),
        }).catch(() => {});
      })
      .catch(() => setError(true));

    // Signage loads separately — never blocks the page
    fetch("/api/builder/signage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    })
      .then((r) => r.json())
      .then((data) => setSignage(data))
      .catch(() => setSignage({ ok: false }))
      .finally(() => setSignageLoading(false));
  }, []);

  if (error) return <ErrorScreen />;
  if (!content) return <LoadingScreen />;

  const visionParagraphs = content.vision.split("\n\n");
  const coupleNames = content.heading.replace(", this is your Haue Valley wedding.", "");

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

          {/* Style name */}
          <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-hv-sage text-center mb-4">
            {content.style_name}
          </p>

          {/* Personalized heading */}
          <h1 className="font-serif font-light text-3xl sm:text-4xl md:text-[2.75rem] text-hv-charcoal leading-tight mb-5 text-center">
            {content.heading}
          </h1>

          {/* Confirmation line */}
          {localState.email && (
            <p className="font-sans text-hv-sage text-sm text-center mb-12 max-w-md mx-auto leading-relaxed">
              We have your email at {localState.email} and will be in touch soon. We cannot wait to show you in person.
            </p>
          )}
          {!localState.email && <div className="mb-12" />}

          {/* Photos */}
          <PhotoGrid photos={photos} />

          {/* Vision text */}
          <div className="mb-8">
            {visionParagraphs.map((p, i) => (
              <p key={i} className="font-sans text-hv-charcoal text-base sm:text-lg leading-relaxed mb-5">
                {p}
              </p>
            ))}
          </div>

          {/* Thin rule */}
          <div className="w-16 h-px bg-hv-linen mx-auto mb-8" />

          {/* Tour transition */}
          <p className="font-sans text-hv-charcoal text-base sm:text-lg leading-relaxed mb-8 text-center max-w-lg mx-auto">
            Reading this is one thing. Standing in the space is another. We would love to show you around, answer your questions honestly, and let you decide if Haue Valley feels right for you.
          </p>

          {/* All-inclusive paragraph */}
          <p className="font-sans text-hv-sage text-sm sm:text-base leading-relaxed mb-12 text-center max-w-lg mx-auto">
            {content.all_inclusive_paragraph}
          </p>

          {/* Signage preview */}
          <div className="mb-16">
            <div className="w-16 h-px bg-hv-linen mx-auto mb-10" />
            <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-hv-sage text-center mb-2">
              A glimpse of your day
            </p>
            <p className="font-serif font-light text-xl text-hv-charcoal text-center mb-10">
              How it might look when you arrive.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">

              {/* Bar sign — loads async */}
              <div>
                {signageLoading ? (
                  <div className="w-full max-w-[320px] mx-auto aspect-[9/16] bg-hv-linen animate-pulse" />
                ) : signage?.ok && signage.drinkImageUrl && signage.colors ? (
                  <BarSign
                    drink={signage.drink ?? localState.signature_drink ?? ""}
                    drinkImageUrl={signage.drinkImageUrl}
                    accentColor={signage.colors.accent}
                    textColor={signage.colors.text}
                  />
                ) : (
                  <div className="w-full max-w-[320px] mx-auto aspect-[9/16] bg-hv-linen flex items-center justify-center">
                    <p className="font-sans text-[9px] tracking-[0.2em] uppercase text-hv-sage opacity-50 text-center px-4">
                      Bar signage coming soon
                    </p>
                  </div>
                )}
                <p className="font-sans text-[9px] tracking-[0.2em] uppercase text-hv-sage text-center mt-3 opacity-60">
                  Bar signage
                </p>
              </div>

              {/* Welcome sign — renders immediately */}
              <div>
                <WelcomeSign
                  coupleNames={coupleNames}
                  weddingDate={localState.wedding_date ?? ""}
                  bgColor={signage?.colors?.bg ?? "#F2EDE4"}
                  textColor={signage?.colors?.text ?? "#3D3228"}
                />
                <p className="font-sans text-[9px] tracking-[0.2em] uppercase text-hv-sage text-center mt-3 opacity-60">
                  Welcome sign
                </p>
              </div>

              {/* Seating chart — renders immediately */}
              <div>
                <SeatingChart
                  coupleNames={coupleNames}
                />
                <p className="font-sans text-[9px] tracking-[0.2em] uppercase text-hv-sage text-center mt-3 opacity-60">
                  Seating chart
                </p>
              </div>

            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-4">
            {/* TODO: Replace href with Calendly booking link when available */}
            <a
              href="https://hauevalleyweddings.com/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans inline-block bg-hv-green text-white text-[11px] tracking-[0.2em] uppercase px-12 py-4 hover:bg-hv-green-dark transition-colors duration-200"
            >
              Schedule your tour
            </a>
            <ShareButton styleName={content.style_name} coupleNames={coupleNames} />
            <button
              onClick={() => {
                clearBuilderState();
                window.location.href = "/builder";
              }}
              className="font-sans text-[10px] tracking-[0.2em] uppercase text-hv-sage hover:text-hv-charcoal transition-colors duration-200 mt-1"
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
