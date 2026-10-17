import { NextRequest, NextResponse } from "next/server";
import { mutateDb, readDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { newId } from "@/lib/id";

// FR-02: Profile & Address Management
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const db = readDb();
  const addresses = db.addresses.filter((a) => a.userId === user.id);
  return NextResponse.json({ addresses });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: { label?: string; city?: string; details?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const label = body.label?.trim();
  const city = body.city?.trim();
  const details = body.details?.trim();
  if (!label || !city || !details) {
    return NextResponse.json(
      { error: "Label, city, and details are required." },
      { status: 400 }
    );
  }

  const address = mutateDb((db) => {
    const address = { id: newId("addr"), userId: user.id, label, city, details };
    db.addresses.push(address);
    return address;
  });

  return NextResponse.json({ address });
}
