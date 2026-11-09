"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function QuickAddButton({
  productId,
  name,
  price,
  image,
  shopId,
  shopName,
  disabled,
}: {
  productId: string;
  name: string;
  price: number;
  image: string;
  shopId: string;
  shopName: string;
  disabled?: boolean;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  if (disabled) return null;

  return (
    <button
      type="button"
      aria-label={`Add ${name} to cart`}
      onClick={(e) => {
        // Card itself is a <Link> to the product page — this control
        // needs to add to cart without navigating.
        e.preventDefault();
        e.stopPropagation();
        add({ productId, name, price, image, shopId, shopName });
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
      }}
      className={`absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-all duration-150 active:scale-90 ${
        added
          ? "border-success bg-success text-success-foreground"
          : "border-border-strong bg-card text-foreground hover:scale-110 hover:border-accent hover:text-accent"
      }`}
    >
      {added ? <Check size={16} className="animate-pop" /> : <Plus size={17} />}
    </button>
  );
}
