import { type Circuit, circuitHash, cloneCircuit, validateCircuit } from "./circuit";
import {
  type CircuitMetrics,
  DEFAULT_WEIGHTS,
  type Weights,
  computeMetrics,
  paretoFront,
  weightedCost,
} from "./metrics";
import { mulberry32, pick } from "./random";
import { RULES, type Transformation, applySite, randomMove, replay, simplify } from "./rewrite";
import { type VerificationOptions, type VerificationResult, verifyEquivalence } from "./verify";

export const STRATEGIES = [
  "descida gulosa",
  "simulated annealing",
  "beam search",
  "recombinação evolutiva",
] as const;
export type StrategyName = (typeof STRATEGIES)[number];

export interface EngineConfig {
  weights: Weights;
  seed: number;
  maxElites: number;
  stagnationPatience: number;
  annealingSteps: number;
  beamWidth: number;
  beamDepth: number;
  explorationC: number;
  verification: VerificationOptions;
}

export const DEFAULT_CONFIG: EngineConfig = {
  weights: DEFAULT_WEIGHTS,
  seed: 2026,
  maxElites: 6,
  stagnationPatience: 25,
  annealingSteps: 120,
  beamWidth: 4,
  beamDepth: 4,
  explorationC: 0.6,
  verification: {},
};

export interface LineageNode {
  id: string;
  parentIds: string[];
  generation: number;
  strategy: StrategyName | "original";
  cost: number;
  metrics: CircuitMetrics;
  hash: string;
  transformations: Transformation[];
  verification: Pick<VerificationResult, "method" | "fidelity" | "detail">;
  iteration: number;
  /** Stored for small circuits so any generation can be recovered as a new base. */
  circuit?: Circuit;
}

export interface Elite {
  nodeId: string;
  circuit: Circuit;
  /** All transformations from the original circuit to this elite, in order. */
  lineage: Transformation[];
}

export interface StrategyStats {
  pulls: number;
  rewardSum: number;
  improvements: number;
  totalMs: number;
  totalGain: number;
}

export interface Experiment {
  iteration: number;
  strategy: StrategyName;
  parentId: string;
  candidateId?: string;
  parentCost: number;
  cost?: number;
  valid: boolean;
  newBest: boolean;
  method: VerificationResult["method"];
  fidelity: number;
  detail: string;
  ms: number;
}

export interface Interaction {
  iteration: number;
  donors: [string, string];
  combinedGain: number;
  bestSingleGain: number;
  effect: "positiva" | "negativa" | "neutra";
}

export interface EngineSnapshot {
  version: 1;
  config: EngineConfig;
  original: Circuit;
  baseline: CircuitMetrics;
  iteration: number;
  bestId: string;
  stagnation: number;
  temperature: number;
  elites: Elite[];
  nodes: LineageNode[];
  stats: Record<StrategyName, StrategyStats>;
  experiments: Experiment[];
  interactions: Interaction[];
  history: { iteration: number; bestCost: number; candidateCost?: number }[];
  events: { iteration: number; message: string }[];
  counters: { valid: number; rejected: number; duplicates: number; elapsedMs: number };
}

const MAX_NODES = 400;
const MAX_STORED_GATES = 2000;

const storable = (circuit: Circuit) =>
  circuit.gates.length <= MAX_STORED_GATES ? { circuit: cloneCircuit(circuit) } : {};
const MAX_LOG = 300;
const EPSILON = 1e-12;

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/**
 * Quantum Adaptive Intelligence Engine with the Cumulative Evolution Engine.
 * One `step()` runs one optimization cycle: select strategy (UCB1) → generate candidate →
 * verify against the ORIGINAL circuit → evaluate → keep the best valid candidate (monotone) →
 * record lineage/experiment → update policy.
 */
export class QaieEngine {
  private state: EngineSnapshot;
  private random: () => number;
  private seen = new Set<string>();

