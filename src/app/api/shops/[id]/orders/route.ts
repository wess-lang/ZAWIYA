import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// FR-14: Shop Order Management - list sub-orders belonging to one shop,
// across all customer orders, for the Shop Dashboard > Orders screen.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  const db = readDb();
  const shop = db.shops.find((s) => s.id === id);
  if (!shop) return NextResponse.json({ error: "Shop not found." }, { status: 404 });
  if (shop.ownerId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "You do not manage this shop." }, { status: 403 });
  }

  const usersById = new Map(db.users.map((u) => [u.id, u]));
  const rows = db.orders.flatMap((order) =>
    order.subOrders
      .filter((s) => s.shopId === id)
      .map((subOrder) => ({
        orderId: order.id,
        subOrder,
        customerName: usersById.get(order.userId)?.name ?? "Customer",
        addressSnapshot: order.addressSnapshot,
        createdAt: order.createdAt,
      }))
  );
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json({ rows });
}
