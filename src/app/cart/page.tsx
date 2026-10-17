"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";

// FR-08: Multi-Shop Cart - items are grouped by shop, with a combined
// cart and combined total.
export default function CartPage() {
  const { lines, linesByShop, setQty, remove, total } = useCart();

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-stone-900">Your cart is empty</h1>
        <p className="mt-2 text-sm text-stone-600">
          Browse the marketplace or scan a room to get started.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full bg-sage-600 px-6 py-3 font-medium text-white hover:bg-sage-700"
        >
          Go to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Your cart</h1>

      <div className="flex flex-col gap-6">
        {Array.from(linesByShop.entries()).map(([shopId, shopLines]) => {
          const subtotal = shopLines.reduce((s, l) => s + l.price * l.qty, 0);
          return (
            <div key={shopId} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {shopLines[0].shopName}
                </span>
                <span className="text-xs text-stone-500">
                  Subtotal: JD {subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {shopLines.map((line) => (
                  <div key={line.productId} className="flex items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                      <Image src={line.image} alt={line.name} fill className="object-cover" sizes="80px" />
                    </div>
                    <div className="flex-1">
                      <Link
                        href={`/products/${line.productId}`}
                        className="text-sm font-medium text-stone-900 hover:underline"
                      >
                        {line.name}
                      </Link>
                      <div className="mt-1 text-sm font-semibold text-sage-700">
                        JD {line.price.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQty(line.productId, line.qty - 1)}
                        className="h-7 w-7 rounded-full border border-stone-300 text-stone-600 hover:border-stone-500"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm">{line.qty}</span>
                      <button
                        onClick={() => setQty(line.productId, line.qty + 1)}
                        className="h-7 w-7 rounded-full border border-stone-300 text-stone-600 hover:border-stone-500"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => remove(line.productId)}
                      className="text-xs text-stone-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-stone-500">
        {linesByShop.size > 1
          ? `This order will split into ${linesByShop.size} separate shop deliveries at checkout (FR-10).`
          : "This order will go to one shop."}
      </p>

      <div className="mt-6 flex items-center justify-between border-t border-stone-200 pt-6">
        <span className="text-sm text-stone-600">Total</span>
        <span className="text-xl font-semibold text-stone-900">JD {total.toFixed(2)}</span>
      </div>

      <Link
        href="/checkout"
        className="mt-6 block w-full rounded-full bg-[#21201b] px-6 py-3 text-center font-medium text-white hover:bg-black"
      >
        Checkout
      </Link>
    </div>
  );
}
