"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBuilderState, clearBuilderState, BuilderState } from "@/lib/builder-state";
import { ScoredPhoto } from "@/app/api/builder/photos/route";
import { LINEN_COLORS, SIGNATURE_DRINKS, labelFor } from "@/lib/calculator-options";
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

interface PhotoData {
  photos: ScoredPhoto[];
  spacePhotos: ScoredPhoto[];
  stylePhotos: ScoredPhoto[];
  barSigns: ScoredPhoto[];
}

// Metal accent treatments for the mood board
const METAL_STYLES: Record<string, { hex: string; label: string; gradient: string }> = {
  gold:   { hex: "#B08D3E", label: "Gold accents",   gradient: "linear-gradient(135deg, #D4B96A 0%, #B08D3E 50%, #8C6D2A 100%)" },
  silver: { hex: "#9CA3AF", label: "Silver accents", gradient: "linear-gradient(135deg, #D5D9DE 0%, #9CA3AF 50%, #6B7280 100%)" },
};

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
        Building your board&hellip;
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
        We weren&apos;t able to build your board. Please try again.
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

// Mood board grid: 3 guaranteed space photos labeled, 3 style photos,
// swatch card and metal card mixed into the collage.
function MoodBoard({
  spacePhotos,
  stylePhotos,
  linenColors,
  accentMetal,
}: {
  spacePhotos: ScoredPhoto[];
  stylePhotos: ScoredPhoto[];
  linenColors: string[];
  accentMetal?: string;
}) {
  const metal = accentMetal ? METAL_STYLES[accentMetal] : null;
  const swatches = linenColors
    .map((v) => LINEN_COLORS.find((c) => c.value === v))
    .filter(Boolean) as { value: string; label: string; hex: string }[];

  const spaceBySlot = (space: string) => spacePhotos.find((p) => p.space === space);
  const ceremony = spaceBySlot("Ceremony");
  const reception = spaceBySlot("Reception");
  const patio = spaceBySlot("Upper Patio");

  const Cell = ({ photo, label, aspect = "aspect-square" }: { photo?: ScoredPhoto; label: string; aspect?: string }) => (
    <div>
      <div className={`relative ${aspect} overflow-hidden bg-hv-linen`}>
        {photo ? (
          <img src={proxied(photo.url)} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="font-sans text-[9px] tracking-[0.2em] uppercase text-hv-sage opacity-50 text-center px-3">
              {label}
              <br />
              coming soon
            </p>
          </div>
        )}
      </div>
      <p className="font-sans text-[9px] tracking-[0.2em] uppercase text-hv-sage mt-2 opacity-70">{label}</p>
    </div>
  );

  return (
    <div className="mb-12">
      {/* Row 1: the three Haue Valley spaces */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <Cell photo={ceremony} label="Ceremony" />
        <Cell photo={reception} label="Reception" />
        <Cell photo={patio} label="Upper Patio" />
      </div>

      {/* Row 2: style photos + swatch/metal cards */}
      <div className="grid grid-cols-3 gap-3">
        {stylePhotos[0] && (
          <div className="relative aspect-square overflow-hidden bg-hv-linen">
            <img src={proxied(stylePhotos[0].url)} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Swatch card */}
        <div className="aspect-square bg-white border border-hv-linen flex flex-col items-center justify-center gap-3 p-4">
          <p className="font-sans text-[8px] tracking-[0.25em] uppercase text-hv-sage">Your linens</p>
          <div className="flex gap-2">
            {swatches.length ? (
              swatches.map((c) => (
                <div key={c.value} className="flex flex-col items-center gap-1.5">
                  <span
                    className="block w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-black/10"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="font-sans text-[7px] sm:text-[8px] tracking-[0.1em] uppercase text-hv-sage text-center leading-tight">
                    {c.label}
                  </span>
                </div>
              ))
            ) : (
              <p className="font-sans text-[9px] text-hv-sage opacity-60">Colors to be chosen</p>
            )}
          </div>
          {metal && (
            <div className="flex items-center gap-2 mt-1">
              <span className="block w-4 h-4 rounded-full border border-black/10" style={{ background: metal.gradient }} />
              <span className="font-sans text-[8px] tracking-[0.15em] uppercase text-hv-sage">{metal.label}</span>
            </div>
          )}
        </div>

        {stylePhotos[1] && (
          <div className="relative aspect-square overflow-hidden bg-hv-linen">
            <img src={proxied(stylePhotos[1].url)} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {stylePhotos[2] && (
          <div className="relative aspect-square overflow-hidden bg-hv-linen col-start-2">
            <img src={proxied(stylePhotos[2].url)} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
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
  const [photoData, setPhotoData] = useState<PhotoData>({ photos: [], spacePhotos: [], stylePhotos: [], barSigns: [] });
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
      }).then((r) => r.json()).catch(() => ({ photos: [], spacePhotos: [], stylePhotos: [], barSigns: [] })),
    ])
      .then(([visionData, photoResp]) => {
        setContent(visionData);
        setPhotoData({
          photos: photoResp.photos ?? [],
          spacePhotos: photoResp.spacePhotos ?? [],
          stylePhotos: photoResp.stylePhotos ?? [],
          barSigns: photoResp.barSigns ?? [],
        });
        // Fire-and-forget: send vision email once content is ready
        fetch("/api/builder/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: s, content: visionData }),
        }).catch(() => {});
        // Fire-and-forget: save vision copy + style name to Airtable
        if (s.email) {
          fetch("/api/builder/update-vision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email:       s.email,
              vision_copy: visionData.vision,
              style_name:  visionData.style_name,
            }),
          }).catch(() => {});
        }
      })
      .catch(() => setError(true));

    // Generated signage loads separately — never blocks the page.
    // Used as a fallback when no pre-made bar sign matches in Airtable.
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
  const metal = localState.accent_metal ? METAL_STYLES[localState.accent_metal] : null;
  const drinkLabels = (localState.signature_drinks ?? []).map((v) => labelFor(SIGNATURE_DRINKS, v));

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

          {/* Vibe name, with metal accent underline when chosen */}
          <p
            className="font-sans text-[11px] tracking-[0.35em] uppercase text-center mb-2"
            style={{ color: metal?.hex ?? "#8A8F7C" }}
          >
            {content.style_name}
          </p>
          {metal && (
            <div className="w-12 h-[2px] mx-auto mb-4" style={{ background: metal.gradient }} />
          )}

          {/* Personalized heading */}
          <h1 className="font-serif font-light text-3xl sm:text-4xl md:text-[2.75rem] text-hv-charcoal leading-tight mb-5 text-center">
            {content.heading}
          </h1>

          {/* Confirmation line */}
          {localState.email && (
            <p className="font-sans text-hv-sage text-sm text-center mb-12 max-w-md mx-auto leading-relaxed">
              We have sent your board to {localState.email}. We would love to show you the real thing.
            </p>
          )}
          {!localState.email && <div className="mb-12" />}

          {/* Mood board */}
          <MoodBoard
            spacePhotos={photoData.spacePhotos}
            stylePhotos={photoData.stylePhotos.length ? photoData.stylePhotos : photoData.photos}
            linenColors={localState.linen_colors ?? []}
            accentMetal={localState.accent_metal}
          />

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

          {/* Bar signs + signage preview */}
          <div className="mb-16">
            <div className="w-16 h-px bg-hv-linen mx-auto mb-10" />
            <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-hv-sage text-center mb-2">
              A glimpse of your day
            </p>
            <p className="font-serif font-light text-xl text-hv-charcoal text-center mb-10">
              How it might look when you arrive.
            </p>

            {/* Pre-made bar signs matched to their two drinks */}
            {photoData.barSigns.length > 0 && (
              <div className="grid grid-cols-2 gap-6 max-w-md mx-auto mb-10">
                {photoData.barSigns.map((sign) => (
                  <div key={sign.id}>
                    <div className="relative aspect-[9/16] overflow-hidden bg-hv-linen">
                      <img src={proxied(sign.url)} alt={sign.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="font-sans text-[9px] tracking-[0.2em] uppercase text-hv-sage text-center mt-3 opacity-60">
                      {sign.name}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">

              {/* Generated bar sign — only when no pre-made signs matched */}
              {photoData.barSigns.length === 0 && (
                <div>
                  {signageLoading ? (
                    <div className="w-full max-w-[320px] mx-auto aspect-[9/16] bg-hv-linen animate-pulse" />
                  ) : signage?.ok && signage.drinkImageUrl && signage.colors ? (
                    <BarSign
                      drink={signage.drink ?? drinkLabels.join(" & ") ?? ""}
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
              )}

              {/* Welcome sign — renders immediately */}
              <div className={photoData.barSigns.length > 0 ? "sm:col-start-1" : ""}>
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
            <a
              href={process.env.NEXT_PUBLIC_CALENDLY_URL ?? "https://hauevalleyweddings.com/contact"}
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
