import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";

// Entry point for the Shop Dashboard (FR-13/FR-14).
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role !== "shop_owner" && user.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-sm text-stone-600">
        This area is for shop owners.{" "}
        <Link href="/shops/register" className="text-sage-700 hover:underline">
          List a shop
        </Link>{" "}
        to get access.
      </div>
    );
  }

  const db = readDb();
  const shops = db.shops.filter((s) => s.ownerId === user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Shop Dashboard</h1>

      {shops.length === 0 ? (
        <p className="text-sm text-stone-600">
          You don&apos;t have a shop yet.{" "}
          <Link href="/shops/register" className="text-sage-700 hover:underline">
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
              <div key={shop.id} className="rounded-xl border border-stone-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full" style={{ backgroundColor: shop.accent }} />
                    <div>
                      <div className="font-semibold text-stone-900">{shop.name}</div>
                      <div className="text-xs text-stone-500">{shop.city}</div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      shop.status === "active"
                        ? "bg-sage-50 text-sage-700"
                        : shop.status === "pending"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {shop.status}
                  </span>
                </div>

                {shop.status === "rejected" && shop.rejectionReason && (
                  <p className="mt-2 text-xs text-red-600">Reason: {shop.rejectionReason}</p>
                )}

                {shop.status === "active" && (
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <Link
                      href={`/dashboard/${shop.id}/products`}
                      className="rounded-full border border-stone-300 px-4 py-2 font-medium hover:border-stone-500"
                    >
                      Products ({productCount})
                    </Link>
                    <Link
                      href={`/dashboard/${shop.id}/orders`}
                      className="rounded-full border border-stone-300 px-4 py-2 font-medium hover:border-stone-500"
                    >
                      Orders {pendingOrders > 0 && `(${pendingOrders} new)`}
                    </Link>
                  </div>
                )}
                {shop.status === "pending" && (
                  <p className="mt-3 text-xs text-stone-500">
                    Waiting on administrator approval before this shop goes live.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
