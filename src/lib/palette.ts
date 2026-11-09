/**
 * A deterministic colour picker for entities that don't carry their own
 * colour server-side (a cart line only stores shopId/shopName, not the
 * shop's real `accent` hex — see CartContext's CartLine). Hashing the
 * id into a fixed, curated palette gives each shop/group a consistent
 * colour across a session without inventing or persisting new data —
 * purely a client-side visual grouping aid, never shown as if it were
 * the shop's actual brand colour (that's `shop.accent`, used directly
 * wherever the real Shop record is already in hand server-side).
 */
const PALETTE = [
  "#566d36", // olive
  "#a9824f", // brass
  "#4a6b7a", // slate blue
  "#8a5a3d", // walnut
  "#70507f", // plum
  "#c08a2e", // gold
  "#3f6b4a", // forest
  "#a1432e", // terracotta
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function colorForId(id: string): string {
  return PALETTE[hashString(id) % PALETTE.length];
}
