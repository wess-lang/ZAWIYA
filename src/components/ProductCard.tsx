import Link from "next/link";
import Image from "next/image";
import type { Product, Shop } from "@/lib/types";

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
      className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white transition hover:border-stone-400 hover:shadow-sm"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-cover transition group-hover:scale-105"
        />
        {product.stock <= 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-stone-900/80 px-2 py-0.5 text-[10px] font-medium text-white">
            Out of stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {shop && (
          <span className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
            {shop.name}
          </span>
        )}
        <span className="text-sm font-medium text-stone-900">{product.name}</span>
        <span className="mt-auto text-sm font-semibold text-sage-700">
          JD {product.price.toFixed(2)}
        </span>
      </div>
    </Link>
  );
}