  constructor(original: Circuit, config: Partial<EngineConfig> = {}, snapshot?: EngineSnapshot) {
    if (snapshot) {
      this.state = structuredClone(snapshot);
    } else {
      validateCircuit(original);
      const fullConfig = { ...DEFAULT_CONFIG, ...config };
      const baseline = computeMetrics(original);
      const root: LineageNode = {
        id: "g0",
        parentIds: [],
        generation: 0,
        strategy: "original",
        cost: weightedCost(baseline, baseline, fullConfig.weights),
        metrics: baseline,
        hash: circuitHash(original),
        transformations: [],
        verification: {
          method: "unitária exata",
          fidelity: 1,
          detail: "Circuito original (referência).",
        },
        iteration: 0,
        ...storable(original),
      };
      const stats = Object.fromEntries(
        STRATEGIES.map((s) => [
          s,
          { pulls: 0, rewardSum: 0, improvements: 0, totalMs: 0, totalGain: 0 },
        ]),
      ) as Record<StrategyName, StrategyStats>;
      this.state = {
        version: 1,
        config: fullConfig,
        original: cloneCircuit(original),
        baseline,
        iteration: 0,
        bestId: root.id,
        stagnation: 0,
        temperature: 0.05,
        elites: [{ nodeId: root.id, circuit: cloneCircuit(original), lineage: [] }],
        nodes: [root],
        stats,
        experiments: [],
        interactions: [],
        history: [{ iteration: 0, bestCost: root.cost }],
        events: [],
        counters: { valid: 0, rejected: 0, duplicates: 0, elapsedMs: 0 },
      };
    }
    this.random = mulberry32(this.state.config.seed + this.state.iteration * 7919);
    this.state.nodes.forEach((n) => this.seen.add(n.hash));
  }

  static restore(snapshot: EngineSnapshot): QaieEngine {
    if (snapshot.version !== 1) throw new Error("Versão de checkpoint incompatível.");
    validateCircuit(snapshot.original);
    return new QaieEngine(snapshot.original, snapshot.config, snapshot);
  }

  snapshot(): EngineSnapshot {
    return structuredClone(this.state);
  }

  get iteration(): number {
    return this.state.iteration;
  }

  get best(): { node: LineageNode; circuit: Circuit } {
    const node = this.node(this.state.bestId);
    const elite = this.state.elites.find((e) => e.nodeId === node.id);
    if (!elite) throw new Error("Melhor candidato ausente do conjunto de elites.");
    return { node, circuit: elite.circuit };
  }

  get pareto(): LineageNode[] {
    return paretoFront(this.state.nodes);
  }

  private node(id: string): LineageNode {
    const node = this.state.nodes.find((n) => n.id === id);
    if (!node) throw new Error(`Nó ${id} não encontrado.`);
    return node;
  }

  private cost(circuit: Circuit): { metrics: CircuitMetrics; cost: number } {
    const metrics = computeMetrics(circuit);
    return { metrics, cost: weightedCost(metrics, this.state.baseline, this.state.config.weights) };
  }

  /** Multi-armed bandit (UCB1) over strategies; reward = relative gain per second. */
  selectStrategy(): StrategyName {
    const { stats, config } = this.state;
    const available = STRATEGIES.filter(
      (s) => s !== "recombinação evolutiva" || this.state.elites.length >= 2,
    );
    const untried = available.find((s) => stats[s].pulls === 0);
    if (untried) return untried;
    const total = available.reduce((sum, s) => sum + stats[s].pulls, 0);
    let bestScore = -Infinity;
    let choice: StrategyName = available[0] ?? "descida gulosa";
    for (const s of available) {
      const { pulls, rewardSum } = stats[s];
      const score =
        rewardSum / pulls + config.explorationC * Math.sqrt((2 * Math.log(total)) / pulls);
      if (score > bestScore) {
        bestScore = score;
        choice = s;
      }
    }
    return choice;
  }

