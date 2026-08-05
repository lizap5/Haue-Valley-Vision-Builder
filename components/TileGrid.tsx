"use client";

import { useState } from "react";
import { TileOption } from "@/lib/calculator-options";
import { AVAILABLE_TILES } from "@/lib/tile-manifest.generated";

interface TileGridProps {
  options: TileOption[];
  selected: string[] | string | null;
  onSelect: (value: string) => void;
  columns?: 2 | 3 | 4;
  disabledValues?: string[];
  /**
   * Set false when the artwork already has the option name printed on it, as
   * the calculator's vibe tiles do, to avoid showing the name twice. The
   * caption still appears on any tile whose image is missing, so a
   * photo-less tile is never a blank card.
   */
  showLabels?: boolean;
}

// Image tile picker matching the calculator's look: photo, label under it,
// dark ring + check on the selected tile.
//
// Tile artwork is delivered separately from the code, so any image may be
// absent. A missing file renders as a labelled placeholder rather than a
// broken image, which keeps the step looking deliberate with zero photos
// present and lets it improve as files land.
export default function TileGrid({
  options,
  selected,
  onSelect,
  columns = 4,
  disabledValues = [],
  showLabels = true,
}: TileGridProps) {
  // Seeded from the build-time manifest so a missing tile is a placeholder on
  // first paint. onError still runs as a backstop for a file that exists but
  // cannot be decoded.
  const [failed, setFailed] = useState<Set<string>>(new Set());

  const selectedValues = Array.isArray(selected) ? selected : selected ? [selected] : [];
  const colClass = columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4";

  function markFailed(value: string) {
    setFailed((prev) => (prev.has(value) ? prev : new Set(prev).add(value)));
  }

  return (
    <div className={`grid grid-cols-2 ${colClass} gap-4`}>
      {options.map((opt) => {
        const isSelected = selectedValues.includes(opt.value);
        const isDisabled = disabledValues.includes(opt.value);
        const imageMissing = !AVAILABLE_TILES.has(opt.image) || failed.has(opt.value);
        // The placeholder already carries the label inside the card, so the
        // caption below would duplicate it. Caption only when there is a photo.
        const showCaption = showLabels && !imageMissing;

        return (
          <button
            key={opt.value}
            onClick={() => !isDisabled && onSelect(opt.value)}
            disabled={isDisabled}
            aria-pressed={isSelected}
            className={`group text-center focus:outline-none focus:ring-2 focus:ring-hv-tan ${
              isDisabled ? "opacity-30 cursor-not-allowed" : ""
            }`}
          >
            <div
              className={`relative aspect-square overflow-hidden transition-all duration-200 ${
                imageMissing ? "bg-hv-linen/40 border border-hv-linen" : "bg-hv-linen"
              } ${isSelected ? "ring-[3px] ring-hv-charcoal" : "group-hover:opacity-90"}`}
            >
              {imageMissing ? (
                // Label-only card. Reads as a considered design choice rather
                // than a failure, and carries enough text to choose from.
                <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
                  <span className="font-serif font-light text-base sm:text-lg text-hv-charcoal leading-snug">
                    {opt.label}
                  </span>
                  {opt.descriptor && (
                    <span className="font-sans text-[9px] tracking-[0.1em] text-hv-sage mt-1.5 leading-snug">
                      {opt.descriptor}
                    </span>
                  )}
                  <span className="block w-6 h-px bg-hv-tan mt-3" />
                </div>
              ) : (
                <img
                  src={opt.image}
                  alt={opt.label}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={() => markFailed(opt.value)}
                />
              )}

              {isSelected && (
                <span className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-hv-charcoal text-white flex items-center justify-center text-xs">
                  ✓
                </span>
              )}
            </div>

            {showCaption && (
              <>
                <span
                  className={`block font-serif font-light text-sm sm:text-base mt-2 leading-snug ${
                    isSelected ? "text-hv-charcoal" : "text-hv-charcoal/80"
                  }`}
                >
                  {opt.label}
                </span>
                {opt.descriptor && !imageMissing && (
                  <span className="block font-sans text-[10px] tracking-[0.1em] text-hv-sage mt-0.5 leading-snug">
                    {opt.descriptor}
                  </span>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
