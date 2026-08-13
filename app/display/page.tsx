"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import WelcomeSign from "@/components/signage/WelcomeSign";
import SeatingChart from "@/components/signage/SeatingChart";



interface DisplayData {
  coupleNames: string;
  weddingDate: string;
  visionCopy: string;
  styleName: string;
  signatureDrink: string;
  ceremonyLocation: string;
  colors: { bg: string; text: string; accent: string };
  photos: Array<{ url: string }>;
}

// The only ceremony spots that are actually outdoors — "The Fireplace" is
// already the indoor option, so a couple who picked it has no need to see
// a rain plan for itself. Labels here must match CEREMONY_LOCATIONS in
// lib/calculator-options.ts, since that's what Airtable's "Ceremony
// Location" field stores.
const OUTDOOR_CEREMONY_LOCATIONS = ["The Stone Wall", "The Forest View"];

const SLIDE_DURATION = 9000; // ms per slide
const REFRESH_INTERVAL = 60000; // re-fetch data every 60s

function proxied(url: string) {
  return `/api/proxy/image?url=${encodeURIComponent(url)}`;
}

// ---------------------------------------------------------------------------
// Slide components
// ---------------------------------------------------------------------------

function SlideWelcome({ data }: { data: DisplayData }) {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: data.colors.bg }}>
      <div className="w-[420px]">
        <WelcomeSign
          coupleNames={data.coupleNames}
          weddingDate={data.weddingDate}
          bgColor={data.colors.bg}
          textColor={data.colors.text}
        />
      </div>
    </div>
  );
}

