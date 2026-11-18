import { BlobNotFoundError, head, put } from "@vercel/blob";
import { randomBytes } from "crypto";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { usesBlobStorage } from "@/lib/blobs";
import type { ModelInput, ModelPatch, ModelRecord } from "@/lib/types";

/**
 * ModelRepository is the catalog seam.
 * Without a blob token it stores data/models.json. With
 * BLOB_READ_WRITE_TOKEN the same methods read and write a catalog
 * object in Vercel Blob, so admin changes survive a serverless deploy.
 */
export interface ModelRepository {
  list(): Promise<ModelRecord[]>;
  get(id: string): Promise<ModelRecord | null>;
  create(input: ModelInput): Promise<ModelRecord>;
  update(id: string, patch: ModelPatch): Promise<ModelRecord>;
  remove(id: string): Promise<ModelRecord>;
  reorder(ids: string[]): Promise<ModelRecord[]>;
}

const dataPath = path.join(process.cwd(), "data", "models.json");
const CATALOG_PATH = "catalog/models.json";

function sortModels(models: ModelRecord[]) {
  return models.slice().sort((a, b) => a.order - b.order);
}

async function readSeed(): Promise<ModelRecord[]> {
  const raw = await readFile(dataPath, "utf8");
  const parsed = JSON.parse(raw) as ModelRecord[];
  if (!Array.isArray(parsed)) throw new Error("Could not read the catalog.");
  return sortModels(parsed);
}

type CatalogIO = {
  read(): Promise<ModelRecord[]>;
  write(models: ModelRecord[]): Promise<ModelRecord[]>;
};

let queue: Promise<unknown> = Promise.resolve();

function locked<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function createRepository(io: CatalogIO): ModelRepository {
  return {
    list() {
      return io.read();
    },
    async get(id) {
      const models = await io.read();
      return models.find((model) => model.id === id) ?? null;
    },
    create(input) {
      return locked(async () => {
        const models = await io.read();
        const record: ModelRecord = {
          id: randomBytes(6).toString("hex"),
          ...input,
          createdAt: new Date().toISOString(),
          order: models.length,
        };
        await io.write([...models, record]);
        return record;
      });
    },
    update(id, patch) {
      return locked(async () => {
        const models = await io.read();
        const index = models.findIndex((model) => model.id === id);
        if (index === -1) throw new Error("Model not found.");
        const next = { ...models[index], ...patch };
        models[index] = next;
        await io.write(models);
        return next;
      });
    },
    remove(id) {
      return locked(async () => {
        const models = await io.read();
        const existing = models.find((model) => model.id === id);
        if (!existing) throw new Error("Model not found.");
        await io.write(models.filter((model) => model.id !== id));
        return existing;
      });
    },
    reorder(ids) {
      return locked(async () => {
        const models = await io.read();
        if (ids.length !== models.length || new Set(ids).size !== ids.length) {
          throw new Error("Reorder must include every model once.");
        }
        const byId = new Map(models.map((model) => [model.id, model]));
        const next: ModelRecord[] = [];
        for (const id of ids) {
          const model = byId.get(id);
          if (!model) throw new Error("Reorder must include every model once.");
          next.push(model);
        }
        return io.write(next);
      });
    },
  };
}

const localCatalog: CatalogIO = {
  read: readSeed,
  async write(models) {
    const ordered = models.map((model, order) => ({ ...model, order }));
    await mkdir(path.dirname(dataPath), { recursive: true });
    const temporary = `${dataPath}.tmp`;
    await writeFile(temporary, `${JSON.stringify(ordered, null, 2)}\n`);
    await rename(temporary, dataPath);
    return ordered;
  },
};

async function readBlobCatalog(): Promise<ModelRecord[]> {
  let meta;
  try {
    meta = await head(CATALOG_PATH);
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return writeBlobCatalog(await readSeed());
    }
    throw error;
  }
  // A unique query skips the Blob CDN cache, which otherwise holds a public
  // object for at least a minute. The catalog itself is the same data the gallery API returns.
  const response = await fetch(`${meta.url}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not read the catalog.");
  const parsed = JSON.parse(await response.text()) as ModelRecord[];
  if (!Array.isArray(parsed)) throw new Error("Could not read the catalog.");
  return sortModels(parsed);
}

async function writeBlobCatalog(models: ModelRecord[]) {
  const ordered = models.map((model, order) => ({ ...model, order }));
  await put(CATALOG_PATH, JSON.stringify(ordered), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  return ordered;
}

const blobCatalog: CatalogIO = {
  read: readBlobCatalog,
  write: writeBlobCatalog,
};

const localRepository = createRepository(localCatalog);
const blobRepository = createRepository(blobCatalog);

export function getRepository(): ModelRepository {
  return usesBlobStorage() ? blobRepository : localRepository;
}
