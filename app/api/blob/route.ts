import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isAuthed, sameOrigin } from "@/lib/auth";
import { MAX_MODEL_BYTES, MAX_THUMB_BYTES } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL_TYPES = ["model/gltf-binary", "model/gltf+json", "application/octet-stream"];
const THUMB_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Missing upload." }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!sameOrigin(request)) throw new Error("Forbidden");
        if (!(await isAuthed())) throw new Error("Unauthorized");
        const model = pathname.startsWith("uploads/models/");
        const thumb = pathname.startsWith("uploads/thumbs/");
        if (!model && !thumb) throw new Error("Invalid upload path.");
        return {
          allowedContentTypes: model ? MODEL_TYPES : THUMB_TYPES,
          maximumSizeInBytes: model ? MAX_MODEL_BYTES : MAX_THUMB_BYTES,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // The catalog row is written by the signed-in follow-up request.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start the upload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
