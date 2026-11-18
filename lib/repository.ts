import { randomBytes } from "crypto";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import type { ModelInput, ModelPatch, ModelRecord } from "@/lib/types";

/**
 * ModelRepository is the catalog seam.
 * LocalJsonRepository stores data/models.json so the gallery runs
 * without API keys. Swap getRepository() for Supabase by implementing
 * the same methods; the API routes do not know which one they have.
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

async function readAll(): Promise<ModelRecord[]> {
  const raw = await readFile(dataPath, "utf8");
  const parsed = JSON.parse(raw) as ModelRecord[];
  return parsed.sort((a, b) => a.order - b.order);
}

async function writeAll(models: ModelRecord[]) {
  const ordered = models.map((model, order) => ({ ...model, order }));
  await mkdir(path.dirname(dataPath), { recursive: true });
  const temporary = `${dataPath}.tmp`;
  await writeFile(temporary, `${JSON.stringify(ordered, null, 2)}\n`);
  await rename(temporary, dataPath);
  return ordered;
}

let queue: Promise<unknown> = Promise.resolve();

function locked<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export const localRepository: ModelRepository = {
  list() {
    return readAll();
  },
  async get(id) {
    const models = await readAll();
    return models.find((model) => model.id === id) ?? null;
  },
  create(input) {
    return locked(async () => {
      const models = await readAll();
      const record: ModelRecord = {
        id: randomBytes(6).toString("hex"),
        ...input,
        createdAt: new Date().toISOString(),
        order: models.length,
      };
      await writeAll([...models, record]);
      return record;
    });
  },
  update(id, patch) {
    return locked(async () => {
      const models = await readAll();
      const index = models.findIndex((model) => model.id === id);
      if (index === -1) throw new Error("Model not found.");
      const next = { ...models[index], ...patch };
      models[index] = next;
      await writeAll(models);
      return next;
    });
  },
  remove(id) {
    return locked(async () => {
      const models = await readAll();
      const existing = models.find((model) => model.id === id);
      if (!existing) throw new Error("Model not found.");
      await writeAll(models.filter((model) => model.id !== id));
      return existing;
    });
  },
  reorder(ids) {
    return locked(async () => {
      const models = await readAll();
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
      return writeAll(next);
    });
  },
};

export function getRepository(): ModelRepository {
  return localRepository;
}
