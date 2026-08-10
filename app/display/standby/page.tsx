"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL = 60_000; // 60 seconds

interface StatusResponse {
  active: boolean;
  coupleNames?: string;
  tourDate?: string;
  minutesUntilTour?: number;
}

export default function StandbyPage() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/display/status", { cache: "no-store" });
      if (!res.ok) return;
      const data: StatusResponse = await res.json();
      setLastChecked(new Date());
      setStatus(data);

      if (data.active && data.coupleNames) {
        const params = new URLSearchParams({ couple: data.coupleNames });
        router.push(`/display?${params.toString()}`);
      }
    } catch {
      // silent — keep polling
    }
  }, [router]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const timeStr = lastChecked
    ? lastChecked.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: "#2B2926" }}
    >
      {/* Logo / wordmark */}
      <div className="flex flex-col items-center gap-6 mb-16">
        <div className="w-16 h-px bg-white/20" />
        <p
          className="font-sans text-[11px] tracking-[0.45em] uppercase text-white/40"
        >
          Haue Valley Weddings
        </p>
        <h1
          className="font-serif font-light text-5xl text-white/80 tracking-wide"
        >
          Pacific, Missouri
        </h1>
        <div className="w-16 h-px bg-white/20" />
      </div>

      {/* Status area */}
      <div className="flex flex-col items-center gap-3 text-center px-8">
        {status?.active && status.minutesUntilTour !== undefined ? (
          <>
            <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-hv-sage">
              Tour beginning soon
            </p>
            <p className="font-serif font-light text-2xl text-white/70">
              {status.coupleNames}
            </p>
            {status.minutesUntilTour > 0 && (
              <p className="font-sans text-sm text-white/40">
                Starting in {status.minutesUntilTour} minute{status.minutesUntilTour !== 1 ? "s" : ""}
              </p>
            )}
          </>
        ) : (
          <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-white/20">
            Ready for your next tour
          </p>
        )}
      </div>

      {/* Last checked */}
      {timeStr && (
        <p
          className="absolute bottom-6 font-sans text-[9px] tracking-[0.25em] uppercase text-white/15"
        >
          Last checked {timeStr}
        </p>
      )}

      {/* Subtle pulse dots */}
      <div className="absolute bottom-14 flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-1 h-1 rounded-full bg-white/15 animate-pulse"
            style={{ animationDelay: `${i * 0.4}s` }}
          />
        ))}
      </div>
    </div>
  );
}
