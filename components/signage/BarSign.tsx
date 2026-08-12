"use client";

interface BarSignProps {
  drink: string;
  drinkImageUrl: string;
  accentColor: string;
  textColor: string;
}

function splitDrinkName(drink: string): { main: string; sub: string | null } {
  const words = drink.trim().split(/\s+/);
  if (words.length === 1) return { main: words[0], sub: null };
  const mid = Math.ceil(words.length / 2);
  return {
    main: words.slice(0, mid).join(" "),
    sub: words.slice(mid).join(" "),
  };
}

export default function BarSign({ drink, drinkImageUrl, accentColor, textColor }: BarSignProps) {
  const { main, sub } = splitDrinkName(drink);

  return (
    <div
      className="relative w-full max-w-[320px] mx-auto aspect-[9/16] bg-[#F5F0E8] flex flex-col items-center overflow-hidden"
      style={{ fontFamily: "inherit" }}
    >
      {/* Border */}
      <div
        className="absolute inset-3 pointer-events-none z-10"
        style={{ border: `1px solid ${accentColor}` }}
      />
      <div
        className="absolute inset-[14px] pointer-events-none z-10"
        style={{ border: `0.5px solid ${accentColor}44` }}
      />

      {/* Text section */}
      <div className="relative z-20 flex flex-col items-center pt-10 pb-3 px-6 text-center">
        {/* The name can already begin with "Signature" when the couple named
            no drink and the fallback took over, which printed it twice. */}
        {!/^signature\b/i.test(drink.trim()) && (
          <p
            className="font-sans text-[9px] tracking-[0.35em] uppercase mb-3"
            style={{ color: accentColor }}
          >
            Signature
          </p>
        )}
        <p
          className="font-serif font-semibold leading-none mb-1"
          style={{
            color: textColor,
            fontSize: "clamp(1.6rem, 8vw, 2.2rem)",
            letterSpacing: "0.05em",
          }}
        >
          {main.toUpperCase()}
        </p>
        {sub && (
          <p
            className="font-script leading-none"
            style={{
              color: textColor,
              fontSize: "clamp(1.8rem, 9vw, 2.4rem)",
            }}
          >
            {sub}
          </p>
        )}
        {/* Ornament */}
        <div className="flex items-center gap-2 mt-3">
          <div className="h-px w-6" style={{ backgroundColor: `${accentColor}88` }} />
          <span style={{ color: accentColor, fontSize: "0.5rem" }}>✦</span>
          <div className="h-px w-6" style={{ backgroundColor: `${accentColor}88` }} />
        </div>
      </div>

      {/* Drink image */}
      <div className="relative z-0 w-full flex-1">
        {/* Contained, not cropped. The generated photograph is portrait and
            taller than the space left under the lettering, so object-cover
            was cutting the glass in half. */}
        <img
          src={drinkImageUrl}
          alt={drink}
          className="w-full h-full object-contain object-bottom"
        />
      </div>
    </div>
  );
}
