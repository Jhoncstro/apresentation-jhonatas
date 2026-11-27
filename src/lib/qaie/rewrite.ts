import {
  type Circuit,
  type Gate,
  cloneGate,
  commutes,
  gate,
  gatesEqual,
  isInversePair,
  normalizeAngle,
  phaseGates,
  sharesQubit,
  zPhase,
} from "./circuit";

/** A local identity applied to a contiguous window of gates; replayable on other circuits. */
export interface Transformation {
  rule: string;
  window: Gate[];
  replacement: Gate[];
}

interface Site {
  index: number;
  length: number;
  replacement: Gate[];
}

export interface RewriteRule {
  name: string;
  description: string;
  sites(gates: Gate[]): Site[];
}

function canonicalPhase(g: Gate): Gate[] | undefined {
  const phase = zPhase(g);
  if (phase === undefined) return undefined;
  const qubit = g.qubits[0] ?? 0;
  return phaseGates(qubit, phase);
}

function mergeRotation(a: Gate, b: Gate): Gate[] | undefined {
  if ((a.name === "rx" || a.name === "ry") && a.name === b.name && a.qubits[0] === b.qubits[0]) {
    const angle = normalizeAngle((a.params?.[0] ?? 0) + (b.params?.[0] ?? 0));
    return angle === 0 ? [] : [gate(a.name, [...a.qubits], [angle])];
  }
  const pa = zPhase(a);
  const pb = zPhase(b);
  if (pa !== undefined && pb !== undefined && a.qubits[0] === b.qubits[0]) {
    return phaseGates(a.qubits[0] ?? 0, pa + pb);
  }
  return undefined;
}

/**
 * Deterministic peephole simplification to a fixpoint: cancels inverse pairs and merges
 * rotations across gates they provably commute with. Every step is an exact identity.
 */
export function simplify(circuit: Circuit): Circuit {
  let gates = circuit.gates.flatMap((g) => {
    if (g.name === "rz") return canonicalPhase(g) ?? [cloneGate(g)];
    if ((g.name === "rx" || g.name === "ry") && normalizeAngle(g.params?.[0] ?? 0) === 0) return [];
    return [cloneGate(g)];
  });
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < gates.length; i++) {
      const first = gates[i] as Gate;
      for (let j = i + 1; j < gates.length; j++) {
        const second = gates[j] as Gate;
        if (!sharesQubit(first, second)) continue;
        if (isInversePair(first, second)) {
          gates = [...gates.slice(0, i), ...gates.slice(i + 1, j), ...gates.slice(j + 1)];
          changed = true;
          break outer;
        }
        const merged = mergeRotation(first, second);
        if (merged && merged.length < 2) {
          gates = [
            ...gates.slice(0, i),
            ...merged,
            ...gates.slice(i + 1, j),
            ...gates.slice(j + 1),
          ];
          changed = true;
          break outer;
        }
        if (!commutes(first, second)) break;
      }
    }
  }
  return { numQubits: circuit.numQubits, gates };
}

function windowMatches(gates: Gate[], index: number, pattern: Gate[]): boolean {
  return pattern.every((p, k) => {
    const g = gates[index + k];
    return g !== undefined && gatesEqual(g, p);
  });
}

const singleQubitPatterns: [string, (q: number) => Gate[], (q: number) => Gate[]][] = [
  [
    "h-conjugação X→Z",
    (q) => [gate("h", [q]), gate("x", [q]), gate("h", [q])],
    (q) => [gate("z", [q])],
  ],
  [
    "h-conjugação Z→X",
    (q) => [gate("h", [q]), gate("z", [q]), gate("h", [q])],
    (q) => [gate("x", [q])],
  ],
];

