"use client";

import { usePathname } from "next/navigation";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import Button from "@/components/ui/Button";

// A persistent "View cart" bar: appears the moment there's something in
// the cart, floating above the mobile tab bar, so adding an item never
// requires a trip back to the header icon. Hidden on the cart/checkout
// pages themselves, where it would just duplicate the UI.
export default function FloatingCartBar() {
  const { count, total } = useCart();
  const pathname = usePathname();

  if (count === 0) return null;
  if (pathname === "/cart" || pathname === "/checkout") return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 px-3 sm:bottom-4 sm:left-auto sm:right-4 sm:w-80 sm:px-0">
      <Button
        href="/cart"
        variant="primary"
        size="lg"
        className="animate-fade-up w-full !justify-between !rounded-2xl !py-3.5"
      >
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-xs font-bold">
            {count}
          </span>
          <ShoppingBag size={16} />
        </span>
        <span className="flex items-center gap-1">
          View cart · JD {total.toFixed(2)} <ArrowRight size={15} />
        </span>
      </Button>
    </div>
  );
}
