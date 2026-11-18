import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { authenticated: await isAuthed() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
