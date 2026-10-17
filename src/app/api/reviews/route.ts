import { NextRequest, NextResponse } from "next/server";
import { mutateDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { newId } from "@/lib/id";

// FR-12: Ratings & Reviews
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: { productId?: string; rating?: number; comment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { productId, rating, comment } = body;
  if (!productId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "productId and a rating between 1 and 5 are required." },
      { status: 400 }
    );
  }

  const result = mutateDb((db) => {
    const product = db.products.find((p) => p.id === productId);
    if (!product) return { error: "Product not found." as const };

    const existing = db.reviews.find(
      (r) => r.productId === productId && r.userId === user.id
    );
    if (existing) {
      existing.rating = rating;
      existing.comment = comment?.trim() ?? "";
      existing.createdAt = new Date().toISOString();
      return { review: existing };
    }

    const review = {
      id: newId("rev"),
      userId: user.id,
      userName: user.name,
      productId,
      rating,
      comment: comment?.trim() ?? "",
      createdAt: new Date().toISOString(),
    };
    db.reviews.push(review);
    return { review };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json(result, { status: 201 });
}
