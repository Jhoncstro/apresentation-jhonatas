import { circuitHash } from "./circuit";
import type { EngineSnapshot } from "./engine";

export const ENGINE_VERSION = "qaie-ts-1.0.0";
export const CHECKPOINT_FORMAT = "qaie-checkpoint";

export interface UniversalCheckpoint {
  format: typeof CHECKPOINT_FORMAT;
  version: 1;
  createdAt: string;
  environment: string;
  dependencies: Record<string, string>;
  originalHash: string;
  bestId: string;
  bestCost: number;
  snapshot: EngineSnapshot;
  integrity: { algorithm: "SHA-256"; hash: string };
}

/** Deterministic JSON (sorted keys) so the hash does not depend on property order. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createCheckpoint(
  snapshot: EngineSnapshot,
  environment: string,
): Promise<UniversalCheckpoint> {
  const body = {
    format: CHECKPOINT_FORMAT as typeof CHECKPOINT_FORMAT,
    version: 1 as const,
    createdAt: new Date().toISOString(),
    environment,
    dependencies: { engine: ENGINE_VERSION, snapshotSchema: String(snapshot.version) },
    originalHash: circuitHash(snapshot.original),
    bestId: snapshot.bestId,
    bestCost: snapshot.nodes.find((n) => n.id === snapshot.bestId)?.cost ?? 1,
    snapshot,
  };
  return { ...body, integrity: { algorithm: "SHA-256", hash: await sha256(canonicalJson(body)) } };
}

/** Parses a universal checkpoint (or a bare snapshot from older exports) and checks its integrity hash. */
export async function readCheckpoint(
  text: string,
): Promise<{ snapshot: EngineSnapshot; verified: boolean; environment?: string }> {
  const data = JSON.parse(text) as Partial<UniversalCheckpoint> & Partial<EngineSnapshot>;
  if (data.format === CHECKPOINT_FORMAT) {
    const { integrity, ...body } = data as UniversalCheckpoint;
    if (!integrity || (await sha256(canonicalJson(body))) !== integrity.hash) {
      throw new Error("Checkpoint corrompido ou alterado: hash SHA-256 não confere.");
    }
    if (circuitHash(body.snapshot.original) !== body.originalHash)
      throw new Error("Circuito original não confere com o checkpoint.");
    return { snapshot: body.snapshot, verified: true, environment: body.environment };
  }
  if (data.version === 1 && data.original && data.bestId)
    return { snapshot: data as EngineSnapshot, verified: false };
  throw new Error("Arquivo não é um checkpoint do QAIE.");
}
