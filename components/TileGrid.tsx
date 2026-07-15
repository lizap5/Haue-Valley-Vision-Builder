"use client";

import { TileOption } from "@/lib/calculator-options";

interface TileGridProps {
  options: TileOption[];
  selected: string[] | string | null;
  onSelect: (value: string) => void;
  columns?: 2 | 3 | 4;
  disabledValues?: string[];
}

// Image tile picker matching the calculator's look: photo, label under it,
// dark ring + check on the selected tile. Falls back to a plain linen block
// if a tile image is missing.
export default function TileGrid({ options, selected, onSelect, columns = 4, disabledValues = [] }: TileGridProps) {
  const selectedValues = Array.isArray(selected) ? selected : selected ? [selected] : [];
  const colClass = columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4";

  return (
    <div className={`grid grid-cols-2 ${colClass} gap-4`}>
      {options.map((opt) => {
        const isSelected = selectedValues.includes(opt.value);
        const isDisabled = disabledValues.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => !isDisabled && onSelect(opt.value)}
            disabled={isDisabled}
            className={`group text-center focus:outline-none focus:ring-2 focus:ring-hv-tan ${isDisabled ? "opacity-30 cursor-not-allowed" : ""}`}
          >
            <div
              className={`relative aspect-square overflow-hidden bg-hv-linen transition-all duration-200 ${
                isSelected ? "ring-[3px] ring-hv-charcoal" : "group-hover:opacity-90"
              }`}
            >
              <img
                src={opt.image}
                alt={opt.label}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              {isSelected && (
                <span className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-hv-charcoal text-white flex items-center justify-center text-xs">
                  ✓
                </span>
              )}
            </div>
            <span className={`block font-serif font-light text-sm sm:text-base mt-2 leading-snug ${isSelected ? "text-hv-charcoal" : "text-hv-charcoal/80"}`}>
              {opt.label}
            </span>
            {opt.descriptor && (
              <span className="block font-sans text-[10px] tracking-[0.1em] text-hv-sage mt-0.5 leading-snug">
                {opt.descriptor}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
