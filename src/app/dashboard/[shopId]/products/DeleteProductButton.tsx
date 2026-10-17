"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Remove this product from your catalogue?")) return;
    setLoading(true);
    try {
      await fetch(`/api/products/${productId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-stone-400 hover:text-red-600 disabled:opacity-50"
    >
      {loading ? "Removing..." : "Remove"}
    </button>
  );
}
