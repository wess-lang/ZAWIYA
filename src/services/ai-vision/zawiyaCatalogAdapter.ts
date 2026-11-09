/**
 * A real `searchPartnerCatalog` implementation against ZAWIYA's actual
 * product database (src/lib/db.ts) — this is the concrete thing the
 * "assume searchPartnerCatalog already exists" comment in
 * RoomVisionService.ts was standing in for.
 *
 * This is intentionally simple keyword/tag matching, not a vector/
 * embedding search — ZAWIYA's own catalogue is a JSON-file store with no
 * embedding index behind it (see src/lib/db.ts), so this mirrors the
 * same deterministic-matching approach src/lib/recommend.ts already
 * uses elsewhere in the app, rather than inventing infrastructure that
 * doesn't exist here. Swap this file alone if you later add real vector
 * search — RoomVisionService.ts doesn't need to change either way.
 */

import { readDb } from "@/lib/db";
import { CATEGORY_LABELS, type Category, type Product } from "@/lib/types";
import type { CatalogMatch, SearchPartnerCatalog } from "./RoomVisionService";

// RoomVisionService is wired (in the route) with categoryVocabulary set
// to these exact keys, so the model's `category` is normally already an
// exact match — see RoomVisionService's buildDetectedSpaceSchema comment.
// This set backs that fast, unambiguous path.
const VALID_CATEGORIES = new Set<string>(Object.keys(CATEGORY_LABELS));

// Fallback free-text -> Category mapping, used only when the incoming
// category *isn't* already an exact match (the vocabulary constraint
// wasn't passed, or some future caller sends open text instead).
const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  sofa: ["sofa", "couch", "sectional", "loveseat"],
  bed: ["bed", "mattress", "headboard", "bedframe"],
  dining: ["dining", "dinner table", "table"],
  chair: ["chair", "armchair", "accent chair", "stool"],
  storage: ["storage", "cabinet", "shelf", "shelving", "bookcase", "wardrobe", "dresser", "closet"],
  lighting: ["light", "lamp", "lighting", "chandelier", "sconce"],
  outdoor: ["outdoor", "patio", "garden", "balcony"],
  decor: ["decor", "rug", "mirror", "art", "vase", "cushion", "curtain"],
  office: ["office", "desk", "office chair"],
};

function guessCategoryByKeyword(text: string): Category | null {
  const needle = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [Category, string[]][]) {
    if (keywords.some((kw) => needle.includes(kw))) return category;
  }
  return null;
}

function resolveCategory(text: string): Category | null {
  if (VALID_CATEGORIES.has(text)) return text as Category;
  return guessCategoryByKeyword(text);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

function scoreProduct(product: Product, queryTokens: string[], impliedCategory: Category | null): number {
  const haystack = [
    product.name,
    product.description,
    ...product.styleTags,
    ...product.colorTags,
    ...product.roomTags,
  ]
    .join(" ")
    .toLowerCase();

  if (queryTokens.length === 0) return 0;
  let hits = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token)) hits++;
  }
  let score = hits / queryTokens.length;

  // Category agreement is a strong signal — weight it heavily rather
  // than leaving it purely to keyword overlap, since "grey sofa" should
  // beat a grey throw pillow that happens to share the word "grey".
  if (impliedCategory) {
    score = product.category === impliedCategory ? score * 0.5 + 0.5 : score * 0.5;
  }

  return Math.max(0, Math.min(1, score));
}

// Only products with a real photo (src/lib/seed.ts's `realImage` field,
// served from this path — see the README's "Real product photos"
// section) can ever be returned here. AI Room-Fit's compositing step
// needs an actual photo to place into the room; the generated-
// illustration placeholder the rest of the catalogue uses isn't a
// supported input for that, so there's no point recommending a product
// Room-Fit can't ultimately generate a photo of.
const REAL_PHOTO_PREFIX = "/products/real/";

export const searchZawiyaPartnerCatalog: SearchPartnerCatalog = async (query, options) => {
  const db = readDb();
  const activeShopIds = new Set(db.shops.filter((s) => s.status === "active").map((s) => s.id));

  const explicitCategory = options?.category ? resolveCategory(options.category) : null;
  const impliedCategory = explicitCategory ?? resolveCategory(query);
  const queryTokens = tokenize(query);

  const matches: CatalogMatch[] = [];
  for (const product of db.products) {
    if (product.stock <= 0) continue; // never recommend something unbuyable
    if (!activeShopIds.has(product.shopId)) continue; // shop not live yet
    if (!product.image.startsWith(REAL_PHOTO_PREFIX)) continue; // no real photo to place in the room

    const score = scoreProduct(product, queryTokens, impliedCategory);
    if (score <= 0) continue;

    matches.push({ productId: product.id, score, category: product.category });
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, options?.limit ?? 5);
};
