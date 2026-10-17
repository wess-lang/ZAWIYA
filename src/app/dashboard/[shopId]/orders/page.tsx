import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import SubOrderRow from "./SubOrderRow";

// FR-14: Shop Order Management
export default async function ShopOrdersPage({
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

  const rows = db.orders
    .flatMap((order) =>
      order.subOrders
        .filter((s) => s.shopId === shopId)
        .map((subOrder) => ({ order, subOrder }))
    )
    .sort((a, b) => b.order.createdAt.localeCompare(a.order.createdAt));

  const usersById = new Map(db.users.map((u) => [u.id, u]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">{shop.name} · Orders</h1>

      {rows.length === 0 ? (
        <p className="text-sm text-stone-500">No orders yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map(({ order, subOrder }) => (
            <div key={subOrder.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                <span>{usersById.get(order.userId)?.name ?? "Customer"}</span>
                <span>{new Date(order.createdAt).toLocaleString()}</span>
              </div>
              <div className="mb-2 flex flex-col gap-0.5">
                {subOrder.items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm text-stone-700">
                    <span>
                      {item.productName} x{item.qty}
                    </span>
                    <span>JD {(item.unitPrice * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="mb-3 text-xs text-stone-500">
                Deliver to: {order.addressSnapshot.details}, {order.addressSnapshot.city}
              </div>
              <SubOrderRow orderId={order.id} subOrder={subOrder} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
