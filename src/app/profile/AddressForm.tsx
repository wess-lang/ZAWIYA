"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium text-stone-600">Add a new address</p>
      <input
        required
        placeholder="Label (e.g. Home, Work)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
      />
      <input
        required
        placeholder="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
      />
      <textarea
        required
        placeholder="Street, building, floor..."
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        rows={2}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-full bg-sage-600 px-5 py-2 text-sm font-medium text-white hover:bg-sage-700 disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save address"}
      </button>
    </form>
  );
}
