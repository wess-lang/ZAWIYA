import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { readDb } from "./db";
import type { User } from "./types";

const COOKIE_NAME = "zawiya_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function secretKey() {
  const secret =
    process.env.JWT_SECRET ??
    "dev-only-insecure-secret-change-me-in-production";
  return new TextEncoder().encode(secret);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export async function createSessionCookie(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

async function currentUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export type SafeUser = Omit<User, "passwordHash">;

/** Returns the signed-in user (without the password hash), or null. */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const id = await currentUserId();
  if (!id) return null;
  const db = readDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) return null;
  const { passwordHash: _passwordHash, ...safe } = user;
  void _passwordHash;
  return safe;
}

export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Not signed in");
  return user;
}

export class AuthError extends Error {}