  private chooseParent(): Elite {
    const best = this.state.elites.find((e) => e.nodeId === this.state.bestId);
    if (best && this.random() < 0.6) return best;
    return pick(this.state.elites, this.random) ?? (best as Elite);
  }

  private generate(
    strategy: StrategyName,
    parent: Elite,
  ): { circuit: Circuit; lineage: Transformation[]; donors?: [Elite, Elite] } {
    const { config } = this.state;
    if (strategy === "descida gulosa") {
      let current = simplify(parent.circuit);
      let lineage = [...parent.lineage];
      let currentCost = this.cost(current).cost;
      for (const rule of RULES) {
        for (const site of rule.sites(current.gates).slice(0, 60)) {
          const moved = applySite(current, rule, site);
          const next = simplify(moved.circuit);
          const nextCost = this.cost(next).cost;
          if (nextCost < currentCost - EPSILON) {
            current = next;
            currentCost = nextCost;
            lineage = [...lineage, moved.transformation];
            break;
          }
        }
      }
      return { circuit: current, lineage };
    }
    if (strategy === "simulated annealing") {
      let current = parent.circuit;
      let currentCost = this.cost(current).cost;
      let lineage = [...parent.lineage];
      let best = { circuit: simplify(current), lineage };
      let bestCost = this.cost(best.circuit).cost;
      let accepted = 0;
      for (let k = 0; k < config.annealingSteps; k++) {
        const temperature = this.state.temperature * (1 - k / config.annealingSteps) + 1e-6;
        const move = randomMove(current, this.random);
        if (!move) break;
        const next = simplify(move.circuit);
        const nextCost = this.cost(next).cost;
        if (
          nextCost <= currentCost ||
          this.random() < Math.exp((currentCost - nextCost) / temperature)
        ) {
          current = next;
          currentCost = nextCost;
          lineage = [...lineage, move.transformation];
          accepted++;
          if (nextCost < bestCost - EPSILON) {
            best = { circuit: next, lineage };
            bestCost = nextCost;
          }
        }
      }
      const rate = accepted / config.annealingSteps;
      this.state.temperature = Math.min(
        1,
        Math.max(0.002, this.state.temperature * (rate < 0.15 ? 1.2 : rate > 0.5 ? 0.8 : 1)),
      );
      return best;
    }
    if (strategy === "beam search") {
      let beam = [{ circuit: simplify(parent.circuit), lineage: [...parent.lineage] }];
      let best = beam[0] as { circuit: Circuit; lineage: Transformation[] };
      let bestCost = this.cost(best.circuit).cost;
      for (let depth = 0; depth < config.beamDepth; depth++) {
        const children: {
          circuit: Circuit;
          lineage: Transformation[];
          cost: number;
          hash: string;
        }[] = [];
        for (const item of beam) {
          for (let k = 0; k < config.beamWidth * 3; k++) {
            const move = randomMove(item.circuit, this.random);
            if (!move) break;
            const circuit = simplify(move.circuit);
            children.push({
              circuit,
              lineage: [...item.lineage, move.transformation],
              cost: this.cost(circuit).cost,
              hash: circuitHash(circuit),
            });
          }
        }
        const unique = [...new Map(children.map((c) => [c.hash, c])).values()].sort(
          (a, b) => a.cost - b.cost,
        );
        beam = unique.slice(0, config.beamWidth);
        const top = unique[0];
        if (top && top.cost < bestCost - EPSILON) {
          best = top;
          bestCost = top.cost;
        }
      }
      return best;
    }
    const others = this.state.elites.filter((e) => e.nodeId !== parent.nodeId);
    const donor = pick(others, this.random) ?? parent;
    let circuit = parent.circuit;
    const lineage = [...parent.lineage];
    const own = new Set(parent.lineage.map((t) => JSON.stringify(t)));
    for (const transformation of donor.lineage) {
      if (own.has(JSON.stringify(transformation))) continue;
      const next = replay(circuit, transformation);
      if (next) {
        circuit = next;
        lineage.push(transformation);
      }
    }
    return { circuit: simplify(circuit), lineage, donors: [parent, donor] };
  }

