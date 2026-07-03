"use client";

interface SeatingChartProps {
  coupleNames: string;
}

const TABLES = [
  { n: 1, guests: ["Eleanor Whitfield", "James Whitfield", "Clara Hensley", "Robert Hensley", "Nora Callahan", "Patrick Callahan", "Grace Tillman", "Samuel Tillman"] },
  { n: 2, guests: ["Vivienne Brooks", "Oliver Brooks", "Harriet Langston", "Theodore Langston", "Cecelia Monroe", "Arthur Monroe", "Rosalind Fitch", "Edmund Fitch"] },
  { n: 3, guests: ["Josephine Hale", "Cornelius Hale", "Beatrice Aldrich", "Frederick Aldrich", "Miriam Crane", "Leonard Crane", "Augusta Penn", "Walter Penn"] },
  { n: 4, guests: ["Lavinia Cross", "Reginald Cross", "Isadora Payne", "Clifford Payne", "Helena Marsh", "Desmond Marsh", "Cordelia Vance", "Burton Vance"] },
  { n: 5, guests: ["Florence Webb", "Archibald Webb", "Millicent Shaw", "Barnaby Shaw", "Dorothea Kent", "Sylvester Kent", "Eugenia Clay", "Montgomery Clay"] },
  { n: 6, guests: ["Rosemary Doyle", "Thaddeus Doyle", "Constance Bell", "Algernon Bell", "Arabella Fox", "Percival Fox", "Seraphina Hart", "Leopold Hart"] },
];

export default function SeatingChart({ coupleNames }: SeatingChartProps) {
  return (
    <div className="relative w-full max-w-[320px] mx-auto bg-white flex flex-col items-center px-6 py-8 text-center"
      style={{ minHeight: "calc(320px * 16/9)" }}
    >
      <p className="font-sans text-[7px] tracking-[0.35em] uppercase text-hv-charcoal opacity-50 mb-2">
        Welcome to our wedding
      </p>
      <p
        className="font-script text-hv-charcoal mb-6 leading-tight"
        style={{ fontSize: "clamp(1.6rem, 9vw, 2.2rem)" }}
      >
        {coupleNames}
      </p>

      <div className="w-full grid grid-cols-2 gap-x-4 gap-y-5 text-left">
        {TABLES.map((table) => (
          <div key={table.n}>
            <p className="font-sans text-[7px] tracking-[0.2em] uppercase text-hv-charcoal font-medium mb-1">
              Table {table.n}
            </p>
            {table.guests.map((g) => (
              <p key={g} className="font-sans text-[7px] text-hv-charcoal opacity-60 leading-relaxed">
                {g}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
