import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  clearLoginFailures,
  clientIp,
  createSessionToken,
  getAdminPassword,
  loginBlocked,
  passwordsMatch,
  registerLoginFailure,
  sameOrigin,
  sessionCookieOptions,
} from "@/lib/auth";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Forbidden", 403);
  const password = getAdminPassword();
  if (!password) {
    return jsonError("Set ADMIN_PASSWORD before signing in.", 503);
  }

  const ip = clientIp(request);
  if (loginBlocked(ip)) {
    return jsonError("Too many attempts. Wait a few minutes and try again.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Enter the studio password.", 400);
  }
  const input = typeof (body as { password?: unknown })?.password === "string"
    ? (body as { password: string }).password
    : "";

  if (!passwordsMatch(input, password)) {
    const blocked = registerLoginFailure(ip);
    return jsonError(
      blocked ? "Too many attempts. Wait a few minutes and try again." : "Wrong password.",
      blocked ? 429 : 401,
    );
  }

  clearLoginFailures(ip);
  const token = createSessionToken();
  if (!token) return jsonError("Set ADMIN_PASSWORD before signing in.", 503);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