  private salvage(
    parent: Elite,
    lineage: Transformation[],
  ): { circuit: Circuit; lineage: Transformation[] } | undefined {
    let circuit = parent.circuit;
    const kept = [...parent.lineage];
    for (const transformation of lineage.slice(parent.lineage.length)) {
      const next = replay(circuit, transformation);
      if (!next) continue;
      const simplified = simplify(next);
      if (
        !verifyEquivalence(this.state.original, simplified, this.state.config.verification)
          .equivalent
      )
        break;
      circuit = simplified;
      kept.push(transformation);
    }
    return kept.length > parent.lineage.length ? { circuit, lineage: kept } : undefined;
  }

  step(): Experiment {
    const started = now();
    const s = this.state;
    s.iteration++;
    const strategy = this.selectStrategy();
    const parent = this.chooseParent();
    const parentNode = this.node(parent.nodeId);
    let generated = this.generate(strategy, parent);
    let verification = verifyEquivalence(s.original, generated.circuit, s.config.verification);
    if (!verification.equivalent) {
      s.counters.rejected++;
      const salvaged = this.salvage(parent, generated.lineage);
      if (salvaged) {
        this.log(
          `Melhorias parciais de um candidato rejeitado foram revalidadas individualmente (${strategy}).`,
        );
        generated = salvaged;
        verification = verifyEquivalence(s.original, generated.circuit, s.config.verification);
      }
    }
    const { metrics, cost } = this.cost(generated.circuit);
    const hash = circuitHash(generated.circuit);
    const best = this.node(s.bestId);
    let newBest = false;
    let candidateId: string | undefined;
    if (verification.equivalent) {
      s.counters.valid++;
      if (this.seen.has(hash)) {
        s.counters.duplicates++;
      } else {
        this.seen.add(hash);
        candidateId = `g${s.iteration}`;
        const node: LineageNode = {
          id: candidateId,
          parentIds: generated.donors ? generated.donors.map((d) => d.nodeId) : [parent.nodeId],
          generation: parentNode.generation + 1,
          strategy,
          cost,
          metrics,
          hash,
          transformations: generated.lineage.slice(parent.lineage.length),
          verification: {
            method: verification.method,
            fidelity: verification.fidelity,
            detail: verification.detail,
          },
          iteration: s.iteration,
          ...storable(generated.circuit),
        };
        s.nodes.push(node);
        this.admitElite(
          { nodeId: candidateId, circuit: generated.circuit, lineage: generated.lineage },
          cost,
        );
        if (cost < best.cost - EPSILON) {
          s.bestId = candidateId;
          newBest = true;
        }
        if (generated.donors) this.recordInteraction(generated.donors, cost);
      }
    }
    const ms = now() - started;
    const gain = candidateId ? Math.max(0, parentNode.cost - cost) : 0;
    const stats = s.stats[strategy];
    stats.pulls++;
    stats.totalMs += ms;
    stats.totalGain += gain;
    stats.rewardSum += Math.min(
      1,
      (gain / Math.max(EPSILON, parentNode.cost)) * (1000 / Math.max(1, ms)),
    );
    if (newBest) stats.improvements++;
    s.stagnation = newBest ? 0 : s.stagnation + 1;
    if (s.stagnation >= s.config.stagnationPatience) this.restart();
    s.counters.elapsedMs += ms;
    s.history.push({
      iteration: s.iteration,
      bestCost: this.node(s.bestId).cost,
      ...(verification.equivalent ? { candidateCost: cost } : {}),
    });
    const experiment: Experiment = {
      iteration: s.iteration,
      strategy,
      parentId: parent.nodeId,
      ...(candidateId ? { candidateId } : {}),
      parentCost: parentNode.cost,
      ...(verification.equivalent ? { cost } : {}),
      valid: verification.equivalent,
      newBest,
      method: verification.method,
      fidelity: verification.fidelity,
      detail: verification.detail,
      ms,
    };
    s.experiments.push(experiment);
    this.trim();
    return experiment;
  }

