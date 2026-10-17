import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Backs the Admin > Shop Approvals screen (FR-15).
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const db = readDb();
  const usersById = new Map(db.users.map((u) => [u.id, u]));
  const shops = db.shops
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((s) => ({ ...s, ownerName: usersById.get(s.ownerId)?.name ?? "Unknown" }));
  return NextResponse.json({ shops });
}
