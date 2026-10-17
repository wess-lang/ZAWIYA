"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "shop_owner">("customer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not create your account.");
        return;
      }
      router.push(role === "shop_owner" ? "/shops/register" : "/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-1 text-2xl font-semibold text-stone-900">Create an account</h1>
      <p className="mb-6 text-sm text-stone-600">
        Already have one?{" "}
        <Link href="/login" className="text-sage-700 hover:underline">
          Sign in
        </Link>
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          required
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          required
          type="password"
          placeholder="Password (min. 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setRole("customer")}
            className={`flex-1 rounded-full border px-3 py-2 ${
              role === "customer" ? "border-sage-600 bg-sage-600 text-white" : "border-stone-300 text-stone-700"
            }`}
          >
            I&apos;m a customer
          </button>
          <button
            type="button"
            onClick={() => setRole("shop_owner")}
            className={`flex-1 rounded-full border px-3 py-2 ${
              role === "shop_owner" ? "border-sage-600 bg-sage-600 text-white" : "border-stone-300 text-stone-700"
            }`}
          >
            I own a shop
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-sage-600 px-6 py-3 font-medium text-white hover:bg-sage-700 disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </div>
  );
}