  /** Re-admits a stored earlier generation as an elite so new generations can branch from it. */
  recover(id: string): boolean {
    const node = this.node(id);
    if (!node.circuit) return false;
    if (this.state.elites.some((e) => e.nodeId === id)) return true;
    const lineage: Transformation[] = [];
    for (let current: LineageNode | undefined = node; current;) {
      lineage.unshift(...current.transformations);
      const parentId: string | undefined = current.parentIds[0];
      current = parentId ? this.state.nodes.find((n) => n.id === parentId) : undefined;
    }
    this.state.elites.push({ nodeId: id, circuit: cloneCircuit(node.circuit), lineage });
    this.log(`Geração ${id} recuperada como base de uma nova linhagem.`);
    return true;
  }

  private admitElite(elite: Elite, cost: number): void {
    const { elites, config } = this.state;
    elites.push(elite);
    if (elites.length <= config.maxElites) return;
    const removable = elites
      .filter((e) => e.nodeId !== this.state.bestId && e.nodeId !== elite.nodeId)
      .sort((a, b) => this.node(b.nodeId).cost - this.node(a.nodeId).cost)[0];
    if (removable && this.node(removable.nodeId).cost >= cost) {
      elites.splice(elites.indexOf(removable), 1);
    } else {
      elites.splice(elites.indexOf(elite), 1);
    }
  }

  private recordInteraction([a, b]: [Elite, Elite], cost: number): void {
    const root = this.node("g0").cost;
    const combinedGain = root - cost;
    const bestSingleGain = Math.max(
      root - this.node(a.nodeId).cost,
      root - this.node(b.nodeId).cost,
    );
    const delta = combinedGain - bestSingleGain;
    this.state.interactions.push({
      iteration: this.state.iteration,
      donors: [a.nodeId, b.nodeId],
      combinedGain,
      bestSingleGain,
      effect: delta > EPSILON ? "positiva" : delta < -EPSILON ? "negativa" : "neutra",
    });
  }

  private restart(): void {
    const s = this.state;
    s.stagnation = 0;
    s.temperature = Math.min(1, s.temperature * 2);
    s.config = {
      ...s.config,
      beamWidth: Math.min(12, s.config.beamWidth + 1),
      annealingSteps: Math.min(600, Math.round(s.config.annealingSteps * 1.25)),
    };
    this.log(
      `Estagnação detectada: temperatura ${s.temperature.toFixed(3)}, beam ${s.config.beamWidth}, annealing ${s.config.annealingSteps} passos; exploração reiniciada a partir das elites.`,
    );
  }

  private log(message: string): void {
    this.state.events.push({ iteration: this.state.iteration, message });
  }

  private trim(): void {
    const s = this.state;
    if (s.experiments.length > MAX_LOG) s.experiments.splice(0, s.experiments.length - MAX_LOG);
    if (s.events.length > MAX_LOG) s.events.splice(0, s.events.length - MAX_LOG);
    if (s.interactions.length > MAX_LOG) s.interactions.splice(0, s.interactions.length - MAX_LOG);
    if (s.history.length > 2000)
      s.history = s.history.filter((_, i) => i % 2 === 0 || i === s.history.length - 1);
    if (s.nodes.length > MAX_NODES) {
      const keep = new Set(["g0", s.bestId, ...s.elites.map((e) => e.nodeId)]);
      const removable = s.nodes.filter((n) => !keep.has(n.id)).sort((a, b) => b.cost - a.cost);
      const drop = new Set(removable.slice(0, s.nodes.length - MAX_NODES).map((n) => n.id));
      s.nodes = s.nodes.filter((n) => !drop.has(n.id));
    }
  }
}
