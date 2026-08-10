// Single source of truth for options shared with the Haue Valley
// inclusive calculator (hauevalleyweddings.com/inclusive-calculator-testing).
// Names and values here must match the calculator exactly.

export interface TileOption {
  value: string;
  label: string;
  descriptor?: string;
  image: string;
}

export const VIBES: TileOption[] = [
  { value: "garden_party",         label: "Garden Party",         image: "/images/vibes/garden-party.jpg" },
  { value: "timeless_estate",      label: "Timeless Estate",      image: "/images/vibes/timeless-estate.jpg" },
  { value: "european_summer",      label: "European Summer",      image: "/images/vibes/european-summer.jpg" },
  { value: "moody_romance",        label: "Moody Romance",        image: "/images/vibes/moody-romance.jpg" },
  { value: "colorful_celebration", label: "Colorful Celebration", image: "/images/vibes/colorful-celebration.jpg" },
  { value: "something_blue",       label: "Something Blue",       image: "/images/vibes/something-blue.jpg" },
  { value: "elevated_western",     label: "Elevated Western",     image: "/images/vibes/elevated-western.jpg" },
  { value: "editorial_romance",    label: "Editorial Romance",    image: "/images/vibes/editorial-romance.jpg" },
];

export const AISLE_FLOWERS: TileOption[] = [
  { value: "feyre",   label: "The Feyre Aisle Flowers",   image: "/images/aisle/feyre.jpg" },
  { value: "cassian", label: "The Cassian Aisle Flowers", image: "/images/aisle/cassian.jpg" },
  { value: "gwen",    label: "The Gwen Aisle Flowers",    image: "/images/aisle/gwen.jpg" },
  { value: "velaris", label: "The Velaris Aisle Flowers", image: "/images/aisle/velaris.jpg" },
];

export const ARCHES: TileOption[] = [
  { value: "feyre_arch",   label: "The Feyre Arch Flowers",   descriptor: "Lush white garden with a pop of blush",  image: "/images/arch/feyre.jpg" },
  { value: "elaine_arch",  label: "The Elaine Arch Flowers",  descriptor: "Clean white, black, and greens",         image: "/images/arch/elaine.jpg" },
  { value: "cassian_arch", label: "The Cassian Arch Flowers", descriptor: "Green with a pop of white",              image: "/images/arch/cassian.jpg" },
  { value: "gwen_arch",    label: "The Gwen Arch Flowers",    descriptor: "Wild, fun, and free",                    image: "/images/arch/gwen.jpg" },
  { value: "wooden_cross", label: "The Wooden Cross",         descriptor: "Flowers optional, they are removable",   image: "/images/arch/wooden-cross.jpg" },
  { value: "wooden_arbor", label: "The Wooden Arbor",         descriptor: "Flowers optional, they are removable",   image: "/images/arch/wooden-arbor.jpg" },
];

export interface LinenColor {
  value: string;
  label: string;
  hex: string;
}

export const LINEN_COLORS: LinenColor[] = [
  { value: "white",        label: "White",        hex: "#F7F7F7" },
  { value: "ivory",        label: "Ivory",        hex: "#F5EFE3" },
  { value: "beige",        label: "Beige",        hex: "#D9BF9F" },
  { value: "maize_yellow", label: "Maize Yellow", hex: "#F5CE6E" },
  { value: "blush",        label: "Blush",        hex: "#F8D3DA" },
  { value: "dusty_rose",   label: "Dusty Rose",   hex: "#DD7E87" },
  { value: "burgundy",     label: "Burgundy",     hex: "#8E0D18" },
  { value: "navy",         label: "Navy",         hex: "#1B2C4F" },
  { value: "eggplant",     label: "Eggplant",     hex: "#6B2A63" },
  { value: "lilac",        label: "Lilac",        hex: "#CBAEEA" },
  { value: "light_blue",   label: "Light Blue",   hex: "#A8C4E0" },
  { value: "slate_blue",   label: "Slate Blue",   hex: "#7A8FA8" },
  { value: "light_olive",  label: "Light Olive",  hex: "#AEB98D" },
  { value: "forest_green", label: "Forest Green", hex: "#01633F" },
  { value: "brown",        label: "Brown",        hex: "#5C3317" },
  { value: "light_grey",   label: "Light Grey",   hex: "#E3E3E6" },
  { value: "black",        label: "Black",        hex: "#151515" },
];

export const ACCENT_METALS: TileOption[] = [
  { value: "gold",   label: "Gold",   descriptor: "For flatware, centerpiece accents, and more", image: "/images/metal/gold.jpg" },
  { value: "silver", label: "Silver", descriptor: "For flatware, centerpiece accents, and more", image: "/images/metal/silver.jpg" },
];

export const SIGNATURE_DRINKS: TileOption[] = [
  { value: "amaretto_sour",   label: "Amaretto Sour",   image: "/images/drinks/amaretto-sour.jpg" },
  { value: "gin_and_tonic",   label: "Gin and Tonic",   image: "/images/drinks/gin-and-tonic.jpg" },
  { value: "margarita",       label: "Margarita",       image: "/images/drinks/margarita.jpg" },
  { value: "ranch_water",     label: "Ranch Water",     image: "/images/drinks/ranch-water.jpg" },
  { value: "rum_and_coke",    label: "Rum and Coke",    image: "/images/drinks/rum-and-coke.jpg" },
  { value: "vodka_soda",      label: "Vodka Soda",      image: "/images/drinks/vodka-soda.jpg" },
  { value: "whiskey_coke",    label: "Whiskey Coke",    image: "/images/drinks/whiskey-coke.jpg" },
  { value: "whiskey_highball", label: "Whiskey Highball", image: "/images/drinks/whiskey-highball.jpg" },
];

export const CEREMONY_LOCATIONS: TileOption[] = [
  { value: "stone_wall",  label: "The Stone Wall",  descriptor: "Outdoor ceremony, open sky above",           image: "/images/ceremony/stone-wall.jpg" },
  { value: "fireplace",   label: "The Fireplace",   descriptor: "Indoors, sheltered and warm, any weather",   image: "/images/ceremony/fireplace.jpg" },
  { value: "forest_view", label: "The Forest View", descriptor: "Canopy of trees and dappled light",          image: "/images/ceremony/forest-view.jpg" },
];

// Lookup helpers
const byValue = <T extends { value: string }>(list: T[]) =>
  Object.fromEntries(list.map((o) => [o.value, o])) as Record<string, T>;

export const VIBE_BY_VALUE          = byValue(VIBES);
export const AISLE_BY_VALUE         = byValue(AISLE_FLOWERS);
export const ARCH_BY_VALUE          = byValue(ARCHES);
export const LINEN_BY_VALUE         = byValue(LINEN_COLORS);
export const METAL_BY_VALUE         = byValue(ACCENT_METALS);
export const DRINK_BY_VALUE         = byValue(SIGNATURE_DRINKS);
export const CEREMONY_BY_VALUE      = byValue(CEREMONY_LOCATIONS);

export function labelFor(list: { value: string; label: string }[], value?: string): string {
  if (!value) return "";
  return list.find((o) => o.value === value)?.label ?? value;
}
