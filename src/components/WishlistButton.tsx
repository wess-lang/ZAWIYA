"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

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
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
      >
        <Heart size={17} />
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
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all duration-150 active:scale-95 disabled:opacity-60 ${
        saved
          ? "border-accent bg-accent-soft text-accent-soft-foreground"
          : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
      }`}
    >
      <Heart size={17} className={saved ? "fill-current" : ""} />
    </button>
  );
}
