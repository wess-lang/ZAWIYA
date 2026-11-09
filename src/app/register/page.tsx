"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, User, Store } from "lucide-react";
import { Container } from "@/components/ui/Card";
import { Input, FormError } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

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
    <Container size="sm" className="py-16 sm:py-24">
      <div className="mx-auto max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-soft-foreground">
            <UserPlus size={18} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Create an account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Already have one?{" "}
            <Link href="/login" className="font-medium text-brand-700 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input
            required
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            required
            type="password"
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2.5 text-xs font-medium transition-colors ${
                role === "customer"
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
              }`}
            >
              <User size={14} /> I&apos;m a customer
            </button>
            <button
              type="button"
              onClick={() => setRole("shop_owner")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2.5 text-xs font-medium transition-colors ${
                role === "shop_owner"
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
              }`}
            >
              <Store size={14} /> I own a shop
            </button>
          </div>
          <FormError>{error}</FormError>
          <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </div>
    </Container>
  );
}
