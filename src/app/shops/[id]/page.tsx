import { notFound } from "next/navigation";
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

export default async function ShopDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { id } = await params;
  const { category } = await searchParams;
  const db = readDb();
  const shop = db.shops.find((s) => s.id === id && s.status === "active");
  if (!shop) return notFound();

  const allProducts = db.products.filter((p) => p.shopId === id);

  // The shop's own "menu": only the categories this shop actually
  // carries, in catalogue order, each a link scoped to this shop page.
  const shopCategories = (Object.keys(CATEGORY_LABELS) as Category[]).filter(
    (c) => allProducts.some((p) => p.category === c)
  );

  const products = category
    ? allProducts.filter((p) => p.category === category)
    : allProducts;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center gap-4">
        <div className="h-14 w-14 shrink-0 rounded-full" style={{ backgroundColor: shop.accent }} />
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{shop.name}</h1>
          <p className="text-sm text-stone-600">{shop.tagline}</p>
          <p className="text-xs text-stone-500">{shop.city}, Jordan</p>
        </div>
      </div>

      {shopCategories.length > 1 && (
        <nav className="mb-8 flex flex-wrap gap-2 border-b border-stone-200 pb-4">
          <Link
            href={`/shops/${id}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              !category
                ? "border-sage-600 bg-sage-600 text-white"
                : "border-stone-300 text-stone-700 hover:border-stone-500"
            }`}
          >
            All ({allProducts.length})
          </Link>
          {shopCategories.map((c) => (
            <Link
              key={c}
              href={`/shops/${id}${qs({ category: c })}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                category === c
                  ? "border-sage-600 bg-sage-600 text-white"
                  : "border-stone-300 text-stone-700 hover:border-stone-500"
              }`}
            >
              {CATEGORY_LABELS[c]} ({allProducts.filter((p) => p.category === c).length})
            </Link>
          ))}
        </nav>
      )}

      {products.length === 0 ? (
        <p className="text-sm text-stone-500">
          {allProducts.length === 0
            ? "This shop hasn't listed any products yet."
            : "Nothing in this category yet."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} shop={shop} />
          ))}
        </div>
      )}
    </div>
  );
}
