import { NextResponse } from "next/server";
import { getBlobs } from "@/lib/blobs";
import { jsonError, requireAdmin } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { parsePatch } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Missing model details.", 400);
  }

  try {
    const model = await getRepository().update(id, parsePatch(body));
    return NextResponse.json(model);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the model.";
    const status = message === "Model not found." ? 404 : 400;
    return jsonError(message, status);
  }
}

export async function DELETE(request: Request, context: Context) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const { id } = await context.params;

  try {
    const removed = await getRepository().remove(id);
    const blobs = getBlobs();
    await blobs.remove(removed.src).catch(() => undefined);
    await blobs.remove(removed.thumbnail).catch(() => undefined);
    const models = await getRepository().list();
    return NextResponse.json(models);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete the model.";
    const status = message === "Model not found." ? 404 : 400;
    return jsonError(message, status);
  }
}
