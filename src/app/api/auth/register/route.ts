import { NextRequest, NextResponse } from "next/server";
import { mutateDb } from "@/lib/db";
import { createSessionCookie, hashPassword } from "@/lib/auth";
import { newId } from "@/lib/id";
import type { Role } from "@/lib/types";

// FR-01: User Registration & Authentication
export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; password?: string; role?: Role };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const role: Role = body.role === "shop_owner" ? "shop_owner" : "customer";

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required." },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const result = mutateDb((db) => {
    const exists = db.users.some((u) => u.email === email);
    if (exists) return { error: "An account with this email already exists." as const };

    const user = {
      id: newId("usr"),
      name,
      email,
      passwordHash: hashPassword(password),
      role,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    return { userId: user.id };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  await createSessionCookie(result.userId);
  return NextResponse.json({ ok: true });
}
