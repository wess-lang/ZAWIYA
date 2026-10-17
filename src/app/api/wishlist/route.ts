import { NextRequest, NextResponse } from "next/server";
import { mutateDb, readDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// FR-18: Wishlist / Favourites
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const db = readDb();
  const productIds = new Set(
    db.wishlist.filter((w) => w.userId === user.id).map((w) => w.productId)
  );
  const products = db.products.filter((p) => productIds.has(p.id));
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: { productId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.productId) {
    return NextResponse.json({ error: "productId is required." }, { status: 400 });
  }

  mutateDb((db) => {
    const already = db.wishlist.some(
      (w) => w.userId === user.id && w.productId === body.productId
    );
    if (!already) {
      db.wishlist.push({ userId: user.id, productId: body.productId!, createdAt: new Date().toISOString() });
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId query param is required." }, { status: 400 });
  }

  mutateDb((db) => {
    db.wishlist = db.wishlist.filter(
      (w) => !(w.userId === user.id && w.productId === productId)
    );
  });

  return NextResponse.json({ ok: true });
}
