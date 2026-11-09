import { notFound } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ShopLogo from "@/components/ShopLogo";
import { Container } from "@/components/ui/Card";
import { readDb } from "@/lib/db";
import { CATEGORY_LABELS, type Category } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/categoryColors";

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
    <Container size="lg" className="py-10">
      {/* A thin banner in the shop's own brand colour — the same
          `accent` ShopLogo already falls back to — so each shop's page
          carries a bit of that shop's real identity, not just a
          uniform neutral header. */}
      <div
        className="mb-6 h-2 w-full rounded-full"
        style={{ backgroundColor: shop.accent }}
      />
      <div className="mb-6 flex items-center gap-4">
        <ShopLogo name={shop.name} accent={shop.accent} size={72} />
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">{shop.name}</h1>
          <p className="text-sm text-muted-foreground">{shop.tagline}</p>
          <p className="text-xs text-muted-foreground">{shop.city}, Jordan</p>
        </div>
      </div>

      {shopCategories.length > 1 && (
        <nav className="mb-8 flex flex-wrap gap-2 border-b border-border pb-5">
          <Link
            href={`/shops/${id}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              !category
                ? "border-transparent text-white"
                : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
            }`}
            style={!category ? { backgroundColor: shop.accent } : undefined}
          >
            All ({allProducts.length})
          </Link>
          {shopCategories.map((c) => (
            <Link
              key={c}
              href={`/shops/${id}${qs({ category: c })}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                category === c
                  ? "border-transparent text-white"
                  : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
              }`}
              style={category === c ? { backgroundColor: CATEGORY_COLORS[c] } : undefined}
            >
              {CATEGORY_LABELS[c]} ({allProducts.filter((p) => p.category === c).length})
            </Link>
          ))}
        </nav>
      )}

      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
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
    </Container>
  );
}
