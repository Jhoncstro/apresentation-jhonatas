import type { Circuit } from "./circuit";
import { zPhase } from "./circuit";

export interface CircuitMetrics {
  gateCount: number;
  tCount: number;
  tDepth: number;
  depth: number;
  twoQubitCount: number;
  rotationCount: number;
  activeQubits: number;
}

export type MetricKey = keyof CircuitMetrics;

export const METRIC_LABELS: Record<MetricKey, string> = {
  gateCount: "Portas",
  tCount: "T-count",
  tDepth: "T-depth",
  depth: "Profundidade",
  twoQubitCount: "Portas de 2+ qubits",
  rotationCount: "Rotações arbitrárias",
  activeQubits: "Qubits ativos",
};

export type Weights = Partial<Record<MetricKey, number>>;

export const DEFAULT_WEIGHTS: Weights = {
  tCount: 1,
  tDepth: 0.5,
  twoQubitCount: 0.5,
  depth: 0.25,
  rotationCount: 0.5,
  gateCount: 0.1,
};

const CCX_T_COUNT = 7;
const CCX_T_DEPTH = 3;
const CCX_DEPTH = 12;
const CCX_TWO_QUBIT = 6;

function tCost(name: string, phase: number | undefined): number {
  if (name === "t" || name === "tdg") return 1;
  if (name === "rz" && phase !== undefined) {
    const steps = phase / (Math.PI / 4);
    if (Math.abs(steps - Math.round(steps)) < 1e-9 && Math.round(steps) % 2 !== 0) return 1;
  }
  return 0;
}

/** Resource metrics; Toffoli gates are costed with the standard 7-T Clifford+T decomposition. */
export function computeMetrics(circuit: Circuit): CircuitMetrics {
  const depthAt = new Array<number>(circuit.numQubits).fill(0);
  const tDepthAt = new Array<number>(circuit.numQubits).fill(0);
  const active = new Set<number>();
  let tCount = 0;
  let twoQubitCount = 0;
  let rotationCount = 0;
  for (const g of circuit.gates) {
    g.qubits.forEach((q) => active.add(q));
    const isCcx = g.name === "ccx";
    const t = isCcx ? CCX_T_COUNT : tCost(g.name, zPhase(g));
    tCount += t;
    if (g.qubits.length > 1) twoQubitCount += isCcx ? CCX_TWO_QUBIT : 1;
    if (
      (g.name === "rz" && t === 0 && !isCliffordPhase(zPhase(g))) ||
      g.name === "rx" ||
      g.name === "ry"
    ) {
      rotationCount++;
    }
    const start = Math.max(...g.qubits.map((q) => depthAt[q] ?? 0));
    const tStart = Math.max(...g.qubits.map((q) => tDepthAt[q] ?? 0));
    const tLayers = isCcx ? CCX_T_DEPTH : t;
    for (const q of g.qubits) {
      depthAt[q] = start + (isCcx ? CCX_DEPTH : 1);
      tDepthAt[q] = tStart + tLayers;
    }
  }
  return {
    gateCount: circuit.gates.length,
    tCount,
    tDepth: Math.max(0, ...tDepthAt),
    depth: Math.max(0, ...depthAt),
    twoQubitCount,
    rotationCount,
    activeQubits: active.size,
  };
}

function isCliffordPhase(phase: number | undefined): boolean {
  if (phase === undefined) return false;
  const steps = phase / (Math.PI / 2);
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

/** Weighted cost of metrics normalized by the baseline (each term is 1.0 at the baseline). */
export function weightedCost(
  metrics: CircuitMetrics,
  baseline: CircuitMetrics,
  weights: Weights,
): number {
  let total = 0;
  let weightSum = 0;
  for (const [key, weight] of Object.entries(weights) as [MetricKey, number][]) {
    if (!weight) continue;
    if (baseline[key] === 0) {
      // Metric absent from the original: no share of the score, but any increase is penalized.
      total += weight * metrics[key];
      continue;
    }
    total += (weight * metrics[key]) / baseline[key];
    weightSum += weight;
  }
  return weightSum ? total / weightSum : total;
}

export const PARETO_KEYS: MetricKey[] = ["tCount", "twoQubitCount", "depth"];

export function dominates(a: CircuitMetrics, b: CircuitMetrics, keys = PARETO_KEYS): boolean {
  return keys.every((k) => a[k] <= b[k]) && keys.some((k) => a[k] < b[k]);
}

export function paretoFront<T extends { metrics: CircuitMetrics }>(
  items: T[],
  keys = PARETO_KEYS,
): T[] {
  const front: T[] = [];
  for (const item of items) {
    if (items.some((other) => other !== item && dominates(other.metrics, item.metrics, keys)))
      continue;
    if (front.some((f) => keys.every((k) => f.metrics[k] === item.metrics[k]))) continue;
    front.push(item);
  }
  return front;
}
