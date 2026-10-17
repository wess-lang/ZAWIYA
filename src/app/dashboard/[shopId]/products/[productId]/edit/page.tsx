import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import ProductForm from "../../ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ shopId: string; productId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { shopId, productId } = await params;

  const db = readDb();
  const shop = db.shops.find((s) => s.id === shopId);
  const product = db.products.find((p) => p.id === productId && p.shopId === shopId);
  if (!shop || !product) return notFound();
  if (shop.ownerId !== user.id && user.role !== "admin") {
    return <p className="mx-auto max-w-xl px-4 py-16 text-center text-sm text-red-600">You do not manage this shop.</p>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Edit product</h1>
      <ProductForm shopId={shopId} product={product} />
    </div>
  );
}
