"use client";

interface WelcomeSignProps {
  coupleNames: string;
  weddingDate: string;
  bgColor: string;
  textColor: string;
}

export default function WelcomeSign({ coupleNames, weddingDate, bgColor, textColor }: WelcomeSignProps) {
  return (
    <div
      className="relative w-full max-w-[320px] mx-auto aspect-[9/16] flex flex-col items-center justify-center px-10 text-center"
      style={{ backgroundColor: bgColor }}
    >
      <p
        className="font-sans text-[8px] tracking-[0.35em] uppercase mb-5"
        style={{ color: textColor, opacity: 0.7 }}
      >
        Welcome to our wedding
      </p>

      <p
        className="font-script leading-tight mb-5"
        style={{
          color: textColor,
          fontSize: "clamp(2rem, 11vw, 3rem)",
          lineHeight: 1.15,
        }}
      >
        {coupleNames}
      </p>

      {weddingDate && (
        <>
          <div className="w-8 h-px mb-5" style={{ backgroundColor: `${textColor}44` }} />
          <p
            className="font-sans text-[9px] tracking-[0.3em] uppercase"
            style={{ color: textColor, opacity: 0.7 }}
          >
            {weddingDate}
          </p>
        </>
      )}
    </div>
  );
}
