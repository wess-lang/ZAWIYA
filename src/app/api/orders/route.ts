import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// FR-11: Order Tracking (list current user's orders, newest first)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const db = readDb();
  const orders = db.orders
    .filter((o) => o.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const shopsById = new Map(db.shops.map((s) => [s.id, s]));
  const enriched = orders.map((o) => ({
    ...o,
    subOrders: o.subOrders.map((s) => ({ ...s, shopName: shopsById.get(s.shopId)?.name ?? "Shop" })),
  }));

  return NextResponse.json({ orders: enriched });
}
