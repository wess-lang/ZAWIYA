import Link from "next/link";
import { redirect } from "next/navigation";
import { PackageOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { SUB_ORDER_STATUS_FLOW, SUB_ORDER_STATUS_LABELS } from "@/lib/types";
import SubOrderStatusBadge from "@/components/SubOrderStatusBadge";
import { Card, Container } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

// FR-11: Order Tracking - one screen combining every sub-order's status
// until the whole order is delivered (Scenario 6, Section 4.3).
export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/orders");

  const db = readDb();
  const shopsById = new Map(db.shops.map((s) => [s.id, s]));
  const orders = db.orders
    .filter((o) => o.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (orders.length === 0) {
    return (
      <Container size="sm" className="py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <PackageOpen size={22} />
        </div>
        <h1 className="font-display text-xl font-semibold text-foreground">No orders yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Orders you place will show up here with live status per shop.
        </p>
        <Button href="/shop" size="lg" className="mt-6">
          Go to shop
        </Button>
      </Container>
    );
  }

  return (
    <Container size="md" className="py-10">
      <h1 className="font-display mb-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Your orders
      </h1>
      <div className="flex flex-col gap-6">
        {orders.map((order) => (
          <Card key={order.id}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Order #{order.id.split("_")[1]?.slice(0, 8) ?? order.id}</span>
              <span>{new Date(order.createdAt).toLocaleString()}</span>
            </div>

            <div className="flex flex-col gap-4">
              {order.subOrders.map((sub) => {
                const shop = shopsById.get(sub.shopId);
                const isCancelled = sub.status === "cancelled";
                const currentIdx = SUB_ORDER_STATUS_FLOW.indexOf(sub.status);
                return (
                  <div
                    key={sub.id}
                    className="rounded-xl border border-border bg-muted/60 p-3.5 border-l-4"
                    style={{ borderLeftColor: shop?.accent ?? "var(--border)" }}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        {shop && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: shop.accent }} />}
                        {shop?.name ?? "Shop"}
                      </span>
                      <SubOrderStatusBadge status={sub.status} />
                    </div>

                    {!isCancelled && (
                      <div className="mb-2 flex items-center gap-1">
                        {SUB_ORDER_STATUS_FLOW.map((step, i) => (
                          <div key={step} className="flex flex-1 items-center">
                            <div
                              className="h-1.5 flex-1 rounded-full transition-colors"
                              style={{ backgroundColor: i <= currentIdx ? (shop?.accent ?? "var(--accent)") : "var(--border)" }}
                              title={SUB_ORDER_STATUS_LABELS[step]}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-0.5">
                      {sub.items.map((item) => (
                        <div key={item.productId} className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {item.productName} x{item.qty}
                          </span>
                          <span>JD {(item.unitPrice * item.qty).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 text-right text-xs font-medium text-foreground/80">
                      Subtotal: JD {sub.subtotal.toFixed(2)}
                    </div>

                    {sub.status === "delivered" && (
                      <div className="mt-2 text-right">
                        {sub.items.map((item) => (
                          <Link
                            key={item.productId}
                            href={`/products/${item.productId}`}
                            className="ml-2 text-xs text-brand-700 hover:underline"
                          >
                            Leave a review →
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">
                {order.addressSnapshot.label}, {order.addressSnapshot.city}
              </span>
              <span className="font-semibold text-foreground">
                Total: JD {order.totalAmount.toFixed(2)}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </Container>
  );
}
