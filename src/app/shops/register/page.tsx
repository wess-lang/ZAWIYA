"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STYLE_OPTIONS = [
  "scandinavian", "minimalist", "boutique", "natural", "artisan", "earthy",
  "luxury", "modern", "statement", "gold-accent", "traditional", "carved-wood",
  "heritage", "formal", "upholstered", "family", "classic-modern", "budget", "functional",
];

export default function RegisterShopPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [city, setCity] = useState("");
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function toggleTag(tag: string) {
    setStyleTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tagline, city, styleTags }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login?next=/shops/register");
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Could not submit your shop.");
        return;
      }
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-stone-900">Submitted for review</h1>
        <p className="mt-2 text-sm text-stone-600">
          Your shop is now in <strong>Pending Approval</strong> (Scenario 5 of
          the project documentation). An administrator will review it before
          it appears on the marketplace - sign in as{" "}
          <code className="rounded bg-stone-100 px-1">admin@zawiya.jo</code> /{" "}
          <code className="rounded bg-stone-100 px-1">admin123</code> to see
          the approval queue.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-stone-900">List your shop</h1>
      <p className="mb-6 text-sm text-stone-600">
        Tell us about your shop. An administrator reviews new shops before
        they go live (FR-15).
      </p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          required
          placeholder="Shop name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Tagline (what makes your shop distinct?)"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <div>
          <p className="mb-2 text-xs font-medium text-stone-600">Style tags</p>
          <div className="flex flex-wrap gap-1.5">
            {STYLE_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  styleTags.includes(tag)
                    ? "border-sage-600 bg-sage-600 text-white"
                    : "border-stone-300 text-stone-600 hover:border-stone-500"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-sage-600 px-6 py-3 font-medium text-white hover:bg-sage-700 disabled:opacity-60"
        >
          {loading ? "Submitting..." : "Submit for review"}
        </button>
      </form>
    </div>
  );
}
