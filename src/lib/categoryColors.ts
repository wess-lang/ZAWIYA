import type { Category } from "./types";

/**
 * Shared across every page that needs a per-category colour (homepage
 * room tiles, the shop/category filter chips, a shop's own category
 * sub-nav) — kept in one place so "sofa is olive, lighting is gold"
 * means the same thing everywhere instead of each page inventing its
 * own mapping. An earthy/jewel-tone set (olive, brass, walnut, slate,
 * plum) rather than saturated primaries, so it reads as a considered
 * furniture showroom's room index.
 */
export const CATEGORY_COLORS: Record<Category, string> = {
  sofa: "#566d36",
  bed: "#4a6b7a",
  dining: "#a9824f",
  chair: "#8a5a3d",
  storage: "#6b5e4a",
  lighting: "#c08a2e",
  outdoor: "#3f6b4a",
  decor: "#70507f",
  office: "#3f5e82",
};
