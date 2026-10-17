import Link from "next/link";
import { readDb } from "@/lib/db";
import { CATEGORY_LABELS, type Category } from "@/lib/types";
import ProductCard from "@/components/ProductCard";

export default function Home() {
  const db = readDb();
  const activeShops = db.shops.filter((s) => s.status === "active");
  const activeShopIds = new Set(activeShops.map((s) => s.id));
  const products = db.products.filter((p) => activeShopIds.has(p.shopId));
  const featured = products.slice(0, 8);
  const shopsById = new Map(activeShops.map((s) => [s.id, s]));
  const categories = Object.keys(CATEGORY_LABELS) as Category[];

  return (
    <div>
      <section className="border-b border-black/10 bg-gradient-to-b from-sage-50 to-[#faf7f1] px-4 py-16">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-sage-700">
            Design your space
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            Find your perfect fit.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-stone-600">
            Discover architectural serenity for your home, powered by spatial
            intelligence. Browse furniture from shops across Jordan in one
            cart, or photograph your room and let ZAWIYA place pieces that
            actually fit it.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/room-fit"
              className="rounded-full bg-sage-600 px-6 py-3 font-medium text-white hover:bg-sage-700"
            >
              Try AI Room-Fit →
            </Link>
            <Link
              href="/shop"
              className="rounded-full border border-stone-300 px-6 py-3 font-medium text-stone-800 hover:border-stone-500"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">Shop by room</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-9">
          {categories.map((c) => (
            <Link
              key={c}
              href={`/shop?category=${c}`}
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-4 text-center text-xs font-medium text-stone-700 hover:border-sage-600 hover:text-sage-700"
            >
              {CATEGORY_LABELS[c]}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Partner shops</h2>
          <Link href="/shops" className="text-sm text-sage-700 hover:underline">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
          {activeShops.map((s) => (
            <Link
              key={s.id}
              href={`/shops/${s.id}`}
              className="rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-400"
            >
              <div className="mb-3 h-8 w-8 rounded-full" style={{ backgroundColor: s.accent }} />
              <div className="text-sm font-semibold text-stone-900">{s.name}</div>
              <div className="mt-1 text-xs text-stone-500">{s.tagline}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Featured pieces</h2>
          <Link href="/shop" className="text-sm text-sage-700 hover:underline">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} shop={shopsById.get(p.shopId)} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-stone-900">Curate your space</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
            Explore the full collection of pieces from every partner shop,
            designed to elevate your environment.
          </p>
          <Link
            href="/shop"
            className="mt-5 inline-block rounded-full bg-[#21201b] px-6 py-3 font-medium text-white hover:bg-black"
          >
            Browse Marketplace
          </Link>
        </div>
      </section>
    </div>
  );
}
