import { randomBytes } from "crypto";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";

/**
 * BlobStore is the file seam. LocalDisk writes into /public so the
 * dev server can serve a model immediately. An S3 or Supabase Storage
 * adapter can implement the same two saves and the same remove.
 */
export type SavedBlob = { publicPath: string };

export interface BlobStore {
  saveModel(bytes: Buffer, extension: "glb" | "gltf"): Promise<SavedBlob>;
  saveThumb(bytes: Buffer, extension: "jpg" | "png" | "webp"): Promise<SavedBlob>;
  remove(publicPath: string): Promise<void>;
}

const PUBLIC_PREFIXES = ["/uploads/", "/samples/"];

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
    await rm(resolvePublic(publicPath), { force: true });
  },
};

export function getBlobs(): BlobStore {
  return localBlobs;
}
