"use client";

import { useState } from "react";

export default function WishlistButton({
  productId,
  initial,
  signedIn,
}: {
  productId: string;
  initial: boolean;
  signedIn: boolean;
}) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);

  if (!signedIn) {
    return (
      <a
        href="/login"
        title="Sign in to save to your wishlist"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 text-stone-400 hover:border-stone-500"
      >
        ♡
      </a>
    );
  }

  async function toggle() {
    setBusy(true);
    try {
      if (saved) {
        await fetch(`/api/wishlist?productId=${encodeURIComponent(productId)}`, {
          method: "DELETE",
        });
      } else {
        await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
      }
      setSaved(!saved);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={saved ? "Remove from wishlist" : "Save to wishlist"}
      className={`flex h-9 w-9 items-center justify-center rounded-full border text-base transition ${
        saved
          ? "border-sage-600 bg-sage-50 text-sage-700"
          : "border-stone-300 text-stone-500 hover:border-stone-500"
      }`}
    >
      {saved ? "♥" : "♡"}
    </button>
  );
}
