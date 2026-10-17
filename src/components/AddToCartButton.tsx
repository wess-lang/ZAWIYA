"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

interface Props {
  productId: string;
  name: string;
  price: number;
  image: string;
  shopId: string;
  shopName: string;
  disabled?: boolean;
}

export default function AddToCartButton({
  productId,
  name,
  price,
  image,
  shopId,
  shopName,
  disabled,
}: Props) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      disabled={disabled}
      onClick={() => {
        add({ productId, name, price, image, shopId, shopName });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className="w-full rounded-full bg-[#21201b] px-6 py-3 font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-300"
    >
      {disabled ? "Out of stock" : added ? "Added to cart" : "Add to cart"}
    </button>
  );
}
