import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { Card, Container } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ShopLogo from "@/components/ShopLogo";

// Entry point for the Shop Dashboard (FR-13/FR-14).
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role !== "shop_owner" && user.role !== "admin") {
    return (
      <Container size="sm" className="py-16 text-center text-sm text-muted-foreground">
        This area is for shop owners.{" "}
        <Link href="/shops/register" className="text-brand-700 hover:underline">
          List a shop
        </Link>{" "}
        to get access.
      </Container>
    );
  }

  const db = readDb();
  const shops = db.shops.filter((s) => s.ownerId === user.id);

  return (
    <Container size="md" className="py-10">
      <h1 className="font-display mb-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Shop Dashboard
      </h1>

      {shops.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You don&apos;t have a shop yet.{" "}
          <Link href="/shops/register" className="text-brand-700 hover:underline">
            List one
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {shops.map((shop) => {
            const productCount = db.products.filter((p) => p.shopId === shop.id).length;
            const pendingOrders = db.orders
              .flatMap((o) => o.subOrders)
              .filter((s) => s.shopId === shop.id && s.status === "placed").length;
            return (
              <Card key={shop.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <ShopLogo name={shop.name} accent={shop.accent} size={40} />
                    <div>
                      <div className="font-semibold text-foreground">{shop.name}</div>
                      <div className="text-xs text-muted-foreground">{shop.city}</div>
                    </div>
                  </div>
                  <Badge
                    tone={
                      shop.status === "active" ? "success" : shop.status === "pending" ? "warning" : "danger"
                    }
                    className="capitalize"
                  >
                    {shop.status}
                  </Badge>
                </div>

                {shop.status === "rejected" && shop.rejectionReason && (
                  <p className="mt-2 text-xs text-destructive">Reason: {shop.rejectionReason}</p>
                )}

                {shop.status === "active" && (
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <Button href={`/dashboard/${shop.id}/products`} variant="outline" size="sm">
                      Products ({productCount})
                    </Button>
                    <Button href={`/dashboard/${shop.id}/orders`} variant="outline" size="sm">
                      Orders {pendingOrders > 0 && `(${pendingOrders} new)`}
                    </Button>
                  </div>
                )}
                {shop.status === "pending" && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Waiting on administrator approval before this shop goes live.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </Container>
  );
}
