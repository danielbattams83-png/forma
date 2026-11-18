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

function readU32(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  let text = "";
  for (let index = start; index < end; index += 1) text += String.fromCharCode(bytes[index] ?? 0);
  return text;
}

export function isModelFile(filename: string, bytes: Uint8Array) {
  const ext = extensionOf(filename);
  if (ext === "glb") {
    return bytes.length >= 4 && readU32(bytes, 0) === 0x46546c67;
  }
  if (ext === "gltf") {
    const start = new TextDecoder().decode(bytes.subarray(0, 64)).trimStart();
    return start.startsWith("{") && new TextDecoder().decode(bytes).includes('"asset"');
  }
  return false;
}

export function imageExtension(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
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
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return "webp";
  }
  return null;
}
