import { NextResponse } from "next/server";
import { jsonError, requireAdmin } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Missing order.", 400);
  }

  const ids = (body as { ids?: unknown }).ids;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return jsonError("Missing order.", 400);
  }

  try {
    const models = await getRepository().reorder(ids);
    return NextResponse.json(models);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reorder models.";
    return jsonError(message, 400);
  }
}
