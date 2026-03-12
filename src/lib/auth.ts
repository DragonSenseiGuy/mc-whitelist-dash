import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "fallback-secret-change-me";
const COOKIE_NAME = "mc_admin_token";
const TOKEN_EXPIRY = "7d";

export function signToken(payload: { email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): { email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { email: string };
  } catch {
    return null;
  }
}

export function createAuthCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}

export function getAuthCookie(): string | undefined {
  return cookies().get(COOKIE_NAME)?.value;
}

export function clearAuthCookie() {
  cookies().delete(COOKIE_NAME);
}

export function isAuthenticated(): boolean {
  const token = getAuthCookie();
  if (!token) return false;
  return verifyToken(token) !== null;
}
