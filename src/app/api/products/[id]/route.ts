import { NextRequest, NextResponse } from "next/server";
import { mutateDb, readDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Category, Product } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const product = db.products.find((p) => p.id === id);
  if (!product) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const shop = db.shops.find((s) => s.id === product.shopId);
  const reviews = db.reviews.filter((r) => r.productId === id);
  return NextResponse.json({ product, shop, reviews });
}

interface Updatable {
  name?: string;
  category?: Category;
  price?: number;
  stock?: number;
  styleTags?: string[];
  colorTags?: string[];
  roomTags?: string[];
  dimensions?: string;
  description?: string;
  image?: string;
}

// FR-13: Shop Product Management (edit)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  let body: Updatable;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = mutateDb((db): { error: string } | { product: Product } => {
    const product = db.products.find((p) => p.id === id);
    if (!product) return { error: "Not found." };
    const shop = db.shops.find((s) => s.id === product.shopId);
    if (!shop || (shop.ownerId !== user.id && user.role !== "admin")) {
      return { error: "You do not own this product." };
    }
    if (body.name !== undefined) product.name = body.name.trim();
    if (body.category !== undefined) product.category = body.category;
    if (body.price !== undefined) product.price = Math.max(0, body.price);
    if (body.stock !== undefined) product.stock = Math.max(0, body.stock);
    if (body.styleTags !== undefined) product.styleTags = body.styleTags.filter(Boolean);
    if (body.colorTags !== undefined) product.colorTags = body.colorTags.filter(Boolean);
    if (body.roomTags !== undefined) product.roomTags = body.roomTags.filter(Boolean);
    if (body.dimensions !== undefined) product.dimensions = body.dimensions.trim();
    if (body.description !== undefined) product.description = body.description.trim();
    if (body.image !== undefined && body.image.trim()) product.image = body.image.trim();
    return { product };
  });

  if ("error" in result) {
    const status = result.error.includes("own") ? 403 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  const result = mutateDb((db): { error: string } | { ok: true } => {
    const product = db.products.find((p) => p.id === id);
    if (!product) return { error: "Not found." };
    const shop = db.shops.find((s) => s.id === product.shopId);
    if (!shop || (shop.ownerId !== user.id && user.role !== "admin")) {
      return { error: "You do not own this product." };
    }
    db.products = db.products.filter((p) => p.id !== id);
    return { ok: true };
  });

  if ("error" in result) {
    const status = result.error.includes("own") ? 403 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}
