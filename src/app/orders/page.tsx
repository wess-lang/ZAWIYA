import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { SUB_ORDER_STATUS_FLOW, SUB_ORDER_STATUS_LABELS } from "@/lib/types";
import SubOrderStatusBadge from "@/components/SubOrderStatusBadge";

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
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-stone-900">No orders yet</h1>
        <p className="mt-2 text-sm text-stone-600">
          Orders you place will show up here with live status per shop.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full bg-sage-600 px-6 py-3 font-medium text-white hover:bg-sage-700"
        >
          Go to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Your orders</h1>
      <div className="flex flex-col gap-6">
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
              <span>Order #{order.id.split("_")[1]?.slice(0, 8) ?? order.id}</span>
              <span>{new Date(order.createdAt).toLocaleString()}</span>
            </div>

            <div className="flex flex-col gap-4">
              {order.subOrders.map((sub) => {
                const shop = shopsById.get(sub.shopId);
                const isCancelled = sub.status === "cancelled";
                const currentIdx = SUB_ORDER_STATUS_FLOW.indexOf(sub.status);
                return (
                  <div key={sub.id} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-stone-900">
                        {shop?.name ?? "Shop"}
                      </span>
                      <SubOrderStatusBadge status={sub.status} />
                    </div>

                    {!isCancelled && (
                      <div className="mb-2 flex items-center gap-1">
                        {SUB_ORDER_STATUS_FLOW.map((step, i) => (
                          <div key={step} className="flex flex-1 items-center">
                            <div
                              className={`h-1.5 flex-1 rounded-full ${
                                i <= currentIdx ? "bg-sage-600" : "bg-stone-200"
                              }`}
                              title={SUB_ORDER_STATUS_LABELS[step]}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-0.5">
                      {sub.items.map((item) => (
                        <div key={item.productId} className="flex justify-between text-xs text-stone-600">
                          <span>
                            {item.productName} x{item.qty}
                          </span>
                          <span>JD {(item.unitPrice * item.qty).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 text-right text-xs font-medium text-stone-700">
                      Subtotal: JD {sub.subtotal.toFixed(2)}
                    </div>

                    {sub.status === "delivered" && (
                      <div className="mt-2 text-right">
                        {sub.items.map((item) => (
                          <Link
                            key={item.productId}
                            href={`/products/${item.productId}`}
                            className="ml-2 text-xs text-sage-700 hover:underline"
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

            <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 text-sm">
              <span className="text-stone-500">
                {order.addressSnapshot.label}, {order.addressSnapshot.city}
              </span>
              <span className="font-semibold text-stone-900">
                Total: JD {order.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
