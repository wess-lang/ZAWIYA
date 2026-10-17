import { NextRequest, NextResponse } from "next/server";
import { mutateDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { SubOrder, SubOrderStatus } from "@/lib/types";

const VALID: SubOrderStatus[] = [
  "placed",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

// FR-14: Shop Order Management - a shop owner updates the status of their
// own sub-order within a (possibly multi-shop) order.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id, subId } = await params;
  let body: { status?: SubOrderStatus };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.status || !VALID.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const result = mutateDb((db): { error: string } | { subOrder: SubOrder } => {
    const order = db.orders.find((o) => o.id === id);
    if (!order) return { error: "Order not found." };
    const subOrder = order.subOrders.find((s) => s.id === subId);
    if (!subOrder) return { error: "Sub-order not found." };
    const shop = db.shops.find((s) => s.id === subOrder.shopId);
    if (!shop || (shop.ownerId !== user.id && user.role !== "admin")) {
      return { error: "You do not manage this shop's orders." };
    }
    subOrder.status = body.status!;
    return { subOrder };
  });

  if ("error" in result) {
    const status = result.error.includes("manage") ? 403 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}
