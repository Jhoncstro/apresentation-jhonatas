import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createCheckpoint, readCheckpoint } from "@/lib/qaie/checkpoint";
import { gate } from "@/lib/qaie/circuit";
import { QaieEngine } from "@/lib/qaie/engine";
import { EXAMPLES } from "@/lib/qaie/examples";
import { buildNotebook, parseExternalResult } from "@/lib/qaie/notebook";
import { parseQasm } from "@/lib/qaie/qasm";
import { ENVIRONMENTS, recommendEnvironment } from "@/lib/qaie/resources";
import { simplify } from "@/lib/qaie/rewrite";

const example = (id: string) => parseQasm(EXAMPLES.find((e) => e.id === id)?.qasm ?? "");

const hasNumpy = (() => {
  try {
    execFileSync("python3", ["-c", "import numpy"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe("DCRE universal checkpoint", () => {
  it("round-trips with a SHA-256 integrity hash and rejects tampering", async () => {
    const engine = new QaieEngine(example("redundante"), { seed: 4 });
    for (let i = 0; i < 5; i++) engine.step();
    const checkpoint = await createCheckpoint(engine.snapshot(), "navegador");
    const text = JSON.stringify(checkpoint);
    const restored = await readCheckpoint(text);
    expect(restored.verified).toBe(true);
    expect(QaieEngine.restore(restored.snapshot).best.node.id).toBe(engine.best.node.id);
    const tampered = JSON.parse(text);
    tampered.snapshot.nodes[0].cost = 0;
    await expect(readCheckpoint(JSON.stringify(tampered))).rejects.toThrow(/SHA-256/);
  });
});

describe("DCRE distributed evolution", () => {
  it("re-verifies imported candidates and only accepts equivalent ones", () => {
    const original = example("redundante");
    const hub = new QaieEngine(original, { seed: 1 });
    const wrong = { ...original, gates: [...original.gates, gate("x", [0])] };
    expect(hub.importCandidate(wrong, "worker 2").accepted).toBe(false);
    const good = hub.importCandidate(simplify(original), "worker 2");
    expect(good).toMatchObject({ accepted: true, newBest: true });
    expect(hub.best.node.origin).toBe("worker 2");
    expect(hub.importCandidate(simplify(original), "worker 3").accepted).toBe(false);
  });

  it("merges island results so the hub is at least as good as every worker", () => {
    const original = example("cnot-invertido");
    const islands = [11, 12, 13].map((seed) => new QaieEngine(original, { seed }));
    islands.forEach((e) => {
      for (let i = 0; i < 15; i++) e.step();
    });
    const hub = new QaieEngine(original, { seed: 99 });
    islands.forEach((e, k) =>
      hub.importCandidate(
        e.best.circuit,
        `worker ${k}`,
        e.snapshot().elites.find((x) => x.nodeId === e.best.node.id)?.lineage,
      ),
    );
    const bestIsland = Math.min(...islands.map((e) => e.best.node.cost));
    expect(hub.best.node.cost).toBeLessThanOrEqual(bestIsland + 1e-12);
  });

  it("documents real availability and recommends by size", () => {
    expect(ENVIRONMENTS.filter((e) => e.status === "conectado").map((e) => e.id)).toEqual([
      "browser-workers",
      "indexeddb",
      "actions",
    ]);
    expect(recommendEnvironment(4, 20).id).toBe("browser-workers");
    expect(recommendEnvironment(30, 20).id).toBe("kaggle");
  });
});

describe("DCRE notebook package", () => {
  it.skipIf(!hasNumpy)("runs in Python/NumPy and produces an importable result", () => {
    const original = example("toffoli-cascata");
    const engine = new QaieEngine(original, { seed: 2 });
    engine.step();
    const notebook = JSON.parse(buildNotebook(engine.snapshot(), "Teste"));
    const code = notebook.cells
      .filter((c: { cell_type: string }) => c.cell_type === "code")
      .map((c: { source: string[] }) => c.source.join(""))
      .join("\n");
    const dir = mkdtempSync(path.join(tmpdir(), "qaie-"));
    writeFileSync(path.join(dir, "run.py"), code);
    execFileSync("python3", ["run.py"], { cwd: dir, stdio: "pipe" });
    const result = parseExternalResult(readFileSync(path.join(dir, "qaie-result.json"), "utf8"));
    expect(result?.candidates.length).toBeGreaterThan(0);
    const hub = new QaieEngine(original, { seed: 3 });
    for (const c of result?.candidates ?? []) {
      const r = hub.importCandidate(parseQasm(c.qasm), result?.environment ?? "?");
      expect(r.accepted || r.reason === "Candidato já conhecido.").toBe(true);
    }
    expect(hub.best.node.cost).toBeLessThan(1);
  });
});