function SlideVision({ data }: { data: DisplayData }) {
  const paragraphs = data.visionCopy.split("\n\n").filter(Boolean).slice(0, 2);
  const [photo1, photo2] = data.photos;

  return (
    <div className="w-full h-full flex" style={{ backgroundColor: "#FAF8F5" }}>
      {/* Photos column */}
      <div className="w-1/2 h-full flex flex-col">
        {photo1 && (
          <div className={`overflow-hidden ${photo2 ? "h-1/2" : "h-full"}`}>
            <img src={proxied(photo1.url)} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        {photo2 && (
          <div className="h-1/2 overflow-hidden">
            <img src={proxied(photo2.url)} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        {!photo1 && (
          <div className="w-full h-full bg-hv-linen" />
        )}
      </div>

      {/* Text column */}
      <div className="w-1/2 h-full flex flex-col justify-center px-14 py-12">
        {data.styleName && (
          <p className="font-sans text-[11px] tracking-[0.35em] uppercase text-hv-sage mb-4">
            {data.styleName}
          </p>
        )}
        <h2 className="font-serif font-light text-3xl text-hv-charcoal leading-snug mb-8">
          {data.coupleNames}
        </h2>
        <div className="w-10 h-px bg-hv-linen mb-8" />
        {paragraphs.map((p, i) => (
          <p key={i} className="font-sans text-hv-charcoal text-base leading-relaxed mb-5">
            {p}
          </p>
        ))}
        <div className="mt-6">
          <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-hv-sage opacity-50">
            Haue Valley Weddings · Pacific, MO
          </p>
        </div>
      </div>
    </div>
  );
}

function SlideRainBackup({ data }: { data: DisplayData }) {
  return (
    <div className="w-full h-full flex" style={{ backgroundColor: "#FAF8F5" }}>
      {/* Photo column — the indoor fireplace is a fixed venue space, not a
          couple photo, so it's served straight from /public rather than
          proxied through Airtable attachment URLs like the vision slide. */}
      <div className="w-1/2 h-full overflow-hidden">
        <img
          src="/images/ceremony/the-indoor-fireplace.jpg"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Text column */}
      <div className="w-1/2 h-full flex flex-col justify-center px-14 py-12">
        <p className="font-sans text-[11px] tracking-[0.35em] uppercase text-hv-sage mb-4">
          Rain Plan
        </p>
        <h2 className="font-serif font-light text-3xl text-hv-charcoal leading-snug mb-8">
          Every Wedding Has a Backup
        </h2>
        <div className="w-10 h-px bg-hv-linen mb-8" />
        <p className="font-sans text-hv-charcoal text-base leading-relaxed mb-5">
          If the forecast turns, {data.coupleNames ? `${data.coupleNames}’s` : "your"} ceremony
          simply moves inside to The Fireplace — sheltered, warm, and just as beautiful, any weather.
        </p>
        <p className="font-sans text-hv-charcoal text-base leading-relaxed mb-5">
          Same officiant, same seats, same vows. The only thing that changes is the view.
        </p>
        <div className="mt-6">
          <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-hv-sage opacity-50">
            Haue Valley Weddings · Pacific, MO
          </p>
        </div>
      </div>
    </div>
  );
}

function SlideSeating({ data }: { data: DisplayData }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-white">
      <div className="w-[420px]">
        <SeatingChart coupleNames={data.coupleNames} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main display page
// ---------------------------------------------------------------------------

function DisplayPageInner() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const coupleParam   = searchParams.get("couple");
  const dateParam     = searchParams.get("date");

  const [data, setData]               = useState<DisplayData | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [slideIndex, setSlideIndex]   = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const fetchData = useCallback(async () => {
    if (!coupleParam && !dateParam) return;
    const params = new URLSearchParams();
    if (coupleParam) params.set("couple", coupleParam);
    if (dateParam)   params.set("date", dateParam);

    const res = await fetch(`/api/display?${params.toString()}`);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Could not load display data");
      return;
    }
    setData(await res.json());
    setError(null);
  }, [coupleParam, dateParam]);

  // The activation window that put us here (see /api/display/status) is the
  // same source of truth for "is this couple's tour still current." Once it
  // says no — window elapsed, or the tour got marked Toured — send the
  // screen back to standby so it doesn't sit on one couple's slides forever
  // and is ready to auto-populate the next couple's tour on its own.
  const checkStillActive = useCallback(async () => {
    try {
      const res = await fetch("/api/display/status", { cache: "no-store" });
      if (!res.ok) return;
      const status = await res.json();
      const stillCurrent =
        status.active && (!coupleParam || status.coupleNames === coupleParam);
      if (!stillCurrent) {
        router.push("/display/standby");
      }
    } catch {
      // silent — keep showing the current slide rather than risk a blank screen
    }
  }, [coupleParam, router]);

  // Fetch on load and refresh every 60s; same cadence, re-check activation each time
  useEffect(() => {
    fetchData();
    checkStillActive();
    const interval = setInterval(() => {
      fetchData();
      checkStillActive();
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData, checkStillActive]);

  // Build slide list dynamically based on available data
  const baseSlides = data
    ? [
        { key: "welcome", component: <SlideWelcome data={data} /> },
        ...(data.visionCopy ? [{ key: "vision", component: <SlideVision data={data} /> }] : []),
        { key: "seating",  component: <SlideSeating data={data} /> },
      ]
    : [];

  const showRainBackup = !!data && OUTDOOR_CEREMONY_LOCATIONS.includes(data.ceremonyLocation);

  // Rather than tack the rain-backup slide on once, weave it through the
  // rotation. A tour guide standing in front of the screen with a couple
  // asking "what happens if it rains" shouldn't have to wait out a whole
  // cycle of unrelated slides to reach the one that answers it.
  //
  // One rain slide per two other slides puts it on screen ~33% of the time
  // and back around every ~27s. The rotation is doubled first so an odd
  // number of base slides still divides evenly — with 3 base slides a single
  // pass would land the rain slide in the same spot every cycle and drop it
  // to 25%. Doubling shifts the insertion point on the second pass instead.
  const slides = showRainBackup
    ? [...baseSlides, ...baseSlides].flatMap((slide, i) => {
        // Re-key so the doubled pass doesn't repeat React keys.
        const keyed = { ...slide, key: `${slide.key}-${i}` };
        return i % 2 === 1
          ? [
              keyed,
              { key: `rain-backup-${i}`, component: <SlideRainBackup data={data as DisplayData} /> },
            ]
          : [keyed];
      })
    : baseSlides;

  // Auto-advance slides
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setSlideIndex((i) => (i + 1) % slides.length);
        setTransitioning(false);
      }, 600);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Keep slide index in bounds if slides change
  useEffect(() => {
    if (slides.length > 0 && slideIndex >= slides.length) setSlideIndex(0);
  }, [slides.length, slideIndex]);

  if (error) {
    return (
      <div className="min-h-screen bg-hv-charcoal flex flex-col items-center justify-center text-center px-6">
        <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-white/40 mb-4">Haue Valley Display</p>
        <p className="font-serif font-light text-xl text-white/70 mb-2">Unable to load</p>
        <p className="font-sans text-sm text-white/40">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-hv-charcoal flex items-center justify-center">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block w-2 h-2 rounded-full bg-white/30 animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const currentSlide = slides[slideIndex % slides.length];

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      {/* Slide */}
      <div
        className="w-full h-full transition-opacity duration-600"
        style={{ opacity: transitioning ? 0 : 1, transition: "opacity 0.6s ease-in-out" }}
      >
        {currentSlide?.component}
      </div>

      {/* Slide dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2 pointer-events-none">
          {slides.map((s, i) => (
            <span
              key={s.key}
              className="block w-1.5 h-1.5 rounded-full transition-all duration-300"
              style={{ backgroundColor: i === slideIndex ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.15)" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DisplayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-hv-charcoal flex items-center justify-center">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="block w-2 h-2 rounded-full bg-white/30 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    }>
      <DisplayPageInner />
    </Suspense>
  );
}
