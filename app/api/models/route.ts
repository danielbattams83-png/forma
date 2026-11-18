import { NextResponse } from "next/server";
import { assertOwnedBlobUrl, usesBlobStorage } from "@/lib/blobs";
import { jsonError, requireAdmin } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { cleanText, parseSpan, requireText } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const models = await getRepository().list();
  return NextResponse.json(models, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (!usesBlobStorage()) return jsonError("Direct upload is unavailable.", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Missing model details.", 400);
  }
  if (!body || typeof body !== "object") return jsonError("Missing model details.", 400);
  const source = body as Record<string, unknown>;

  try {
    const polycount = source.polycount == null ? null : Number(source.polycount);
    if (polycount != null && (!Number.isInteger(polycount) || polycount < 0 || polycount > 50_000_000)) {
      throw new Error("Polycount is invalid.");
    }
    const record = await getRepository().create({
      title: requireText(source.title, 80, "Title"),
      description: cleanText(source.description, 600),
      category: requireText(source.category, 40, "Category"),
      span: parseSpan(source.span),
      notes: cleanText(source.notes, 240),
      src: assertOwnedBlobUrl(source.src, "model"),
      thumbnail: assertOwnedBlobUrl(source.thumbnail, "thumb"),
      polycount,
    });
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add the model.";
    return jsonError(message, 400);
  }
}
