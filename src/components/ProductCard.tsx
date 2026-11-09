import Link from "next/link";
import Image from "next/image";
import type { Product, Shop } from "@/lib/types";
import QuickAddButton from "@/components/QuickAddButton";
import { swatchColor } from "@/lib/materialColors";

export default function ProductCard({
  product,
  shop,
}: {
  product: Product;
  shop?: Pick<Shop, "name"> | null;
}) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:rotate-1 hover:border-border-strong hover:shadow-lg"
      style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {product.stock <= 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-foreground/85 px-2 py-0.5 text-[10px] font-medium text-background">
            Out of stock
          </span>
        )}
        {/* A quiet hint of the product's actual finish/upholstery
            colours — real swatches (wood, fabric, metal), not a UI
            accent — revealed on hover so the image stays clean at rest. */}
        {product.colorTags.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {product.colorTags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                title={tag}
                className="h-3.5 w-3.5 rounded-full ring-2 ring-card"
                style={{ backgroundColor: swatchColor(tag) }}
              />
            ))}
          </div>
        )}
        <QuickAddButton
          productId={product.id}
          name={product.name}
          price={product.price}
          image={product.image}
          shopId={product.shopId}
          shopName={shop?.name ?? "Shop"}
          disabled={product.stock <= 0}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        {shop && (
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {shop.name}
          </span>
        )}
        <span className="text-sm font-medium text-foreground">{product.name}</span>
        <span className="mt-auto pt-1 text-sm font-semibold text-accent-soft-foreground">
          JD {product.price.toFixed(2)}
        </span>
      </div>
    </Link>
  );
}
