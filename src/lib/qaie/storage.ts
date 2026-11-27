import type { EngineSnapshot } from "./engine";

const DB_NAME = "qaie-laboratorio";
const DB_VERSION = 1;
const MAX_CHECKPOINTS_PER_RUN = 20;

export interface RunRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  iteration: number;
  bestCost: number;
  snapshot: EngineSnapshot;
}

export interface CheckpointRecord {
  id?: number;
  runId: string;
  createdAt: number;
  iteration: number;
  bestCost: number;
  snapshot: EngineSnapshot;
}

export const storageAvailable = () => typeof indexedDB !== "undefined";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("runs")) db.createObjectStore("runs", { keyPath: "id" });
      if (!db.objectStoreNames.contains("checkpoints")) {
        db.createObjectStore("checkpoints", { keyPath: "id", autoIncrement: true }).createIndex(
          "runId",
          "runId",
        );
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function tx<T>(
  stores: string[],
  mode: IDBTransactionMode,
  body: (t: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const db = await open();
  try {
    const transaction = db.transaction(stores, mode);
    const done = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    const result = await body(transaction);
    await done;
    return result;
  } finally {
    db.close();
  }
}

const req = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const bestCostOf = (snapshot: EngineSnapshot) =>
  snapshot.nodes.find((n) => n.id === snapshot.bestId)?.cost ?? 1;

export async function saveRun(
  id: string,
  name: string,
  snapshot: EngineSnapshot,
  createdAt = Date.now(),
): Promise<void> {
  const record: RunRecord = {
    id,
    name,
    createdAt,
    updatedAt: Date.now(),
    iteration: snapshot.iteration,
    bestCost: bestCostOf(snapshot),
    snapshot,
  };
  await tx(["runs"], "readwrite", (t) => req(t.objectStore("runs").put(record)));
}

export async function listRuns(): Promise<Omit<RunRecord, "snapshot">[]> {
  const runs = await tx(["runs"], "readonly", (t) =>
    req(t.objectStore("runs").getAll() as IDBRequest<RunRecord[]>),
  );
  return runs
    .map(({ snapshot: _snapshot, ...rest }) => rest)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export const loadRun = (id: string) =>
  tx(["runs"], "readonly", (t) =>
    req(t.objectStore("runs").get(id) as IDBRequest<RunRecord | undefined>),
  );

export async function deleteRun(id: string): Promise<void> {
  await tx(["runs", "checkpoints"], "readwrite", async (t) => {
    t.objectStore("runs").delete(id);
    const keys = await req(t.objectStore("checkpoints").index("runId").getAllKeys(id));
    keys.forEach((key) => t.objectStore("checkpoints").delete(key));
  });
}

export async function saveCheckpoint(runId: string, snapshot: EngineSnapshot): Promise<void> {
  await tx(["checkpoints"], "readwrite", async (t) => {
    const store = t.objectStore("checkpoints");
    store.add({
      runId,
      createdAt: Date.now(),
      iteration: snapshot.iteration,
      bestCost: bestCostOf(snapshot),
      snapshot,
    } satisfies CheckpointRecord);
    const keys = (await req(store.index("runId").getAllKeys(runId))) as number[];
    keys
      .sort((a, b) => a - b)
      .slice(0, Math.max(0, keys.length - MAX_CHECKPOINTS_PER_RUN))
      .forEach((key) => store.delete(key));
  });
}

export async function listCheckpoints(
  runId: string,
): Promise<Omit<CheckpointRecord, "snapshot">[]> {
  const records = await tx(["checkpoints"], "readonly", (t) =>
    req(
      t.objectStore("checkpoints").index("runId").getAll(runId) as IDBRequest<CheckpointRecord[]>,
    ),
  );
  return records
    .map(({ snapshot: _snapshot, ...rest }) => rest)
    .sort((a, b) => b.iteration - a.iteration);
}

export const loadCheckpoint = (id: number) =>
  tx(["checkpoints"], "readonly", (t) =>
    req(t.objectStore("checkpoints").get(id) as IDBRequest<CheckpointRecord | undefined>),
  );
