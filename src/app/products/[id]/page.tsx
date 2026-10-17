import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { readDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORY_LABELS } from "@/lib/types";
import AddToCartButton from "@/components/AddToCartButton";
import WishlistButton from "@/components/WishlistButton";
import StarRating from "@/components/StarRating";
import ReviewForm from "./ReviewForm";

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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-stone-100">
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
              className="text-xs font-medium uppercase tracking-wide text-sage-700 hover:underline"
            >
              {shop.name}
            </Link>
          )}
          <h1 className="mt-1 text-2xl font-semibold text-stone-900">{product.name}</h1>
          <p className="mt-1 text-xs text-stone-500">{CATEGORY_LABELS[product.category]}</p>
          <div className="mt-2">
            <StarRating rating={avgRating} count={reviews.length} />
          </div>
          <p className="mt-4 text-2xl font-semibold text-sage-700">
            JD {product.price.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            {product.dimensions && ` · ${product.dimensions}`}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-stone-700">{product.description}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {[...product.colorTags, ...product.styleTags].map((t) => (
              <span key={t} className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                {t}
              </span>
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
        </div>
      </div>

      <div className="mt-14 border-t border-stone-200 pt-8">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">Reviews</h2>
        <ReviewForm productId={product.id} signedIn={!!user} />
        {reviews.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">No reviews yet.</p>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-900">{r.userName}</span>
                  <StarRating rating={r.rating} />
                </div>
                {r.comment && <p className="mt-2 text-sm text-stone-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
