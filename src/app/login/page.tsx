"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LogIn } from "lucide-react";
import { Container, Card } from "@/components/ui/Card";
import { Input, FormError } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not sign in.");
        return;
      }
      router.push(next);
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
            <LogIn size={18} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/register" className="font-medium text-brand-700 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FormError>{error}</FormError>
          <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <Card padding="sm" className="mt-8 border-dashed text-xs text-muted-foreground">
          <p className="mb-1.5 font-medium text-foreground">Demo accounts (seeded)</p>
          <p>Customer: customer@zawiya.jo / customer123</p>
          <p>Shop owner: ashley@zawiya.jo / shopowner123</p>
          <p>Admin: admin@zawiya.jo / admin123</p>
        </Card>
      </div>
    </Container>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}
