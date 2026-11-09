"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Clock3 } from "lucide-react";
import { Container } from "@/components/ui/Card";
import { Input, FormError } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

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
      <Container size="sm" className="py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning-soft text-warning">
          <Clock3 size={22} />
        </div>
        <h1 className="font-display text-xl font-semibold text-foreground">Submitted for review</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your shop is now in <strong className="text-foreground">Pending Approval</strong> (Scenario 5 of
          the project documentation). An administrator will review it before
          it appears on the marketplace — sign in as{" "}
          <code className="rounded bg-muted px-1">admin@zawiya.jo</code> /{" "}
          <code className="rounded bg-muted px-1">admin123</code> to see
          the approval queue.
        </p>
      </Container>
    );
  }

  return (
    <Container size="sm" className="py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-soft-foreground">
          <Store size={18} />
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">List your shop</h1>
          <p className="text-sm text-muted-foreground">
            An administrator reviews new shops before they go live (FR-15).
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input
          required
          placeholder="Shop name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="Tagline (what makes your shop distinct?)"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
        />
        <Input
          required
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Style tags</p>
          <div className="flex flex-wrap gap-1.5">
            {STYLE_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  styleTags.includes(tag)
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <FormError>{error}</FormError>
        <Button type="submit" size="lg" disabled={loading} className="mt-2">
          {loading ? "Submitting..." : "Submit for review"}
        </Button>
      </form>
    </Container>
  );
}
