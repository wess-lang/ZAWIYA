import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { Container } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ApprovalRow from "./ApprovalRow";

// FR-15: Admin Shop Approval (Scenario 5, Section 4.3)
export default async function AdminShopsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/shops");
  if (user.role !== "admin") {
    return (
      <Container size="sm" className="py-16 text-center text-sm text-destructive">
        Admin access required.
      </Container>
    );
  }

  const db = readDb();
  const usersById = new Map(db.users.map((u) => [u.id, u]));
  const shops = db.shops.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pending = shops.filter((s) => s.status === "pending");
  const reviewed = shops.filter((s) => s.status !== "pending");

  return (
    <Container size="md" className="py-10">
      <h1 className="font-display mb-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Shop Approvals
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">Signed in as admin: {user.email}</p>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pending ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <p className="mb-8 text-sm text-muted-foreground">Nothing waiting for review.</p>
      ) : (
        <div className="mb-8 flex flex-col gap-3">
          {pending.map((shop) => (
            <ApprovalRow key={shop.id} shop={shop} ownerName={usersById.get(shop.ownerId)?.name ?? "Unknown"} />
          ))}
        </div>
      )}

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Reviewed
      </h2>
      <div className="flex flex-col gap-2">
        {reviewed.map((shop) => (
          <div
            key={shop.id}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm"
          >
            <span>
              {shop.name}{" "}
              <span className="text-muted-foreground">· {usersById.get(shop.ownerId)?.name}</span>
            </span>
            <Badge tone={shop.status === "active" ? "success" : "danger"} className="capitalize">
              {shop.status}
            </Badge>
          </div>
        ))}
      </div>
    </Container>
  );
}
