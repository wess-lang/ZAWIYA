"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import Button from "@/components/ui/Button";
import { Card, Container } from "@/components/ui/Card";
import { colorForId } from "@/lib/palette";

// FR-08: Multi-Shop Cart - items are grouped by shop, with a combined
// cart and combined total.
export default function CartPage() {
  const { lines, linesByShop, setQty, remove, total } = useCart();

  if (lines.length === 0) {
    return (
      <Container size="sm" className="py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ShoppingBag size={22} />
        </div>
        <h1 className="font-display text-xl font-semibold text-foreground">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Browse the marketplace or scan a room to get started.
        </p>
        <Button href="/shop" size="lg" className="mt-6">
          Go to shop
        </Button>
      </Container>
    );
  }

  return (
    <Container size="md" className="py-10">
      <h1 className="font-display mb-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Your cart
      </h1>

      <div className="flex flex-col gap-5">
        {Array.from(linesByShop.entries()).map(([shopId, shopLines]) => {
          const subtotal = shopLines.reduce((s, l) => s + l.price * l.qty, 0);
          const color = colorForId(shopId);
          return (
            <Card
              key={shopId}
              padding="sm"
              className="border-l-4"
              style={{ borderLeftColor: color }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {shopLines[0].shopName}
                </span>
                <span className="text-xs text-muted-foreground">
                  Subtotal: JD {subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {shopLines.map((line) => (
                  <div key={line.productId} className="flex items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                      <Image src={line.image} alt={line.name} fill className="object-cover" sizes="80px" />
                    </div>
                    <div className="flex-1">
                      <Link
                        href={`/products/${line.productId}`}
                        className="text-sm font-medium text-foreground hover:underline"
                      >
                        {line.name}
                      </Link>
                      <div className="mt-1 text-sm font-semibold text-accent-soft-foreground">
                        JD {line.price.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-border px-1 py-1">
                      <button
                        onClick={() => setQty(line.productId, line.qty - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-5 text-center text-sm">{line.qty}</span>
                      <button
                        onClick={() => setQty(line.productId, line.qty + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Increase quantity"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <button
                      onClick={() => remove(line.productId)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
                      aria-label="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {linesByShop.size > 1
          ? `This order will split into ${linesByShop.size} separate shop deliveries at checkout (FR-10).`
          : "This order will go to one shop."}
      </p>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="font-display text-xl font-semibold text-foreground">
          JD {total.toFixed(2)}
        </span>
      </div>

      <Button href="/checkout" variant="primary" size="lg" className="mt-6 w-full">
        Checkout
      </Button>
    </Container>
  );
}
