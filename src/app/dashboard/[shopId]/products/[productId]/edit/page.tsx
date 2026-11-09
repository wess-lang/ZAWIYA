import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { Container } from "@/components/ui/Card";
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
    return (
      <Container size="sm" className="py-16 text-center text-sm text-destructive">
        You do not manage this shop.
      </Container>
    );
  }

  return (
    <Container size="sm" className="py-10">
      <h1 className="font-display mb-6 text-2xl font-semibold tracking-tight text-foreground">
        Edit product
      </h1>
      <ProductForm shopId={shopId} product={product} />
    </Container>
  );
}
