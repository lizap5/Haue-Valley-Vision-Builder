"use client";

interface SeatingChartProps {
  coupleNames: string;
  artUrl?: string;
  bgColor?: string;
  textColor?: string;
}

// Placeholder guests. A couple has not written their seating chart yet, so
// these stand in to show the shape of the sign rather than to mean anything.

const TABLES = [
  { n: 1, guests: ["Eleanor Whitfield", "James Whitfield", "Clara Hensley", "Robert Hensley", "Nora Callahan", "Patrick Callahan", "Grace Tillman", "Samuel Tillman"] },
  { n: 2, guests: ["Vivienne Brooks", "Oliver Brooks", "Harriet Langston", "Theodore Langston", "Cecelia Monroe", "Arthur Monroe", "Rosalind Fitch", "Edmund Fitch"] },
  { n: 3, guests: ["Josephine Hale", "Cornelius Hale", "Beatrice Aldrich", "Frederick Aldrich", "Miriam Crane", "Leonard Crane", "Augusta Penn", "Walter Penn"] },
  { n: 4, guests: ["Lavinia Cross", "Reginald Cross", "Isadora Payne", "Clifford Payne", "Helena Marsh", "Desmond Marsh", "Cordelia Vance", "Burton Vance"] },
  { n: 5, guests: ["Florence Webb", "Archibald Webb", "Millicent Shaw", "Barnaby Shaw", "Dorothea Kent", "Sylvester Kent", "Eugenia Clay", "Montgomery Clay"] },
  { n: 6, guests: ["Rosemary Doyle", "Thaddeus Doyle", "Constance Bell", "Algernon Bell", "Arabella Fox", "Percival Fox", "Seraphina Hart", "Leopold Hart"] },
];

export default function SeatingChart({ coupleNames, artUrl, bgColor, textColor }: SeatingChartProps) {
  const ink = textColor ?? "#2C2C2C";
  return (
    <div className="relative w-full max-w-[320px] mx-auto flex flex-col items-center px-6 py-8 text-center overflow-hidden"
      style={{ minHeight: "calc(320px * 16/9)", backgroundColor: bgColor ?? "#FFFFFF" }}
    >
      {/* Generated border behind the names, which stay real text. */}
      {artUrl && (
        <img
          src={artUrl.startsWith("data:") ? artUrl : `/api/proxy/image?url=${encodeURIComponent(artUrl)}`}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {/* Six tables of names reach into the corners where the border is
          heaviest, and the model places its flowers differently every time,
          so insetting the text cannot be relied on. This panel sits over the
          art and under the names: the border reads as a frame around it and
          every name stays legible whatever the generated art did. */}
      <div
        className="relative w-full flex flex-col items-center px-4 py-5"
        style={{ backgroundColor: `${bgColor ?? "#FFFFFF"}F2` }}
      >
        <p className="font-sans text-[7px] tracking-[0.35em] uppercase opacity-50 mb-2" style={{ color: ink }}>
          Welcome to our wedding
        </p>
        <p
          className="font-script mb-6 leading-tight"
          style={{ fontSize: "clamp(1.6rem, 9vw, 2.2rem)", color: ink }}
        >
          {coupleNames}
        </p>

        <div className="w-full grid grid-cols-2 gap-x-4 gap-y-5 text-left">
          {TABLES.map((table) => (
            <div key={table.n}>
              <p className="font-sans text-[7px] tracking-[0.2em] uppercase font-medium mb-1" style={{ color: ink }}>
                Table {table.n}
              </p>
              {table.guests.map((g) => (
                <p key={g} className="font-sans text-[7px] opacity-60 leading-relaxed" style={{ color: ink }}>
                  {g}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
