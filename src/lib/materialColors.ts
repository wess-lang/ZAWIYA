/**
 * Maps the actual colour/material words used in product `colorTags`
 * (src/lib/seed.ts) to real swatch hexes — wood tones, fabric tones,
 * metal finishes — rather than treating "colour" as an abstract UI
 * accent. Used for the small swatch dots on ProductCard and the
 * homepage's "Shop by colour & material" section, so both show the
 * same furniture-accurate palette instead of inventing a second one.
 *
 * Every value here is a genuine color/material word that appears in
 * seed.ts's colorTags (verified against the full seed data before
 * writing this), plus a few common synonyms a shopper might type into
 * search that map to the same swatch.
 */
export const MATERIAL_COLORS: Record<string, string> = {
  // Woods
  oak: "#c7a06e",
  "light oak": "#d9bd92",
  "raw oak": "#b8905f",
  walnut: "#6b4226",
  "dark walnut": "#4a2d1a",
  "dark wood": "#3f2a1c",

  // Neutrals & fabrics
  white: "#f7f4ee",
  cream: "#f0e6d2",
  beige: "#e3d2b4",
  tan: "#c9a876",
  natural: "#ded0b4",
  grey: "#9b968c",
  "light grey": "#c3bfb5",
  charcoal: "#3a3530",
  black: "#1c1a17",
  brown: "#6e4a2e",

  // Warm accents
  terracotta: "#c1623d",
  rust: "#a4532f",
  "deep red": "#7a2a24",
  maroon: "#5e2330",

  // Metals & premium accents
  gold: "#b08d4e",
  amber: "#c9972f",
  "white marble": "#e9e4da",
};

/** Best-effort hex for a colour/material word — case-insensitive,
 *  falls back to a neutral grey for anything not in the table rather
 *  than guessing. */
export function swatchColor(tag: string): string {
  return MATERIAL_COLORS[tag.toLowerCase()] ?? "#9b968c";
}

/** The curated set shown in the homepage's clickable swatch section —
 *  one representative word per distinct hue family, so the row reads
 *  as a considered material index rather than every synonym in the
 *  catalogue. */
export const FEATURED_MATERIALS = [
  "walnut",
  "oak",
  "charcoal",
  "cream",
  "terracotta",
  "grey",
  "gold",
  "natural",
] as const;
