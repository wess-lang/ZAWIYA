import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { readDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORY_LABELS } from "@/lib/types";
import AddToCartButton from "@/components/AddToCartButton";
import WishlistButton from "@/components/WishlistButton";
import StarRating from "@/components/StarRating";
import { Card, Container } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { swatchColor } from "@/lib/materialColors";
import ReviewForm from "./ReviewForm";
import SeeInRoomButton from "./SeeInRoomButton";

// A small rotation of tones for style tags ("scandinavian",
// "minimalist", ...) so the row reads with some genuine variety
// instead of every tag being the same flat grey pill. Colour tags get
// their own real swatch dot further down instead of using this set.
const STYLE_TAG_TONES = ["accent", "info", "plum", "warning"] as const;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = readDb();
  const product = db.products.find((p) => p.id === id);
  if (!product) return notFound();
  const shop = db.shops.find((s) => s.id === product.shopId);
  const reviews = db.reviews
    .filter((r) => r.productId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const avgRating =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const user = await getCurrentUser();
  const wishlisted = user
    ? db.wishlist.some((w) => w.userId === user.id && w.productId === id)
    : false;

  return (
    <Container size="md" className="py-10">
      <nav className="mb-6 flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/shop" className="hover:text-foreground">Shop</Link>
        <ChevronRight size={12} />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div>
          {shop && (
            <Link
              href={`/shops/${shop.id}`}
              className="text-xs font-semibold uppercase tracking-wide text-brand-700 hover:underline"
            >
              {shop.name}
            </Link>
          )}
          <h1 className="font-display mt-1.5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {product.name}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">{CATEGORY_LABELS[product.category]}</p>
          <div className="mt-2.5">
            <StarRating rating={avgRating} count={reviews.length} />
          </div>
          <p className="mt-5 text-2xl font-semibold text-accent-soft-foreground">
            JD {product.price.toFixed(2)}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            {product.dimensions && ` · ${product.dimensions}`}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-foreground/85">{product.description}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {product.colorTags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: swatchColor(t) }}
                />
                {t}
              </span>
            ))}
            {product.styleTags.map((t, i) => (
              <Badge key={t} tone={STYLE_TAG_TONES[i % STYLE_TAG_TONES.length]}>
                {t}
              </Badge>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex-1">
              <AddToCartButton
                productId={product.id}
                name={product.name}
                price={product.price}
                image={product.image}
                shopId={product.shopId}
                shopName={shop?.name ?? "Shop"}
                disabled={product.stock <= 0}
              />
            </div>
            <WishlistButton productId={product.id} initial={wishlisted} signedIn={!!user} />
          </div>

          <div className="mt-3">
            <SeeInRoomButton
              productId={product.id}
              productName={product.name}
              signedIn={!!user}
              hasRealPhoto={product.image.startsWith("/products/real/")}
            />
          </div>
        </div>
      </div>

      <div className="mt-14 border-t border-border pt-8">
        <h2 className="font-display mb-4 text-lg font-semibold text-foreground">Reviews</h2>
        <ReviewForm productId={product.id} signedIn={!!user} />
        {reviews.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {reviews.map((r) => (
              <Card key={r.id} padding="sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{r.userName}</span>
                  <StarRating rating={r.rating} />
                </div>
                {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
