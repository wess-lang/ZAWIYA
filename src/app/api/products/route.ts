import { NextRequest, NextResponse } from "next/server";
import { mutateDb, readDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { newId } from "@/lib/id";
import { writeProductArt } from "@/lib/productArt";
import type { Category, Product as ProductType } from "@/lib/types";

// FR-06/FR-07: multi-shop catalogue with search & filter.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase();
  const category = searchParams.get("category") as Category | null;
  const shopId = searchParams.get("shopId");
  const maxPrice = searchParams.get("maxPrice");
  const shopOwnerId = searchParams.get("shopOwnerId"); // dashboard use

  const db = readDb();
  const activeShopIds = new Set(
    db.shops.filter((s) => s.status === "active").map((s) => s.id)
  );

  let products = db.products.filter((p) =>
    shopOwnerId ? true : activeShopIds.has(p.shopId)
  );

  if (shopOwnerId) {
    const ownShopIds = new Set(
      db.shops.filter((s) => s.ownerId === shopOwnerId).map((s) => s.id)
    );
    products = products.filter((p) => ownShopIds.has(p.shopId));
  }

  if (q) {
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.styleTags.some((t) => t.toLowerCase().includes(q)) ||
        p.colorTags.some((t) => t.toLowerCase().includes(q))
    );
  }
  if (category) products = products.filter((p) => p.category === category);
  if (shopId) products = products.filter((p) => p.shopId === shopId);
  if (maxPrice) products = products.filter((p) => p.price <= Number(maxPrice));

  return NextResponse.json({ products });
}

// FR-13: Shop Product Management (create)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "shop_owner" && user.role !== "admin")) {
    return NextResponse.json({ error: "Shop owner access required." }, { status: 403 });
  }

  let body: {
    shopId?: string;
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
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.shopId || !body.name || !body.category || body.price == null) {
    return NextResponse.json(
      { error: "shopId, name, category, and price are required." },
      { status: 400 }
    );
  }
  if (body.price < 0 || (body.stock ?? 0) < 0) {
    return NextResponse.json({ error: "Price and stock must be non-negative." }, { status: 400 });
  }

  const result = mutateDb((db): { error: string } | { product: ProductType } => {
    const shop = db.shops.find((s) => s.id === body.shopId);
    if (!shop) return { error: "Shop not found." };
    if (shop.ownerId !== user.id && user.role !== "admin") {
      return { error: "You do not own this shop." };
    }

    const id = newId("prod");
    const colorTags = body.colorTags?.filter(Boolean) ?? [];
    const product: ProductType = {
      id,
      shopId: shop.id,
      name: body.name!.trim(),
      category: body.category!,
      price: body.price!,
      stock: body.stock ?? 0,
      styleTags: body.styleTags?.filter(Boolean) ?? [],
      colorTags,
      roomTags: body.roomTags?.filter(Boolean) ?? [],
      dimensions: body.dimensions?.trim() || undefined,
      description: body.description?.trim() ?? "",
      image: body.image?.trim() || writeProductArt(id, body.category!, colorTags, shop.accent),
    };
    db.products.push(product);
    return { product };
  });

  if ("error" in result) {
    const status = result.error.includes("own") ? 403 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}
