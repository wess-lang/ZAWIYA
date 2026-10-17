import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { CATEGORY_LABELS } from "@/lib/types";
import DeleteProductButton from "./DeleteProductButton";

export default async function DashboardProductsPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { shopId } = await params;

  const db = readDb();
  const shop = db.shops.find((s) => s.id === shopId);
  if (!shop) return notFound();
  if (shop.ownerId !== user.id && user.role !== "admin") {
    return <p className="mx-auto max-w-xl px-4 py-16 text-center text-sm text-red-600">You do not manage this shop.</p>;
  }

  const products = db.products.filter((p) => p.shopId === shopId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">{shop.name} · Products</h1>
        <Link
          href={`/dashboard/${shopId}/products/new`}
          className="rounded-full bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700"
        >
          + Add product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-stone-500">No products yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                <Image src={p.image} alt={p.name} fill className="object-cover" sizes="64px" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-stone-900">{p.name}</div>
                <div className="text-xs text-stone-500">
                  {CATEGORY_LABELS[p.category]} · JD {p.price.toFixed(2)} ·{" "}
                  <span className={p.stock <= 0 ? "text-red-600" : ""}>
                    {p.stock} in stock
                  </span>
                </div>
              </div>
              <Link
                href={`/dashboard/${shopId}/products/${p.id}/edit`}
                className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium hover:border-stone-500"
              >
                Edit
              </Link>
              <DeleteProductButton productId={p.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
