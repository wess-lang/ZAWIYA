"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import type { Address, PaymentMethod } from "@/lib/types";

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
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-stone-900">Order placed</h1>
        <p className="mt-2 text-sm text-stone-600">
          {linesByShop.size > 1
            ? `Your order was split into ${linesByShop.size} shop-specific sub-orders (FR-10), each tracked separately.`
            : "Your order has been sent to the shop."}
        </p>
        <Link
          href="/orders"
          className="mt-6 inline-block rounded-full bg-sage-600 px-6 py-3 font-medium text-white hover:bg-sage-700"
        >
          Track your order
        </Link>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-stone-600">
        Your cart is empty.{" "}
        <Link href="/shop" className="text-sage-700 hover:underline">
          Go shopping
        </Link>
      </div>
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
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Checkout</h1>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4">
        {Array.from(linesByShop.entries()).map(([shopId, shopLines]) => (
          <div key={shopId}>
            <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              {shopLines[0].shopName}
            </div>
            {shopLines.map((l) => (
              <div key={l.productId} className="flex justify-between py-1 text-sm text-stone-700">
                <span>
                  {l.name} x{l.qty}
                </span>
                <span>JD {(l.price * l.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 text-sm font-semibold text-stone-900">
          <span>Total</span>
          <span>JD {total.toFixed(2)}</span>
        </div>
      </div>

      <form onSubmit={placeOrder} className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-xs font-medium text-stone-600">Delivery address</p>
          {localAddresses.length === 0 ? (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-stone-300 p-3">
              <input
                placeholder="Label (e.g. Home)"
                value={newAddr.label}
                onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="City"
                value={newAddr.city}
                onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Street, building, floor..."
                value={newAddr.details}
                onChange={(e) => setNewAddr({ ...newAddr, details: e.target.value })}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                rows={2}
              />
              <button
                type="button"
                onClick={saveAddress}
                disabled={savingAddr || !newAddr.city || !newAddr.details}
                className="self-start rounded-full border border-stone-400 px-4 py-1.5 text-xs font-medium hover:border-stone-600 disabled:opacity-60"
              >
                {savingAddr ? "Saving..." : "Save address"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {localAddresses.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                    addressId === a.id ? "border-sage-600 bg-sage-50" : "border-stone-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={addressId === a.id}
                    onChange={() => setAddressId(a.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium text-stone-900">{a.label}</span>
                    <br />
                    <span className="text-stone-600">
                      {a.details}, {a.city}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-stone-600">Payment method</p>
          <div className="flex gap-2">
            {(["cod", "cliq", "card"] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`rounded-full border px-4 py-2 text-xs font-medium ${
                  paymentMethod === m
                    ? "border-sage-600 bg-sage-600 text-white"
                    : "border-stone-300 text-stone-700 hover:border-stone-500"
                }`}
              >
                {m === "cod" ? "Cash on delivery" : m === "cliq" ? "CliQ" : "Card"}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !addressId}
          className="mt-2 w-full rounded-full bg-[#21201b] px-6 py-3 font-medium text-white hover:bg-black disabled:opacity-60"
        >
          {loading ? "Placing order..." : "Place order →"}
        </button>
      </form>
    </div>
  );
}
