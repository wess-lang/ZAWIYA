"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

// Cart lines are denormalized (price/name/shop captured at add-to-cart
// time) so the cart and checkout pages don't need a second round trip to
// the catalogue API just to render totals. FR-08: Multi-Shop Cart.
export interface CartLine {
  productId: string;
  name: string;
  price: number;
  image: string;
  shopId: string;
  shopName: string;
  qty: number;
}

interface CartContextValue {
  lines: CartLine[];
  add: (item: Omit<CartLine, "qty">, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  count: number;
  total: number;
  linesByShop: Map<string, CartLine[]>;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "zawiya.cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // ignore corrupt storage
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // storage unavailable - cart just won't persist
    }
  }, [lines, loaded]);

  const add = (item: Omit<CartLine, "qty">, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === item.productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === item.productId ? { ...l, qty: l.qty + qty } : l
        );
      }
      return [...prev, { ...item, qty }];
    });
  };

  const remove = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const setQty = (productId: string, qty: number) => {
    if (qty <= 0) return remove(productId);
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, qty } : l)));
  };

  const clear = () => setLines([]);

  const { count, total, linesByShop } = useMemo(() => {
    let count = 0;
    let total = 0;
    const byShop = new Map<string, CartLine[]>();
    for (const line of lines) {
      count += line.qty;
      total += line.price * line.qty;
      const arr = byShop.get(line.shopId) ?? [];
      arr.push(line);
      byShop.set(line.shopId, arr);
    }
    return { count, total, linesByShop: byShop };
  }, [lines]);

  return (
    <CartContext.Provider
      value={{ lines, add, remove, setQty, clear, count, total, linesByShop }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
