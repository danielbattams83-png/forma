import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { usesBlobStorage } from "@/lib/blobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { authenticated: await isAuthed(), storage: usesBlobStorage() ? "blob" : "local" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
