import { BuilderState } from "@/lib/builder-state";
import { LINEN_COLORS, VIBES, labelFor } from "@/lib/calculator-options";

export interface SignagePalette {
  bg: string;
  text: string;
  accent: string;
}

// Perceived brightness, weighted for how the eye actually responds. Used to
// decide which of a couple's colors can carry lettering and which cannot.
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

const INK = "#3D3228";
const PAPER = "#F7F4EF";

// A sign is a pale ground with dark lettering, whatever the couple chose. Their
// palette decides the tint and the accent, not the contrast: a couple who picks
// Black, Burgundy and Navy still needs a sign that can be read across a room.
export function signagePalette(state: BuilderState): SignagePalette {
  const chosen = (state.linen_colors ?? [])
    .map((v) => LINEN_COLORS.find((c) => c.value === v))
    .filter(Boolean) as { label: string; hex: string }[];

  if (!chosen.length) return { bg: PAPER, text: INK, accent: "#B8A89A" };

  const lightest = [...chosen].sort((a, b) => luminance(b.hex) - luminance(a.hex))[0];
  const darkest = [...chosen].sort((a, b) => luminance(a.hex) - luminance(b.hex))[0];

  // Their lightest linen only becomes the ground if it is genuinely pale.
  // Anything darker would fight the lettering, so the sign falls back to paper.
  const bg = luminance(lightest.hex) > 0.8 ? lightest.hex : PAPER;

  // The accent is their darkest color, which is the one that reads as theirs.
  // Text stays near-black unless their darkest is dark enough to serve as ink.
  const accent = darkest.hex;
  const text = luminance(darkest.hex) < 0.35 ? darkest.hex : INK;

  return { bg, text, accent };
}

// Image models render text as gibberish, and a misspelled name on a couple's
// welcome sign is worse than no sign at all. So the model is asked for the
// border and nothing else, and the lettering is drawn over it in real fonts.
export function signageArtPrompt(state: BuilderState): string {
  const colorNames = (state.linen_colors ?? [])
    .map((v) => labelFor(LINEN_COLORS, v))
    .filter(Boolean);
  const palette = colorNames.length ? colorNames.join(", ") : "ivory and soft green";
  const vibe = labelFor(VIBES, state.vibe) || "elegant and understated";
  const metal = state.accent_metal === "silver" ? "silver" : "gold";

  // One border serves both signs. The seating chart is the tighter constraint,
  // carrying six tables of names, so the centre must stay clear for it; the
  // welcome sign is comfortable within the same shape.
  const density =
    "A narrow floral border around the outer edge only, heavier in the upper left and lower right corners. The entire centre of the image is empty background.";

  return [
    `An elegant decorative floral border for a wedding sign, in the style of ${vibe}.`,
    `Flowers and foliage in these colors: ${palette}. Fine ${metal} linework accents.`,
    density,
    `The background is a plain, very pale, near-white surface.`,
    `Painted in a soft, editorial watercolour style. Vertical composition.`,
    // Repeated because image models reintroduce lettering readily, and any
    // that appears will sit underneath the couple's real names.
    `ABSOLUTELY NO TEXT. No words, no letters, no names, no dates, no numbers,`,
    `no monograms, no calligraphy, no signage, no lettering of any kind anywhere`,
    `in the image. Decorative border and empty background only.`,
  ].join(" ");
}
