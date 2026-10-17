import { NextRequest, NextResponse } from "next/server";
import { mutateDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// FR-15: Admin Shop Approval
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  let body: { action?: "approve" | "reject"; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'." },
      { status: 400 }
    );
  }

  const result = mutateDb((db) => {
    const shop = db.shops.find((s) => s.id === id);
    if (!shop) return { error: "Shop not found." as const };
    shop.status = body.action === "approve" ? "active" : "rejected";
    if (body.action === "reject") shop.rejectionReason = body.reason ?? "Not specified.";
    return { shop };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json(result);
}
