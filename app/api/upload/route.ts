import { NextResponse } from "next/server";
import { getBlobs } from "@/lib/blobs";
import { jsonError, requireAdmin } from "@/lib/http";
import { polycountFromGlb, polycountFromGltf } from "@/lib/polycount";
import { getRepository } from "@/lib/repository";
import {
  MAX_MODEL_BYTES,
  MAX_THUMB_BYTES,
  cleanText,
  extensionOf,
  imageExtension,
  isModelFile,
  parseSpan,
  requireText,
} from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fileBytes(value: FormDataEntryValue | null, label: string, max: number) {
  if (!(value instanceof File)) throw new Error(`${label} is required.`);
  if (value.size <= 0) throw new Error(`${label} is empty.`);
  if (value.size > max) throw new Error(`${label} is too large.`);
  return { file: value, bytes: Buffer.from(await value.arrayBuffer()) };
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Upload could not be read.", 400);
  }

  const blobs = getBlobs();
  let modelPath: string | null = null;
  let thumbPath: string | null = null;

  try {
    const modelFile = await fileBytes(form.get("file"), "Model", MAX_MODEL_BYTES);
    const thumbFile = await fileBytes(form.get("thumbnail"), "Thumbnail", MAX_THUMB_BYTES);
    const modelExt = extensionOf(modelFile.file.name);
    if (modelExt !== "glb" && modelExt !== "gltf") {
      throw new Error("Use a .glb or .gltf file.");
    }
    if (!isModelFile(modelFile.file.name, modelFile.bytes)) {
      throw new Error("That file does not look like a glTF model.");
    }
    const thumbExt = imageExtension(thumbFile.bytes);
    if (!thumbExt) throw new Error("Thumbnail must be a JPEG, PNG, or WebP.");

    const savedModel = await blobs.saveModel(modelFile.bytes, modelExt);
    modelPath = savedModel.publicPath;
    const savedThumb = await blobs.saveThumb(thumbFile.bytes, thumbExt);
    thumbPath = savedThumb.publicPath;

    const polycount =
      modelExt === "glb"
        ? polycountFromGlb(modelFile.bytes)
        : polycountFromGltf(modelFile.bytes.toString("utf8"));

    const record = await getRepository().create({
      title: requireText(form.get("title"), 80, "Title"),
      description: cleanText(form.get("description"), 600),
      category: requireText(form.get("category"), 40, "Category"),
      span: parseSpan(form.get("span")),
      notes: cleanText(form.get("notes"), 240),
      src: modelPath,
      thumbnail: thumbPath,
      polycount,
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    if (modelPath) await blobs.remove(modelPath).catch(() => undefined);
    if (thumbPath) await blobs.remove(thumbPath).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Could not add the model.";
    return jsonError(message, 400);
  }
}
