"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewForm({
  productId,
  signedIn,
}: {
  productId: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!signedIn) {
    return (
      <p className="text-sm text-stone-500">
        <a href="/login" className="text-sage-700 hover:underline">
          Sign in
        </a>{" "}
        to leave a review.
      </p>
    );
  }
  if (done) {
    return <p className="text-sm text-sage-700">Thanks - your review was saved.</p>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, comment }),
      });
      setDone(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`text-xl ${n <= rating ? "text-amber-500" : "text-stone-300"}`}
            aria-label={`${n} star`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience with this product (optional)"
        rows={3}
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="mt-3 rounded-full bg-[#21201b] px-5 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
      >
        {loading ? "Saving..." : "Submit review"}
      </button>
    </form>
  );
}
