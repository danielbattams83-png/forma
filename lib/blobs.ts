import { del, put } from "@vercel/blob";
import { randomBytes } from "crypto";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";

/**
 * BlobStore is the file seam. LocalDisk writes into /public so the
 * dev server can serve a model immediately. When BLOB_READ_WRITE_TOKEN
 * is set, files go to Vercel Blob and the browser can upload them
 * directly. An S3 adapter can implement the same two saves and remove.
 */
export type SavedBlob = { publicPath: string };

export interface BlobStore {
  saveModel(bytes: Buffer, extension: "glb" | "gltf"): Promise<SavedBlob>;
  saveThumb(bytes: Buffer, extension: "jpg" | "png" | "webp"): Promise<SavedBlob>;
  remove(publicPath: string): Promise<void>;
}

const PUBLIC_PREFIXES = ["/uploads/", "/samples/"];

const CONTENT_TYPES = {
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export function blobStoreHost() {
  const token = process.env.BLOB_READ_WRITE_TOKEN ?? "";
  const id = token.match(/^vercel_blob_rw_([A-Za-z0-9]+)_/)?.[1];
  return id ? `${id.toLowerCase()}.public.blob.vercel-storage.com` : null;
}

export function usesBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function assertOwnedBlobUrl(value: unknown, kind: "model" | "thumb") {
  if (typeof value !== "string" || value.length > 500) throw new Error("Invalid file.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid file.");
  }
  const host = blobStoreHost();
  if (!host || url.protocol !== "https:" || url.hostname.toLowerCase() !== host || url.username || url.password) {
    throw new Error("Invalid file.");
  }
  const pattern =
    kind === "model"
      ? /^\/uploads\/models\/[A-Za-z0-9._-]+\.(glb|gltf)$/
      : /^\/uploads\/thumbs\/[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/;
  if (!pattern.test(url.pathname)) throw new Error(kind === "model" ? "Invalid model file." : "Invalid thumbnail.");
  return `https://${host}${url.pathname}`;
}

function publicRoot() {
  return path.resolve(process.cwd(), "public");
}

function resolvePublic(publicPath: string) {
  if (!publicPath.startsWith("/") || publicPath.includes("\0")) {
    throw new Error("Invalid file path.");
  }
  if (!PUBLIC_PREFIXES.some((prefix) => publicPath.startsWith(prefix))) {
    throw new Error("Invalid file path.");
  }
  const absolute = path.resolve(publicRoot(), `.${publicPath}`);
  const root = publicRoot();
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid file path.");
  }
  return absolute;
}

async function writePublic(folder: string, extension: string, bytes: Buffer) {
  const id = randomBytes(8).toString("hex");
  const filename = `${id}.${extension}`;
  const directory = path.join(publicRoot(), folder);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes);
  return { publicPath: `/${folder}/${filename}` };
}

export const localBlobs: BlobStore = {
  saveModel(bytes, extension) {
    return writePublic("uploads/models", extension, bytes);
  },
  saveThumb(bytes, extension) {
    return writePublic("uploads/thumbs", extension, bytes);
  },
  async remove(publicPath) {
    if (/^https?:\/\//i.test(publicPath)) return;
    await rm(resolvePublic(publicPath), { force: true });
  },
};

async function putPublic(folder: string, extension: keyof typeof CONTENT_TYPES, bytes: Buffer) {
  const id = randomBytes(8).toString("hex");
  const blob = await put(`${folder}/${id}.${extension}`, bytes, {
    access: "public",
    addRandomSuffix: false,
    contentType: CONTENT_TYPES[extension],
  });
  return { publicPath: blob.url };
}

export const vercelBlobs: BlobStore = {
  saveModel(bytes, extension) {
    return putPublic("uploads/models", extension, bytes);
  },
  saveThumb(bytes, extension) {
    return putPublic("uploads/thumbs", extension, bytes);
  },
  async remove(publicPath) {
    const host = blobStoreHost();
    if (!host) return;
    try {
      const url = new URL(publicPath);
      if (url.protocol !== "https:" || url.hostname.toLowerCase() !== host) return;
    } catch {
      return;
    }
    await del(publicPath);
  },
};

export function getBlobs(): BlobStore {
  return usesBlobStorage() ? vercelBlobs : localBlobs;
}
