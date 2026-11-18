import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "forma_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const attempts = new Map<string, { count: number; resetAt: number }>();

export function getAdminPassword() {
  const configured = process.env.ADMIN_PASSWORD?.trim();
  return configured || null;
}

export function passwordsMatch(input: string, expected: string) {
  const left = Buffer.from(input);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function createSessionToken() {
  const password = getAdminPassword();
  if (!password) return null;
  const payload = String(Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS);
  const signature = createHmac("sha256", password).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null) {
  const password = getAdminPassword();
  if (!password || !token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expires = Number(payload);
  if (!Number.isFinite(expires) || expires < Date.now() / 1000) return false;
  const expected = createHmac("sha256", password).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function isAuthed() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export function registerLoginFailure(ip: string) {
  const now = Date.now();
  const current = attempts.get(ip);
  if (!current || current.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return false;
  }
  current.count += 1;
  return current.count > 8;
}

export function clearLoginFailures(ip: string) {
  attempts.delete(ip);
}

export function loginBlocked(ip: string) {
  const current = attempts.get(ip);
  if (!current) return false;
  if (current.resetAt < Date.now()) {
    attempts.delete(ip);
    return false;
  }
  return current.count > 8;
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "local";
  return "local";
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
