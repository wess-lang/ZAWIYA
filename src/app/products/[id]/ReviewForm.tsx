"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function ReviewForm({
  productId,
  signedIn,
}: {
  productId: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!signedIn) {
    return (
      <p className="text-sm text-muted-foreground">
        <a href="/login" className="text-brand-700 hover:underline">
          Sign in
        </a>{" "}
        to leave a review.
      </p>
    );
  }
  if (done) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-brand-700">
        <CheckCircle2 size={15} /> Thanks — your review was saved.
      </p>
    );
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
    <Card as="form" onSubmit={submit} padding="sm">
      <div className="mb-3 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} star`}
            className="p-0.5 transition-transform active:scale-90"
          >
            <Star
              size={20}
              className={
                n <= (hover || rating) ? "fill-warning text-warning" : "fill-transparent text-border-strong"
              }
            />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience with this product (optional)"
        rows={3}
      />
      <Button type="submit" variant="primary" size="sm" disabled={loading} className="mt-3">
        {loading ? "Saving..." : "Submit review"}
      </Button>
    </Card>
  );
}
