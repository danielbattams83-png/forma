import { isSpan, type ModelPatch, type Span } from "@/lib/types";

export const MAX_MODEL_BYTES = 64 * 1024 * 1024;
export const MAX_THUMB_BYTES = 8 * 1024 * 1024;

const CONTROL = /[\u0000-\u001F\u007F]/g;

export function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function requireText(value: unknown, max: number, label: string) {
  const text = cleanText(value, max);
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

export function parseSpan(value: unknown): Span {
  if (!isSpan(value)) throw new Error("Choose a grid size of 1x1, 2x1, or 2x2.");
  return value;
}

export function parsePatch(body: unknown): ModelPatch {
  if (!body || typeof body !== "object") throw new Error("Missing model details.");
  const source = body as Record<string, unknown>;
  const patch: ModelPatch = {};
  if ("title" in source) patch.title = requireText(source.title, 80, "Title");
  if ("description" in source) patch.description = cleanText(source.description, 600);
  if ("category" in source) patch.category = requireText(source.category, 40, "Category");
  if ("notes" in source) patch.notes = cleanText(source.notes, 240);
  if ("span" in source) patch.span = parseSpan(source.span);
  if (Object.keys(patch).length === 0) throw new Error("Nothing to update.");
  return patch;
}

export function extensionOf(filename: string) {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

export function isModelFile(filename: string, bytes: Buffer) {
  const ext = extensionOf(filename);
  if (ext === "glb") {
    return bytes.length >= 4 && bytes.readUInt32LE(0) === 0x46546c67;
  }
  if (ext === "gltf") {
    const start = bytes.subarray(0, 64).toString("utf8").trimStart();
    return start.startsWith("{") && bytes.includes(Buffer.from('"asset"'));
  }
  return false;
}

export function imageExtension(bytes: Buffer): "jpg" | "png" | "webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}
