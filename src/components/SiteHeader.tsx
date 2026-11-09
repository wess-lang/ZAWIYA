"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Sparkles } from "lucide-react";
import { useCart } from "@/context/CartContext";
import ThemeToggle from "@/components/ThemeToggle";
import type { SafeUser } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/shops", label: "Partner Shops" },
  { href: "/wishlist", label: "Wishlist" },
];

// Mobile navigation lives in the bottom tab bar (BottomNav) — this
// header stays a slim top bar on mobile (logo, theme toggle, cart) and
// carries the full nav only on desktop, where there's no tab bar.
export default function SiteHeader({ user }: { user: SafeUser | null }) {
  const { count } = useCart();
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Zawiya<span className="text-accent">.</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3.5 py-1.5 font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <Link
              href="/orders"
              className={`rounded-full px-3.5 py-1.5 font-medium transition-colors ${
                isActive("/orders")
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Orders
            </Link>
          )}
          {user?.role === "shop_owner" && (
            <Link
              href="/dashboard"
              className={`rounded-full px-3.5 py-1.5 font-medium transition-colors ${
                isActive("/dashboard")
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Dashboard
            </Link>
          )}
          {user?.role === "admin" && (
            <Link
              href="/admin/shops"
              className={`rounded-full px-3.5 py-1.5 font-medium transition-colors ${
                isActive("/admin")
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Admin
            </Link>
          )}
          <Link
            href="/room-fit"
            className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 font-semibold text-accent-foreground shadow-sm transition-all hover:shadow-md hover:brightness-105"
          >
            <Sparkles size={14} />
            AI Room-Fit
          </Link>
          {user ? (
            <Link
              href="/profile"
              className="ml-1 rounded-full px-3.5 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {user.name.split(" ")[0]}
            </Link>
          ) : (
            <Link
              href="/login"
              className="ml-1 rounded-full px-3.5 py-1.5 font-medium text-foreground transition-colors hover:bg-muted"
            >
              Sign in
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/cart"
            className="relative flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-medium text-foreground transition-colors hover:border-border-strong"
          >
            <ShoppingBag size={15} />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
