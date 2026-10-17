import { NextRequest, NextResponse } from "next/server";
import { mutateDb, readDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { newId } from "@/lib/id";

// FR-06 (shop listing) and shop registration (Scenario 5, Section 4.3)
export async function GET() {
  const db = readDb();
  const shops = db.shops.filter((s) => s.status === "active");
  return NextResponse.json({ shops });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  let body: {
    name?: string;
    tagline?: string;
    city?: string;
    styleTags?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = body.name?.trim();
  const tagline = body.tagline?.trim() ?? "";
  const city = body.city?.trim();
  if (!name || !city) {
    return NextResponse.json(
      { error: "Shop name and city are required." },
      { status: 400 }
    );
  }

  const palette = [
    "#6B7A4F",
    "#3E6F6B",
    "#A6763E",
    "#B8860B",
    "#6B3F2A",
    "#4C7A3D",
    "#7A4F6B",
  ];

  const shop = mutateDb((db) => {
    // Promote the account to shop_owner if it was a plain customer.
    const u = db.users.find((x) => x.id === user.id);
    if (u && u.role === "customer") u.role = "shop_owner";

    const shop = {
      id: newId("shop"),
      ownerId: user.id,
      name,
      tagline,
      city,
      accent: palette[Math.floor(Math.random() * palette.length)],
      styleTags: body.styleTags?.filter(Boolean) ?? [],
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };
    db.shops.push(shop);
    return shop;
  });

  return NextResponse.json({ shop });
}
