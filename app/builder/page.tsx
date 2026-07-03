import Link from "next/link";

export const metadata = {
  title: "Vision Builder | Haue Valley Weddings",
  description:
    "See what your wedding at Haue Valley looks like. Before you ever set foot on the property.",
};

export default function BuilderEntry() {
  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* Hero — full-bleed photo with overlay */}
      <div className="relative w-full h-[60vh] sm:h-[70vh] overflow-hidden bg-hv-linen">
        <img
          src="/images/steps/IMG_8941.jpg.webp"
          alt=""
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-hv-charcoal/30" />

        {/* Wordmark over photo */}
        <div className="absolute top-8 left-0 right-0 flex justify-center">
          <div className="text-center">
            <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-white font-medium opacity-90">
              Haue Valley
            </p>
            <p className="font-sans text-[9px] tracking-[0.25em] uppercase text-white mt-0.5 opacity-70">
              Weddings &amp; Events
            </p>
          </div>
        </div>
      </div>

      {/* Content below hero */}
      <div className="flex-1 flex flex-col items-center px-6 py-14 text-center bg-white">
        <div className="max-w-xl w-full">

          <div className="w-16 h-px bg-hv-linen mx-auto mb-10" />

          <h1 className="font-serif font-light text-4xl sm:text-5xl md:text-[3.25rem] text-hv-charcoal leading-tight mb-6">
            Your <em>Haue Valley</em> wedding{" "}
            <span className="block">starts here.</span>
          </h1>

          <p className="font-sans text-hv-sage text-base sm:text-lg leading-relaxed mb-4 max-w-md mx-auto">
            Answer a few questions about your vision and we&apos;ll build a personalized look at what your day at Haue Valley could be.
          </p>

          <p className="font-sans text-hv-sage text-sm leading-relaxed mb-10 max-w-sm mx-auto opacity-75">
            Takes about 3 minutes. No commitment, no pressure.
          </p>

          <Link
            href="/builder/1"
            className="font-sans inline-block bg-hv-green text-white text-[11px] tracking-[0.2em] uppercase px-10 py-4 hover:bg-hv-green-dark transition-colors duration-200"
          >
            Show me my wedding
          </Link>

          <div className="mt-12 w-16 h-px bg-hv-linen mx-auto" />

          <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-hv-sage opacity-40 mt-6">
            Pacific, MO
          </p>

        </div>
      </div>

    </main>
  );
}
