import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { CATEGORY_LABELS } from "@/lib/types";
import { Card, Container } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
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
    return (
      <Container size="sm" className="py-16 text-center text-sm text-destructive">
        You do not manage this shop.
      </Container>
    );
  }

  const products = db.products.filter((p) => p.shopId === shopId);

  return (
    <Container size="md" className="py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {shop.name} · Products
        </h1>
        <Button href={`/dashboard/${shopId}/products/new`} size="sm">
          <Plus size={14} /> Add product
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((p) => (
            <Card key={p.id} padding="sm" className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                <Image src={p.image} alt={p.name} fill className="object-cover" sizes="64px" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {CATEGORY_LABELS[p.category]} · JD {p.price.toFixed(2)} ·{" "}
                  <span className={p.stock <= 0 ? "text-destructive" : ""}>
                    {p.stock} in stock
                  </span>
                </div>
              </div>
              <Button href={`/dashboard/${shopId}/products/${p.id}/edit`} variant="outline" size="sm">
                <Pencil size={12} /> Edit
              </Button>
              <DeleteProductButton productId={p.id} />
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
