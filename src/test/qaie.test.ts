import { describe, expect, it } from "vitest";
import { circuitHash, gate, type Circuit } from "@/lib/qaie/circuit";
import { QaieEngine } from "@/lib/qaie/engine";
import { EXAMPLES } from "@/lib/qaie/examples";
import { computeMetrics, paretoFront } from "@/lib/qaie/metrics";
import { parseCircuit, parseQasm, toQasm } from "@/lib/qaie/qasm";
import { RULES, applySite, replay, simplify } from "@/lib/qaie/rewrite";
import { verifyEquivalence } from "@/lib/qaie/verify";

const example = (id: string) => parseQasm(EXAMPLES.find((e) => e.id === id)?.qasm ?? "");

describe("QAIE circuit I/O", () => {
  it("round-trips OpenQASM and JSON", () => {
    const circuit = example("redundante");
    expect(parseQasm(toQasm(circuit))).toEqual(circuit);
    expect(parseCircuit(JSON.stringify(circuit), "c.json")).toEqual(circuit);
  });

  it("rejects unsupported or unsafe input", () => {
    expect(() => parseQasm("qreg q[1];\nU(alert(1),0,0) q[0];")).toThrow();
    expect(() => parseQasm("qreg q[1];\ncx q[0],q[0];")).toThrow();
    expect(() => parseQasm("qreg q[1];\nrz(pi) q[3];")).toThrow();
  });
});

describe("QAIE metrics", () => {
  it("counts T, depth and two-qubit gates", () => {
    const m = computeMetrics({
      numQubits: 2,
      gates: [gate("t", [0]), gate("cx", [0, 1]), gate("t", [1]), gate("rz", [0], [Math.PI / 4])],
    });
    expect(m).toMatchObject({ tCount: 3, tDepth: 2, depth: 3, twoQubitCount: 1 });
  });

  it("keeps only non-dominated candidates on the Pareto front", () => {
    const base = computeMetrics({ numQubits: 1, gates: [] });
    const items = [
      { id: "a", metrics: { ...base, tCount: 1, twoQubitCount: 5, depth: 5 } },
      { id: "b", metrics: { ...base, tCount: 5, twoQubitCount: 1, depth: 5 } },
      { id: "c", metrics: { ...base, tCount: 6, twoQubitCount: 6, depth: 6 } },
    ];
    expect(paretoFront(items).map((i) => i.id)).toEqual(["a", "b"]);
  });
});

describe("QAIE verification", () => {
  it("accepts global-phase equivalence and rejects different unitaries", () => {
    const a: Circuit = { numQubits: 1, gates: [gate("rz", [0], [Math.PI / 2])] };
    const b: Circuit = { numQubits: 1, gates: [gate("s", [0])] };
    const c: Circuit = { numQubits: 1, gates: [gate("t", [0])] };
    expect(verifyEquivalence(a, b).equivalent).toBe(true);
    expect(verifyEquivalence(a, c).equivalent).toBe(false);
  });

  it("detects relative-phase differences in exact mode", () => {
    const a: Circuit = { numQubits: 2, gates: [gate("cz", [0, 1])] };
    const b: Circuit = { numQubits: 2, gates: [] };
    expect(verifyEquivalence(a, b).equivalent).toBe(false);
  });

  it("uses random-state testing above the exact limit", () => {
    const circuit = example("toffoli-cascata");
    const result = verifyEquivalence(circuit, simplify(circuit), { exactMaxQubits: 3 });
    expect(result).toMatchObject({ equivalent: true, method: "estados aleatórios" });
    const broken = { ...circuit, gates: circuit.gates.slice(1) };
    expect(verifyEquivalence(circuit, broken, { exactMaxQubits: 3 }).equivalent).toBe(false);
  });
});

describe("QAIE rewriting", () => {
  it("simplifies while preserving the unitary", () => {
    for (const { id } of EXAMPLES) {
      const circuit = example(id);
      const simplified = simplify(circuit);
      expect(simplified.gates.length).toBeLessThan(circuit.gates.length);
      expect(verifyEquivalence(circuit, simplified).equivalent).toBe(true);
    }
  });

  it("every rewrite rule site is an exact identity", () => {
    for (const { id } of EXAMPLES) {
      const circuit = example(id);
      for (const rule of RULES) {
        for (const site of rule.sites(circuit.gates)) {
          const { circuit: moved, transformation } = applySite(circuit, rule, site);
          expect(verifyEquivalence(circuit, moved).equivalent, `${rule.name} em ${id}`).toBe(true);
          expect(replay(circuit, transformation)).toBeDefined();
        }
      }
    }
  });
});

describe("QAIE engine", () => {
  it("never regresses the best validated cost and is reproducible", () => {
    const run = () => {
      const engine = new QaieEngine(example("cnot-invertido"), { seed: 11 });
      let previous = engine.best.node.cost;
      for (let i = 0; i < 30; i++) {
        engine.step();
        expect(engine.best.node.cost).toBeLessThanOrEqual(previous);
        previous = engine.best.node.cost;
      }
      return engine;
    };
    const a = run();
    const b = run();
    expect(a.snapshot().nodes[0]?.cost).toBe(1);
    expect(a.best.node.cost).toBeLessThan(1);
    expect(circuitHash(a.best.circuit)).toBe(circuitHash(b.best.circuit));
    expect(verifyEquivalence(example("cnot-invertido"), a.best.circuit).equivalent).toBe(true);
    const snapshot = a.snapshot();
    expect(Object.values(snapshot.stats).reduce((n, s) => n + s.pulls, 0)).toBe(30);
    expect(snapshot.nodes.every((n) => n.id === "g0" || n.parentIds.length > 0)).toBe(true);
  });

  it("restores from a checkpoint and continues", () => {
    const engine = new QaieEngine(example("redundante"), { seed: 3 });
    for (let i = 0; i < 10; i++) engine.step();
    const restored = QaieEngine.restore(JSON.parse(JSON.stringify(engine.snapshot())));
    expect(restored.best.node.id).toBe(engine.best.node.id);
    restored.step();
    expect(restored.snapshot().iteration).toBe(11);
  });

  it("never admits a candidate that fails verification", () => {
    const circuit = example("redundante");
    const engine = new QaieEngine(circuit, {
      seed: 5,
      verification: { exactMaxQubits: 0, sampledMaxQubits: 0 },
    });
    for (let i = 0; i < 5; i++) expect(engine.step().valid).toBe(false);
    expect(engine.best.node.id).toBe("g0");
    expect(engine.snapshot().elites).toHaveLength(1);
  });
});

describe("QAIE memory export", () => {
  it("builds linked Obsidian notes and a valid ZIP", async () => {
    const { buildVault } = await import("@/lib/qaie/obsidian");
    const { createZip } = await import("@/lib/qaie/zip");
    const engine = new QaieEngine(example("redundante"), { seed: 1 });
    for (let i = 0; i < 8; i++) engine.step();
    const files = buildVault("Teste", engine.snapshot());
    const index = files.find((f) => f.path === "QAIE/Teste/Índice.md");
    expect(index?.content).toContain(`[[${engine.best.node.id}]]`);
    expect(index?.content).toContain("Não é uma pontuação oficial");
    expect(files.some((f) => f.path === `QAIE/Teste/Candidatos/${engine.best.node.id}.md`)).toBe(
      true,
    );
    const zip = createZip(files);
    const view = new DataView(zip.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(zip.length - 12, true)).toBe(files.length);
  });
});
