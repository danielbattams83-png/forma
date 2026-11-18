import { NextResponse } from "next/server";
import { isAuthed, sameOrigin } from "@/lib/auth";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireAdmin(request: Request) {
  if (!sameOrigin(request)) return jsonError("Forbidden", 403);
  if (!(await isAuthed())) return jsonError("Unauthorized", 401);
  return null;
}
