"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Wallet, Smartphone, CreditCard } from "lucide-react";
import { useCart } from "@/context/CartContext";
import type { Address, PaymentMethod } from "@/lib/types";
import Button from "@/components/ui/Button";
import { Card, Container } from "@/components/ui/Card";
import { Input, Textarea, FormError } from "@/components/ui/Input";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: typeof Wallet }[] = [
  { value: "cod", label: "Cash on delivery", icon: Wallet },
  { value: "cliq", label: "CliQ", icon: Smartphone },
  { value: "card", label: "Card", icon: CreditCard },
];

export default function CheckoutForm({ addresses }: { addresses: Address[] }) {
  const { lines, linesByShop, total, clear } = useCart();
  const router = useRouter();

  const [addressId, setAddressId] = useState(addresses[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // New-address mini form, shown when the customer has none saved yet.
  const [newAddr, setNewAddr] = useState({ label: "Home", city: "", details: "" });
  const [savingAddr, setSavingAddr] = useState(false);
  const [localAddresses, setLocalAddresses] = useState(addresses);

  async function saveAddress() {
    setSavingAddr(true);
    setError(null);
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddr),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not save address.");
        return;
      }
      setLocalAddresses((prev) => [...prev, json.address]);
      setAddressId(json.address.id);
    } finally {
      setSavingAddr(false);
    }
  }

  if (placedOrderId) {
    return (
      <Container size="sm" className="py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-soft-foreground">
          <CheckCircle2 size={24} />
        </div>
        <h1 className="font-display text-xl font-semibold text-foreground">Order placed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {linesByShop.size > 1
            ? `Your order was split into ${linesByShop.size} shop-specific sub-orders (FR-10), each tracked separately.`
            : "Your order has been sent to the shop."}
        </p>
        <Button href="/orders" size="lg" className="mt-6">
          Track your order
        </Button>
      </Container>
    );
  }

  if (lines.length === 0) {
    return (
      <Container size="sm" className="py-20 text-center text-muted-foreground">
        Your cart is empty.{" "}
        <Link href="/shop" className="text-brand-700 hover:underline">
          Go shopping
        </Link>
      </Container>
    );
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!addressId) {
      setError("Add a delivery address first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId,
          paymentMethod,
          lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not place the order.");
        return;
      }
      clear();
      setPlacedOrderId(json.order.id);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container size="sm" className="py-10">
      <h1 className="font-display mb-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Checkout
      </h1>

      <Card padding="sm" className="mb-6 flex flex-col gap-3">
        {Array.from(linesByShop.entries()).map(([shopId, shopLines]) => (
          <div key={shopId}>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {shopLines[0].shopName}
            </div>
            {shopLines.map((l) => (
              <div key={l.productId} className="flex justify-between py-1 text-sm text-foreground/85">
                <span>
                  {l.name} x{l.qty}
                </span>
                <span>JD {(l.price * l.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-semibold text-foreground">
          <span>Total</span>
          <span>JD {total.toFixed(2)}</span>
        </div>
      </Card>

      <form onSubmit={placeOrder} className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Delivery address</p>
          {localAddresses.length === 0 ? (
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border-strong p-3.5">
              <Input
                placeholder="Label (e.g. Home)"
                value={newAddr.label}
                onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
              />
              <Input
                placeholder="City"
                value={newAddr.city}
                onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
              />
              <Textarea
                placeholder="Street, building, floor..."
                value={newAddr.details}
                onChange={(e) => setNewAddr({ ...newAddr, details: e.target.value })}
                rows={2}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={saveAddress}
                disabled={savingAddr || !newAddr.city || !newAddr.details}
                className="self-start"
              >
                {savingAddr ? "Saving..." : "Save address"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {localAddresses.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3.5 text-sm transition-colors ${
                    addressId === a.id ? "border-accent bg-accent-soft" : "border-border hover:border-border-strong"
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={addressId === a.id}
                    onChange={() => setAddressId(a.id)}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="font-medium text-foreground">{a.label}</span>
                    <br />
                    <span className="text-muted-foreground">
                      {a.details}, {a.city}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Payment method</p>
          <div className="flex gap-2">
            {PAYMENT_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPaymentMethod(value)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2.5 text-xs font-medium transition-colors ${
                  paymentMethod === value
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        <FormError>{error}</FormError>

        <Button type="submit" variant="primary" size="lg" disabled={loading || !addressId} className="w-full">
          {loading ? "Placing order..." : "Place order →"}
        </Button>
      </form>
    </Container>
  );
}
