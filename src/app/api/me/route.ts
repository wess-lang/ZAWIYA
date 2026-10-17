import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Session-introspection endpoint for decoupled clients (e.g. the Flutter
// mobile app) that can't read the httpOnly session cookie themselves and
// need to ask the server "who am I?" after login, or on cold start.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ user });
}
