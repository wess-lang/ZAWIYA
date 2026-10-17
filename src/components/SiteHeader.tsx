"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import type { SafeUser } from "@/lib/auth";

export default function SiteHeader({ user }: { user: SafeUser | null }) {
  const { count } = useCart();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[#faf7f1]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-[#21201b]">
          ZAWIYA<span className="text-sage-600">.</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-stone-700 sm:flex">
          <Link href="/shop" className="hover:text-stone-950">Shop</Link>
          <Link href="/shops" className="hover:text-stone-950">Partner Shops</Link>
          <Link href="/wishlist" className="hover:text-stone-950">Wishlist</Link>
          {user && <Link href="/orders" className="hover:text-stone-950">Orders</Link>}
          {user?.role === "shop_owner" && (
            <Link href="/dashboard" className="hover:text-stone-950">Dashboard</Link>
          )}
          {user?.role === "admin" && (
            <Link href="/admin/shops" className="hover:text-stone-950">Admin</Link>
          )}
          <Link
            href="/room-fit"
            className="rounded-full bg-sage-600 px-3 py-1.5 font-medium text-white hover:bg-sage-700"
          >
            AI Room-Fit
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="relative flex items-center gap-1 rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-800 hover:border-stone-500"
          >
            Cart
            {count > 0 && (
              <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-sage-600 px-1.5 text-xs font-semibold text-white">
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <button
              onClick={logout}
              className="hidden text-sm text-stone-600 hover:text-stone-900 sm:inline"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="hidden text-sm font-medium text-stone-800 hover:text-stone-950 sm:inline"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
      <div className="flex justify-center gap-5 overflow-x-auto border-t border-black/5 bg-[#faf7f1] px-2 py-1.5 text-xs text-stone-700 sm:hidden">
        <Link href="/shop">Shop</Link>
        <Link href="/shops">Shops</Link>
        <Link href="/wishlist">Wishlist</Link>
        {user && <Link href="/orders">Orders</Link>}
        <Link href="/room-fit" className="font-medium text-sage-700">AI Room-Fit</Link>
        {user ? (
          <button onClick={logout}>Sign out</button>
        ) : (
          <Link href="/login">Sign in</Link>
        )}
      </div>
    </header>
  );
}
