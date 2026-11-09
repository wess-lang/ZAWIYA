"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input, Textarea, FormError } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function AddressForm() {
  const router = useRouter();
  const [label, setLabel] = useState("Home");
  const [city, setCity] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, city, details }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not save address.");
        return;
      }
      setCity("");
      setDetails("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card as="form" onSubmit={submit} padding="sm" className="flex flex-col gap-3">
      <p className="text-xs font-medium text-muted-foreground">Add a new address</p>
      <Input
        required
        placeholder="Label (e.g. Home, Work)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <Input
        required
        placeholder="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
      />
      <Textarea
        required
        placeholder="Street, building, floor..."
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={2}
      />
      <FormError>{error}</FormError>
      <Button type="submit" size="sm" disabled={loading} className="self-start">
        {loading ? "Saving..." : "Save address"}
      </Button>
    </Card>
  );
}
