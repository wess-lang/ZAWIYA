import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { readDb } from "@/lib/db";
import { CATEGORY_LABELS, type Category } from "@/lib/types";

function qs(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// FR-06/FR-07: multi-shop catalogue with search & filter.
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; shop?: string; q?: string; maxPrice?: string }>;
}) {
  const { category, shop, q, maxPrice } = await searchParams;
  const db = readDb();
  const activeShops = db.shops.filter((s) => s.status === "active");
  const activeShopIds = new Set(activeShops.map((s) => s.id));
  const shopsById = new Map(activeShops.map((s) => [s.id, s]));

  let products = db.products.filter((p) => activeShopIds.has(p.shopId));
  if (category) products = products.filter((p) => p.category === category);
  if (shop) products = products.filter((p) => p.shopId === shop);
  if (maxPrice) products = products.filter((p) => p.price <= Number(maxPrice));
  if (q) {
    const needle = q.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle) ||
        p.styleTags.some((t) => t.toLowerCase().includes(needle)) ||
        p.colorTags.some((t) => t.toLowerCase().includes(needle))
    );
  }

  const categories = Object.keys(CATEGORY_LABELS) as Category[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Shop</h1>

      <form action="/shop" className="mb-6 flex gap-2">
        {category && <input type="hidden" name="category" value={category} />}
        {shop && <input type="hidden" name="shop" value={shop} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search furniture..."
          className="w-full max-w-sm rounded-full border border-stone-300 px-4 py-2 text-sm"
        />
        <button className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:border-stone-500">
          Search
        </button>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href={`/shop${qs({ shop, q })}`}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            !category
              ? "border-sage-600 bg-sage-600 text-white"
              : "border-stone-300 text-stone-700 hover:border-stone-500"
          }`}
        >
          All categories
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={`/shop${qs({ category: c, shop, q })}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              category === c
                ? "border-sage-600 bg-sage-600 text-white"
                : "border-stone-300 text-stone-700 hover:border-stone-500"
            }`}
          >
            {CATEGORY_LABELS[c]}
          </Link>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href={`/shop${qs({ category, q })}`}
          className={`rounded-full border px-3 py-1 text-xs ${
            !shop
              ? "border-stone-800 bg-stone-800 text-white"
              : "border-stone-300 text-stone-600 hover:border-stone-500"
          }`}
        >
          All shops
        </Link>
        {activeShops.map((s) => (
          <Link
            key={s.id}
            href={`/shop${qs({ category, shop: s.id, q })}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              shop === s.id
                ? "border-stone-800 bg-stone-800 text-white"
                : "border-stone-300 text-stone-600 hover:border-stone-500"
            }`}
          >
            {s.name}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-stone-500">No items match that filter.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} shop={shopsById.get(p.shopId)} />
          ))}
        </div>
      )}
    </div>
  );
}
