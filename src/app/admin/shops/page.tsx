import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import ApprovalRow from "./ApprovalRow";

// FR-15: Admin Shop Approval (Scenario 5, Section 4.3)
export default async function AdminShopsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/shops");
  if (user.role !== "admin") {
    return (
      <p className="mx-auto max-w-xl px-4 py-16 text-center text-sm text-red-600">
        Admin access required.
      </p>
    );
  }

  const db = readDb();
  const usersById = new Map(db.users.map((u) => [u.id, u]));
  const shops = db.shops.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pending = shops.filter((s) => s.status === "pending");
  const reviewed = shops.filter((s) => s.status !== "pending");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-stone-900">Shop Approvals</h1>
      <p className="mb-6 text-sm text-stone-600">Signed in as admin: {user.email}</p>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Pending ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <p className="mb-8 text-sm text-stone-500">Nothing waiting for review.</p>
      ) : (
        <div className="mb-8 flex flex-col gap-3">
          {pending.map((shop) => (
            <ApprovalRow key={shop.id} shop={shop} ownerName={usersById.get(shop.ownerId)?.name ?? "Unknown"} />
          ))}
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Reviewed
      </h2>
      <div className="flex flex-col gap-2">
        {reviewed.map((shop) => (
          <div key={shop.id} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm">
            <span>
              {shop.name} <span className="text-stone-400">· {usersById.get(shop.ownerId)?.name}</span>
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                shop.status === "active" ? "bg-sage-50 text-sage-700" : "bg-red-50 text-red-700"
              }`}
            >
              {shop.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
