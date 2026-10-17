import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Backs the Shop Dashboard entry point (FR-13/FR-14) for decoupled
// clients. The web app's dashboard page reads this straight out of the
// database in a server component (src/app/dashboard/page.tsx); this
// gives the same data — the signed-in user's own shops, any status,
// plus the product/pending-order counts shown there — over the API.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const db = readDb();
  const shops = db.shops
    .filter((s) => s.ownerId === user.id)
    .map((shop) => {
      const productCount = db.products.filter((p) => p.shopId === shop.id).length;
      const pendingOrders = db.orders
        .flatMap((o) => o.subOrders)
        .filter((s) => s.shopId === shop.id && s.status === "placed").length;
      return { ...shop, productCount, pendingOrders };
    });

  return NextResponse.json({ shops });
}