export const RULES: RewriteRule[] = [
  {
    name: "comutação",
    description: "Troca duas portas adjacentes que comutam, expondo cancelamentos e fusões.",
    sites(gates) {
      const sites: Site[] = [];
      for (let i = 0; i + 1 < gates.length; i++) {
        const a = gates[i] as Gate;
        const b = gates[i + 1] as Gate;
        if (sharesQubit(a, b) && commutes(a, b) && !gatesEqual(a, b)) {
          sites.push({ index: i, length: 2, replacement: [cloneGate(b), cloneGate(a)] });
        }
      }
      return sites;
    },
  },
  {
    name: "conjugação por Hadamard",
    description: "H·X·H = Z e H·Z·H = X (e o sentido inverso).",
    sites(gates) {
      const sites: Site[] = [];
      gates.forEach((g, i) => {
        const q = g.qubits[0] ?? 0;
        for (const [, lhs, rhs] of singleQubitPatterns) {
          if (windowMatches(gates, i, lhs(q)))
            sites.push({ index: i, length: 3, replacement: rhs(q) });
          if (g.qubits.length === 1 && windowMatches(gates, i, rhs(q)))
            sites.push({ index: i, length: 1, replacement: lhs(q) });
        }
      });
      return sites;
    },
  },
  {
    name: "inversão de CNOT",
    description: "(H⊗H)·CX(a,b)·(H⊗H) = CX(b,a).",
    sites(gates) {
      const sites: Site[] = [];
      gates.forEach((g, i) => {
        if (g.name !== "cx") return;
        const [a = 0, b = 0] = g.qubits;
        sites.push({
          index: i,
          length: 1,
          replacement: [
            gate("h", [a]),
            gate("h", [b]),
            gate("cx", [b, a]),
            gate("h", [a]),
            gate("h", [b]),
          ],
        });
      });
      for (let i = 0; i + 5 <= gates.length; i++) {
        const middle = gates[i + 2];
        if (middle?.name !== "cx") continue;
        const [c = 0, t = 0] = middle.qubits;
        const h1 = [gate("h", [c]), gate("h", [t])];
        const h2 = [gate("h", [t]), gate("h", [c])];
        const before = [0, 1].map((k) => gates[i + k] as Gate);
        const after = [3, 4].map((k) => gates[i + k] as Gate);
        const isHPair = (pair: Gate[]) =>
          [h1, h2].some((h) => h.every((x, k) => pair[k] && gatesEqual(pair[k] as Gate, x)));
        if (isHPair(before) && isHPair(after))
          sites.push({ index: i, length: 5, replacement: [gate("cx", [t, c])] });
      }
      return sites;
    },
  },
  {
    name: "CZ ↔ CX",
    description: "CZ(a,b) = H(b)·CX(a,b)·H(b).",
    sites(gates) {
      const sites: Site[] = [];
      gates.forEach((g, i) => {
        if (g.name === "cz") {
          const [a = 0, b = 0] = g.qubits;
          sites.push({
            index: i,
            length: 1,
            replacement: [gate("h", [b]), gate("cx", [a, b]), gate("h", [b])],
          });
        }
        if (g.name === "h") {
          const next = gates[i + 1];
          const after = gates[i + 2];
          const b = g.qubits[0] ?? 0;
          if (next?.name === "cx" && next.qubits[1] === b && after && gatesEqual(after, g)) {
            sites.push({
              index: i,
              length: 3,
              replacement: [gate("cz", [next.qubits[0] ?? 0, b])],
            });
          }
        }
      });
      return sites;
    },
  },
  {
    name: "decomposição de SWAP",
    description: "SWAP(a,b) = CX(a,b)·CX(b,a)·CX(a,b).",
    sites(gates) {
      return gates.flatMap((g, i) => {
        if (g.name !== "swap") return [];
        const [a = 0, b = 0] = g.qubits;
        return [
          {
            index: i,
            length: 1,
            replacement: [gate("cx", [a, b]), gate("cx", [b, a]), gate("cx", [a, b])],
          },
        ];
      });
    },
  },
];

export function applySite(
  circuit: Circuit,
  rule: RewriteRule,
  site: Site,
): { circuit: Circuit; transformation: Transformation } {
  const window = circuit.gates.slice(site.index, site.index + site.length).map(cloneGate);
  const gates = [
    ...circuit.gates.slice(0, site.index),
    ...site.replacement.map(cloneGate),
    ...circuit.gates.slice(site.index + site.length),
  ];
  return {
    circuit: { numQubits: circuit.numQubits, gates },
    transformation: { rule: rule.name, window, replacement: site.replacement.map(cloneGate) },
  };
}

export function randomMove(
  circuit: Circuit,
  random: () => number,
  rules: RewriteRule[] = RULES,
): { circuit: Circuit; transformation: Transformation } | undefined {
  const order = [...rules].sort(() => random() - 0.5);
  for (const rule of order) {
    const sites = rule.sites(circuit.gates);
    const site = sites[Math.floor(random() * sites.length)];
    if (site) return applySite(circuit, rule, site);
  }
  return undefined;
}

/** Replays a transformation wherever its exact window occurs (first match). */
export function replay(circuit: Circuit, transformation: Transformation): Circuit | undefined {
  const { window } = transformation;
  for (let i = 0; i + window.length <= circuit.gates.length; i++) {
    if (windowMatches(circuit.gates, i, window)) {
      return {
        numQubits: circuit.numQubits,
        gates: [
          ...circuit.gates.slice(0, i),
          ...transformation.replacement.map(cloneGate),
          ...circuit.gates.slice(i + window.length),
        ],
      };
    }
  }
  return undefined;
}
