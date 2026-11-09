"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import Button from "@/components/ui/Button";

interface Props {
  productId: string;
  name: string;
  price: number;
  image: string;
  shopId: string;
  shopName: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function AddToCartButton({
  productId,
  name,
  price,
  image,
  shopId,
  shopName,
  disabled,
  size = "lg",
}: Props) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <Button
      variant="primary"
      size={size}
      disabled={disabled}
      className="w-full"
      onClick={() => {
        add({ productId, name, price, image, shopId, shopName });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
    >
      {disabled ? (
        "Out of stock"
      ) : added ? (
        <>
          <Check size={16} /> Added to cart
        </>
      ) : (
        <>
          <ShoppingBag size={16} /> Add to cart
        </>
      )}
    </Button>
  );
}
