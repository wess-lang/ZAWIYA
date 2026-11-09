"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Sparkles, Heart, UserRound } from "lucide-react";
import type { SafeUser } from "@/lib/auth";

export default function BottomNav({ user }: { user: SafeUser | null }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const tabs = [
    { href: "/", label: "Home", icon: Home },
    { href: "/shop", label: "Shop", icon: ShoppingBag },
  ];
  const endTabs = [
    { href: "/wishlist", label: "Saved", icon: Heart },
    { href: user ? "/profile" : "/login", label: "Account", icon: UserRound },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/85 sm:hidden">
      <div className="relative mx-auto flex max-w-lg items-center justify-between px-2">
        {tabs.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
              isActive(href) ? "text-accent" : "text-muted-foreground"
            }`}
          >
            <Icon size={20} strokeWidth={isActive(href) ? 2.4 : 2} />
            {label}
          </Link>
        ))}

        {/* Raised center action — the AI Room-Fit flagship feature keeps
            visual priority, floating above the bar instead of sitting
            flush in it, but with a quiet shadow rather than a glowing
            colored one. */}
        <Link
          href="/room-fit"
          className="relative -top-4 flex flex-1 flex-col items-center gap-1 text-[11px] font-semibold text-accent"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md">
            <Sparkles size={21} />
          </span>
          <span className="-mt-0.5">Room-Fit</span>
        </Link>

        {endTabs.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
              isActive(href) ? "text-accent" : "text-muted-foreground"
            }`}
          >
            <Icon size={20} strokeWidth={isActive(href) ? 2.4 : 2} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
