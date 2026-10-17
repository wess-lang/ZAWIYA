import { mkdirSync, writeFileSync, existsSync } from "fs";
import path from "path";
import type { Category } from "./types";

/**
 * Generates a small, original, flat-illustration SVG for a product and
 * writes it to /public/products/<id>.svg, returning the public path to
 * reference as the product's image.
 *
 * Why illustrations instead of photos: an automated, reliable, and
 * properly-licensed source of real furniture product photography isn't
 * available here - Unsplash's keyword photo API was discontinued,
 * LoremFlickr is currently returning server errors, and Wikimedia
 * Commons' furniture search results are overwhelmingly antique museum
 * pieces, not modern catalogue shots, with licensing that varies photo
 * to photo. Rather than guess at licensing or show mismatched photos,
 * every product gets an original, category-accurate illustration
 * instead - see the top-level README for how to swap in real
 * photography once a shop has some to upload.
 */

const COLOR_HEX: Record<string, string> = {
  grey: "#9c9a93",
  charcoal: "#3b3b3b",
  beige: "#d8c9ae",
  tan: "#c8a877",
  "light grey": "#c9c7c0",
  oak: "#c9a66b",
  "light oak": "#d9bd8c",
  white: "#f5f3ee",
  natural: "#cdbfa0",
  cream: "#f3ead9",
  terracotta: "#c1683b",
  rust: "#a4512b",
  emerald: "#2f6b53",
  gold: "#c9a227",
  blush: "#e3b8b0",
  "white marble": "#efece6",
  "deep red": "#7a2330",
  "dark wood": "#4a3324",
  maroon: "#6d2430",
  "dark walnut": "#4a3324",
  "raw oak": "#c9a66b",
};

function resolveColor(colorTags: string[], fallback: string): string {
  for (const tag of colorTags) {
    const hex = COLOR_HEX[tag.toLowerCase()];
    if (hex) return hex;
  }
  return fallback;
}

// Each shape is drawn in a 0-200 x 0-160 local coordinate space, filled
// with the resolved product colour, on a soft tinted background card.
function categoryShape(category: Category, fill: string): string {
  const stroke = "#00000022";
  switch (category) {
    case "sofa":
      return `
        <rect x="24" y="78" width="152" height="46" rx="14" fill="${fill}" stroke="${stroke}"/>
        <rect x="24" y="60" width="28" height="64" rx="10" fill="${fill}" stroke="${stroke}"/>
        <rect x="148" y="60" width="28" height="64" rx="10" fill="${fill}" stroke="${stroke}"/>
        <rect x="46" y="66" width="108" height="26" rx="10" fill="#ffffff55"/>
        <rect x="30" y="122" width="10" height="16" rx="3" fill="#00000033"/>
        <rect x="160" y="122" width="10" height="16" rx="3" fill="#00000033"/>`;
    case "bed":
      return `
        <rect x="26" y="56" width="148" height="20" rx="6" fill="${fill}" stroke="${stroke}"/>
        <rect x="26" y="76" width="148" height="42" rx="8" fill="#ffffff44"/>
        <rect x="26" y="40" width="10" height="78" rx="4" fill="${fill}"/>
        <ellipse cx="55" cy="68" rx="18" ry="10" fill="#ffffffaa"/>
        <ellipse cx="95" cy="68" rx="18" ry="10" fill="#ffffffaa"/>
        <rect x="30" y="118" width="8" height="14" fill="#00000033"/>
        <rect x="162" y="118" width="8" height="14" fill="#00000033"/>`;
    case "dining":
      return `
        <ellipse cx="100" cy="64" rx="62" ry="14" fill="${fill}" stroke="${stroke}"/>
        <rect x="46" y="64" width="8" height="48" fill="${fill}"/>
        <rect x="146" y="64" width="8" height="48" fill="${fill}"/>
        <path d="M30 118 l10 -24 M170 118 l-10 -24" stroke="${stroke}" fill="none"/>
        <rect x="20" y="118" width="24" height="4" fill="#00000022"/>
        <rect x="156" y="118" width="24" height="4" fill="#00000022"/>`;
    case "chair":
      return `
        <rect x="64" y="40" width="72" height="14" rx="6" fill="${fill}" stroke="${stroke}"/>
        <rect x="64" y="54" width="14" height="60" fill="${fill}"/>
        <rect x="122" y="54" width="14" height="60" fill="${fill}"/>
        <rect x="64" y="86" width="72" height="18" rx="6" fill="${fill}" stroke="${stroke}"/>
        <path d="M70 114 l-8 24 M130 114 l8 24" stroke="${stroke}" fill="none" stroke-width="3"/>`;
    case "storage":
      return `
        <rect x="34" y="42" width="132" height="86" rx="8" fill="${fill}" stroke="${stroke}"/>
        <line x1="34" y1="72" x2="166" y2="72" stroke="#00000022"/>
        <line x1="34" y1="100" x2="166" y2="100" stroke="#00000022"/>
        <circle cx="100" cy="57" r="3" fill="#00000044"/>
        <circle cx="100" cy="86" r="3" fill="#00000044"/>
        <circle cx="100" cy="114" r="3" fill="#00000044"/>`;
    case "lighting":
      return `
        <path d="M70 48 L130 48 L150 94 L50 94 Z" fill="${fill}" stroke="${stroke}"/>
        <rect x="97" y="94" width="6" height="26" fill="#8a8578"/>
        <ellipse cx="100" cy="126" rx="26" ry="6" fill="#00000022"/>`;
    case "outdoor":
      return `
        <path d="M46 60 L100 32 L154 60 L154 68 L46 68 Z" fill="${fill}" stroke="${stroke}"/>
        <rect x="97" y="60" width="6" height="56" fill="#8a8578"/>
        <rect x="56" y="100" width="88" height="22" rx="8" fill="${fill}" opacity="0.7" stroke="${stroke}"/>`;
    case "decor":
      return `
        <ellipse cx="100" cy="80" rx="46" ry="56" fill="none" stroke="${fill}" stroke-width="10"/>
        <ellipse cx="100" cy="80" rx="34" ry="44" fill="#ffffff55"/>`;
    case "office":
    default:
      return `
        <rect x="30" y="86" width="140" height="12" rx="4" fill="${fill}" stroke="${stroke}"/>
        <rect x="38" y="98" width="8" height="24" fill="#8a8578"/>
        <rect x="154" y="98" width="8" height="24" fill="#8a8578"/>
        <rect x="118" y="50" width="40" height="34" rx="4" fill="${fill}" opacity="0.8"/>
        <rect x="118" y="86" width="40" height="4" fill="#00000022"/>`;
  }
}

export function buildProductArtSvg(
  category: Category,
  colorTags: string[],
  accentHex: string
): string {
  const fill = resolveColor(colorTags, accentHex);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160" width="640" height="480">
  <rect width="200" height="160" fill="#f4f1ea"/>
  <circle cx="100" cy="80" r="78" fill="${accentHex}11"/>
  ${categoryShape(category, fill)}
</svg>`;
}

/**
 * Writes the generated SVG to /public/products/<id>.svg and returns the
 * public path to store as the product's `image` field.
 */
export function writeProductArt(
  id: string,
  category: Category,
  colorTags: string[],
  accentHex: string
): string {
  const dir = path.join(process.cwd(), "public", "products");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const svg = buildProductArtSvg(category, colorTags, accentHex);
  writeFileSync(path.join(dir, `${id}.svg`), svg, "utf-8");
  return `/products/${id}.svg`;
}
