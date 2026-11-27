export type GateName =
  | "h"
  | "x"
  | "y"
  | "z"
  | "s"
  | "sdg"
  | "t"
  | "tdg"
  | "rx"
  | "ry"
  | "rz"
  | "cx"
  | "cz"
  | "swap"
  | "ccx";

export interface Gate {
  name: GateName;
  qubits: number[];
  params?: number[];
}

export interface Circuit {
  numQubits: number;
  gates: Gate[];
}

export const GATE_ARITY: Record<GateName, number> = {
  h: 1,
  x: 1,
  y: 1,
  z: 1,
  s: 1,
  sdg: 1,
  t: 1,
  tdg: 1,
  rx: 1,
  ry: 1,
  rz: 1,
  cx: 2,
  cz: 2,
  swap: 2,
  ccx: 3,
};

export const PARAMETRIC: ReadonlySet<GateName> = new Set(["rx", "ry", "rz"]);
const SELF_INVERSE: ReadonlySet<GateName> = new Set([
  "h",
  "x",
  "y",
  "z",
  "cx",
  "cz",
  "swap",
  "ccx",
]);
const SYMMETRIC: ReadonlySet<GateName> = new Set(["cz", "swap"]);
const Z_PHASE_STEP: Partial<Record<GateName, number>> = { z: 4, s: 2, sdg: 6, t: 1, tdg: 7 };

const TWO_PI = 2 * Math.PI;
export const ANGLE_EPSILON = 1e-9;

export function normalizeAngle(angle: number): number {
  const reduced = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  return reduced > TWO_PI - ANGLE_EPSILON ? 0 : reduced;
}

export function gate(name: GateName, qubits: number[], params?: number[]): Gate {
  return params ? { name, qubits, params } : { name, qubits };
}

export function cloneCircuit(circuit: Circuit): Circuit {
  return { numQubits: circuit.numQubits, gates: circuit.gates.map(cloneGate) };
}

export function cloneGate(g: Gate): Gate {
  return g.params
    ? { name: g.name, qubits: [...g.qubits], params: [...g.params] }
    : { name: g.name, qubits: [...g.qubits] };
}

export function validateCircuit(circuit: Circuit): void {
  if (!Number.isInteger(circuit.numQubits) || circuit.numQubits < 1) {
    throw new Error("O circuito precisa de pelo menos 1 qubit.");
  }
  for (const g of circuit.gates) {
    if (!(g.name in GATE_ARITY)) throw new Error(`Porta não suportada: ${g.name}.`);
    if (g.qubits.length !== GATE_ARITY[g.name]) throw new Error(`Aridade inválida em ${g.name}.`);
    if (new Set(g.qubits).size !== g.qubits.length)
      throw new Error(`Qubits repetidos em ${g.name}.`);
    for (const q of g.qubits) {
      if (!Number.isInteger(q) || q < 0 || q >= circuit.numQubits) {
        throw new Error(`Qubit fora do registrador em ${g.name}: ${q}.`);
      }
    }
    if (
      PARAMETRIC.has(g.name) &&
      (!g.params || g.params.length !== 1 || !Number.isFinite(g.params[0]))
    ) {
      throw new Error(`Ângulo inválido em ${g.name}.`);
    }
  }
}

export function sameQubits(a: Gate, b: Gate): boolean {
  if (a.qubits.length !== b.qubits.length) return false;
  if (SYMMETRIC.has(a.name)) {
    return a.qubits.every((q) => b.qubits.includes(q));
  }
  if (a.name === "ccx") {
    return (
      a.qubits[2] === b.qubits[2] &&
      a.qubits.slice(0, 2).every((q) => b.qubits.slice(0, 2).includes(q))
    );
  }
  return a.qubits.every((q, i) => q === b.qubits[i]);
}

export function sharesQubit(a: Gate, b: Gate): boolean {
  return a.qubits.some((q) => b.qubits.includes(q));
}

export function gatesEqual(a: Gate, b: Gate): boolean {
  if (a.name !== b.name || !sameQubits(a, b)) return false;
  const pa = a.params ?? [];
  const pb = b.params ?? [];
  return (
    pa.length === pb.length &&
    pa.every((p, i) => Math.abs(normalizeAngle(p - (pb[i] ?? 0))) < ANGLE_EPSILON)
  );
}

export function isInversePair(a: Gate, b: Gate): boolean {
  if (SELF_INVERSE.has(a.name)) return a.name === b.name && sameQubits(a, b);
  if (PARAMETRIC.has(a.name) && a.name === b.name && sameQubits(a, b)) {
    return normalizeAngle((a.params?.[0] ?? 0) + (b.params?.[0] ?? 0)) === 0;
  }
  return false;
}

/** Diagonal single-qubit gate as a phase angle diag(1, e^{i·phase}), up to global phase. */
export function zPhase(g: Gate): number | undefined {
  if (g.qubits.length !== 1) return undefined;
  const step = Z_PHASE_STEP[g.name];
  if (step !== undefined) return (step * Math.PI) / 4;
  if (g.name === "rz") return normalizeAngle(g.params?.[0] ?? 0);
  return undefined;
}

/** Canonical Clifford+T (or rz) sequence for diag(1, e^{i·phase}) up to global phase. */
export function phaseGates(qubit: number, phase: number): Gate[] {
  const normalized = normalizeAngle(phase);
  if (normalized === 0) return [];
  const steps = normalized / (Math.PI / 4);
  const rounded = Math.round(steps);
  if (Math.abs(steps - rounded) > 1e-9) return [gate("rz", [qubit], [normalized])];
  const names: GateName[][] = [[], ["t"], ["s"], ["s", "t"], ["z"], ["z", "t"], ["sdg"], ["tdg"]];
  return (names[rounded % 8] ?? []).map((name) => gate(name, [qubit]));
}

function isDiagonal(g: Gate): boolean {
  return zPhase(g) !== undefined || g.name === "cz";
}

function isXAxis(g: Gate): boolean {
  return g.name === "x" || g.name === "rx";
}

/** Sufficient (not complete) commutation test used by the rewrite rules. */
export function commutes(a: Gate, b: Gate): boolean {
  if (!sharesQubit(a, b)) return true;
  if (isDiagonal(a) && isDiagonal(b)) return true;
  if (gatesEqual(a, b)) return true;
  const pairs: [Gate, Gate][] = [
    [a, b],
    [b, a],
  ];
  for (const [p, q] of pairs) {
    if (p.name === "cx") {
      const [control, target] = p.qubits as [number, number];
      if (q.qubits.length === 1) {
        if (q.qubits[0] === control && zPhase(q) !== undefined) return true;
        if (q.qubits[0] === target && isXAxis(q)) return true;
      }
      if (q.name === "cx") {
        const [c2, t2] = q.qubits as [number, number];
        if (control === c2 && target !== t2 && t2 !== control && target !== c2) return true;
        if (target === t2 && control !== c2 && c2 !== target && control !== t2) return true;
      }
      if (q.name === "cz" && !q.qubits.includes(target)) return true;
    }
  }
  if (isXAxis(a) && isXAxis(b)) return true;
  if (a.name === "ry" && b.name === "ry") return true;
  return false;
}

export function gateKey(g: Gate): string {
  const params = g.params?.map((p) => normalizeAngle(p).toFixed(9)).join(",") ?? "";
  return `${g.name}(${params})[${g.qubits.join(",")}]`;
}

export function circuitHash(circuit: Circuit): string {
  const text = `${circuit.numQubits}|${circuit.gates.map(gateKey).join(";")}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}
