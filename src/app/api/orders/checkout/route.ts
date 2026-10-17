import { NextRequest, NextResponse } from "next/server";
import { mutateDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { newId } from "@/lib/id";
import type { Order, OrderItem, PaymentMethod, SubOrder } from "@/lib/types";

interface CheckoutLine {
  productId: string;
  qty: number;
}

// FR-08/FR-09/FR-10: multi-shop cart checkout with automatic order
// splitting into one SubOrder per shop (Scenario 2, Section 4.3).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: { addressId?: string; paymentMethod?: PaymentMethod; lines?: CheckoutLine[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { addressId, paymentMethod, lines } = body;
  if (!addressId || !paymentMethod || !lines || lines.length === 0) {
    return NextResponse.json(
      { error: "addressId, paymentMethod, and at least one cart line are required." },
      { status: 400 }
    );
  }
  if (!["card", "cliq", "cod"].includes(paymentMethod)) {
    return NextResponse.json({ error: "Unsupported payment method." }, { status: 400 });
  }

  const result = mutateDb((db) => {
    const address = db.addresses.find((a) => a.id === addressId && a.userId === user.id);
    if (!address) return { error: "Address not found." as const };

    // Validate stock and build items grouped by shop before mutating
    // anything, so a failure partway through never leaves stock
    // half-decremented.
    const bySho = new Map<string, OrderItem[]>();
    for (const line of lines) {
      if (line.qty <= 0) continue;
      const product = db.products.find((p) => p.id === line.productId);
      if (!product) return { error: `Product ${line.productId} not found.` as const };
      if (product.stock < line.qty) {
        return { error: `"${product.name}" only has ${product.stock} in stock.` as const };
      }
      const item: OrderItem = {
        productId: product.id,
        productName: product.name,
        shopId: product.shopId,
        unitPrice: product.price,
        qty: line.qty,
      };
      const arr = bySho.get(product.shopId) ?? [];
      arr.push(item);
      bySho.set(product.shopId, arr);
    }
    if (bySho.size === 0) return { error: "Cart is empty." as const };

    // Decrement stock now that everything validated.
    for (const items of bySho.values()) {
      for (const item of items) {
        const product = db.products.find((p) => p.id === item.productId)!;
        product.stock -= item.qty;
      }
    }

    const orderId = newId("ord");
    const subOrders: SubOrder[] = Array.from(bySho.entries()).map(([shopId, items]) => ({
      id: newId("sub"),
      orderId,
      shopId,
      status: "placed",
      items,
      subtotal: items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0),
    }));

    const order: Order = {
      id: orderId,
      userId: user.id,
      addressId: address.id,
      addressSnapshot: { label: address.label, city: address.city, details: address.details },
      paymentMethod,
      subOrders,
      totalAmount: subOrders.reduce((sum, s) => sum + s.subtotal, 0),
      createdAt: new Date().toISOString(),
    };

    db.orders.push(order);
    return { order };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result, { status: 201 });
}
