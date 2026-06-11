import Link from "next/link";

export const metadata = {
  title: "Vision Builder | Haue Valley Weddings",
  description:
    "See what your wedding at Haue Valley looks like. Before you ever set foot on the property.",
};

export default function BuilderEntry() {
  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* Header wordmark */}
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

      {/* Thin rule */}
      <div className="w-16 h-px bg-hv-linen mx-auto mt-4" />

      {/* Main content — vertically centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-xl w-full">

          <h1 className="font-serif font-light text-4xl sm:text-5xl md:text-[3.25rem] text-hv-charcoal leading-tight mb-6">
            Your <em>Haue Valley</em> wedding{" "}
            <span className="block">starts here.</span>
          </h1>

          <p className="font-sans text-hv-sage text-base sm:text-lg leading-relaxed mb-10 max-w-md mx-auto">
            Answer a few questions and we&apos;ll show you exactly what your day
            could look like. Before you ever set foot on the property.
          </p>

          <Link
            href="/builder/1"
            className="font-sans inline-block bg-hv-green text-white text-[11px] tracking-[0.2em] uppercase px-10 py-4 hover:bg-hv-green-dark transition-colors duration-200"
          >
            Show me my wedding
          </Link>

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
