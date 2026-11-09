import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import Button from "@/components/ui/Button";
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

function Chip({
  href,
  active,
  color,
  children,
}: {
  href: string;
  active: boolean;
  /** A real hex (category colour or a shop's own `accent`) — when
   *  given, the active state fills with this colour instead of the
   *  flat accent/dark defaults, so the filter row reads as colourful
   *  as the things it's filtering. */
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-transparent text-white"
          : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
      }`}
      style={active ? { backgroundColor: color ?? "var(--accent)" } : undefined}
    >
      {children}
    </Link>
  );
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
    <Container size="lg" className="py-10">
      <h1 className="font-display mb-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Shop
      </h1>

      <form action="/shop" className="mb-6 flex gap-2">
        {category && <input type="hidden" name="category" value={category} />}
        {shop && <input type="hidden" name="shop" value={shop} />}
        <div className="relative w-full max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search furniture..."
            className="w-full rounded-full border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors hover:border-border-strong focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SlidersHorizontal size={14} className="mr-1 text-muted-foreground" />
        <Chip href={`/shop${qs({ shop, q })}`} active={!category}>
          All categories
        </Chip>
        {categories.map((c) => (
          <Chip key={c} href={`/shop${qs({ category: c, shop, q })}`} active={category === c} color={CATEGORY_COLORS[c]}>
            {CATEGORY_LABELS[c]}
          </Chip>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <Chip href={`/shop${qs({ category, q })}`} active={!shop}>
          All shops
        </Chip>
        {activeShops.map((s) => (
          <Chip key={s.id} href={`/shop${qs({ category, shop: s.id, q })}`} active={shop === s.id} color={s.accent}>
            {s.name}
          </Chip>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No items match that filter.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} shop={shopsById.get(p.shopId)} />
          ))}
        </div>
      )}
    </Container>
  );
}
