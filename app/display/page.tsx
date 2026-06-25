"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import WelcomeSign from "@/components/signage/WelcomeSign";
import SeatingChart from "@/components/signage/SeatingChart";

interface DisplayData {
  coupleNames: string;
  weddingDate: string;
  visionCopy: string;
  styleName: string;
  signatureDrink: string;
  colors: { bg: string; text: string; accent: string };
  photos: Array<{ url: string }>;
}

const SLIDE_DURATION = 9000; // ms per slide
const REFRESH_INTERVAL = 60000; // re-fetch data every 60s

function proxied(url: string) {
  return `/api/proxy/image?url=${encodeURIComponent(url)}`;
}

// ---------------------------------------------------------------------------
// Password gate
// ---------------------------------------------------------------------------
function PasswordGate({ onUnlock }: { onUnlock: (p: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setError(false);
    onUnlock(value.trim());
  }

  return (
    <div className="min-h-screen bg-hv-charcoal flex flex-col items-center justify-center px-6">
      <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-white/50 mb-2">
        Haue Valley
      </p>
      <p className="font-sans text-[9px] tracking-[0.25em] uppercase text-white/30 mb-10">
        Display System
      </p>
      <form onSubmit={submit} className="flex flex-col items-center gap-4 w-full max-w-xs">
        <input
          type="password"
          placeholder="Enter display password"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(false); }}
          className="w-full font-sans text-base text-hv-charcoal bg-white border-0 px-5 py-4 focus:outline-none placeholder:text-hv-sage/50"
          autoFocus
        />
        {error && (
          <p className="font-sans text-[11px] tracking-[0.1em] uppercase text-red-400">
            Incorrect password
          </p>
        )}
        <button
          type="submit"
          className="font-sans text-[11px] tracking-[0.2em] uppercase text-white border border-white/30 px-10 py-3 hover:bg-white/10 transition-colors duration-200"
        >
          Enter
        </button>
      </form>
    </div>
  );
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
  const searchParams = useSearchParams();
  const coupleParam  = searchParams.get("couple");
  const dateParam    = searchParams.get("date");

  const [password, setPassword]       = useState<string | null>(null);
  const [unlocked, setUnlocked]       = useState(false);
  const [data, setData]               = useState<DisplayData | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [slideIndex, setSlideIndex]   = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  // Check sessionStorage for saved password on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("hv_display_password");
    if (saved) { setPassword(saved); setUnlocked(true); }
  }, []);

  function handleUnlock(p: string) {
    setPassword(p);
    setUnlocked(true);
    sessionStorage.setItem("hv_display_password", p);
  }

  const fetchData = useCallback(async () => {
    if (!coupleParam && !dateParam) return;
    const params = new URLSearchParams();
    if (coupleParam) params.set("couple", coupleParam);
    if (dateParam)   params.set("date", dateParam);
    if (password)    params.set("password", password);

    const res = await fetch(`/api/display?${params.toString()}`);
    if (res.status === 401) {
      setUnlocked(false);
      sessionStorage.removeItem("hv_display_password");
      return;
    }
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Could not load display data");
      return;
    }
    setData(await res.json());
    setError(null);
  }, [coupleParam, dateParam, password]);

  // Fetch on unlock and refresh every 60s
  useEffect(() => {
    if (!unlocked) return;
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [unlocked, fetchData]);

  // Build slide list dynamically based on available data
  const slides = data
    ? [
        { key: "welcome", component: <SlideWelcome data={data} /> },
        ...(data.visionCopy ? [{ key: "vision", component: <SlideVision data={data} /> }] : []),
        { key: "seating",  component: <SlideSeating data={data} /> },
      ]
    : [];

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

  if (!unlocked) return <PasswordGate onUnlock={handleUnlock} />;

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
