import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import ProductCard from "@/components/ProductCard";
import { Container } from "@/components/ui/Card";

// FR-18: Wishlist / Favourites
export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/wishlist");

  const db = readDb();
  const productIds = new Set(
    db.wishlist.filter((w) => w.userId === user.id).map((w) => w.productId)
  );
  const products = db.products.filter((p) => productIds.has(p.id));
  const shopsById = new Map(db.shops.map((s) => [s.id, s]));

  return (
    <Container size="lg" className="py-10">
      <h1 className="font-display mb-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Your wishlist
      </h1>
      {products.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center text-sm text-muted-foreground">
          <Heart size={28} className="mb-3 text-border-strong" />
          Nothing saved yet.{" "}
          <Link href="/shop" className="text-brand-700 hover:underline">
            Browse the marketplace
          </Link>
        </div>
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
