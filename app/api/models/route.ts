import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const models = await getRepository().list();
  return NextResponse.json(models, { headers: { "Cache-Control": "no-store" } });
}
