import type { Product } from "./types";

/**
 * Deterministic product-matching stage for AI Room-Fit, implementing the
 * weighted-similarity formula from the documentation's pseudocode
 * (Section 5.2.3): style, colour and category-relevance signals combine
 * into a 0-1 match score, with an optional budget penalty and a hard
 * stock filter (an out-of-stock product can never be recommended).
 *
 * The *attribute extraction* step that feeds this (room type, style
 * tags, dominant colours) is done by a multimodal LLM in
 * src/app/api/rooms/analyze/route.ts rather than a trained CV backbone
 * - see that file's comment and the top-level README for why that is a
 * faithful, honest stand-in for the documented pipeline rather than a
 * trained ResNet/MobileNet model, which is out of scope to train here.
 */

export interface RoomAttributes {
  roomType: string;
  styleTags: string[];
  palette: string[]; // colour words, loosely matched against colorTags
}

export interface ScoredProduct {
  product: Product;
  matchScore: number; // 0-1
  reason: string;
}

const ROOM_CATEGORY_AFFINITY: Record<string, Product["category"][]> = {
  "living room": ["sofa", "chair", "storage", "lighting", "decor"],
  "dining room": ["dining", "lighting", "storage", "decor"],
  bedroom: ["bed", "storage", "lighting", "chair", "decor"],
  office: ["office", "chair", "lighting", "storage"],
  outdoor: ["outdoor", "lighting", "decor"],
  entryway: ["storage", "decor", "lighting"],
};

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function overlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.map(normalize));
  const setB = new Set(b.map(normalize));
  let hits = 0;
  for (const tag of setA) {
    for (const other of setB) {
      if (tag === other || tag.includes(other) || other.includes(tag)) {
        hits++;
        break;
      }
    }
  }
  return Math.min(1, hits / Math.max(setA.size, 1));
}

function categoryScore(roomType: string, category: Product["category"]): number {
  const affinity = ROOM_CATEGORY_AFFINITY[normalize(roomType)];
  if (!affinity) return 0.4; // unknown room type: mild neutral score
  const idx = affinity.indexOf(category);
  if (idx === -1) return 0.1; // category rarely belongs in this room
  // Earlier entries in the affinity list score higher.
  return 1 - idx / affinity.length;
}

function budgetPenalty(price: number, budget?: number): number {
  if (!budget || budget <= 0) return 0;
  if (price <= budget) return 0;
  const overBy = (price - budget) / budget;
  return Math.min(1, overBy); // fully over budget by 100%+ => max penalty
}

export function rankCandidates(
  candidates: Product[],
  room: RoomAttributes,
  budget?: number,
  limit = 6
): ScoredProduct[] {
  const scored: ScoredProduct[] = [];

  for (const product of candidates) {
    if (product.stock <= 0) continue; // hard filter, per FR-13/TC-07

    const style = overlapScore(room.styleTags, product.styleTags);
    const colour = overlapScore(room.palette, product.colorTags);
    const category = categoryScore(room.roomType, product.category);
    const penalty = budgetPenalty(product.price, budget);

    let matchScore = 0.35 * style + 0.25 * colour + 0.25 * category - 0.15 * penalty;
    matchScore = Math.max(0, Math.min(1, matchScore));

    const reasonParts: string[] = [];
    if (style > 0.3) reasonParts.push(`matches the room's ${room.styleTags[0] ?? "style"}`);
    if (colour > 0.3) reasonParts.push(`complements the ${room.palette[0] ?? "detected"} palette`);
    if (category > 0.6) reasonParts.push(`a natural fit for a ${room.roomType}`);
    const reason =
      reasonParts.length > 0
        ? reasonParts.join(", ")
        : `a reasonable general match for a ${room.roomType}`;

    scored.push({ product, matchScore, reason });
  }

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, limit);
}
