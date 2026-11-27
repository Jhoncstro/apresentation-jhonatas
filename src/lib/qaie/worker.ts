/// <reference lib="webworker" />
import type { Circuit } from "./circuit";
import { type EngineConfig, type EngineSnapshot, QaieEngine } from "./engine";
import type { Transformation } from "./rewrite";
import { verifyEquivalence } from "./verify";

export type WorkerRequest =
  | {
      type: "start";
      circuit: Circuit;
      config: Partial<EngineConfig>;
      snapshot?: EngineSnapshot;
      budget: Budget;
    }
  | { type: "pause" }
  | { type: "resume"; budget?: Budget }
  | { type: "stop" }
  | { type: "recover"; nodeId: string }
  | {
      type: "import";
      candidates: { circuit: Circuit; lineage: Transformation[]; origin: string }[];
    };

export interface Budget {
  maxIterations: number;
  maxSeconds: number;
}

export type WorkerResponse =
  | {
      type: "progress";
      snapshot: EngineSnapshot;
      running: boolean;
      reason?: string;
      finalCheck?: { equivalent: boolean; detail: string };
    }
  | { type: "error"; message: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;
let engine: QaieEngine | undefined;
let running = false;
let budget: Budget = { maxIterations: 500, maxSeconds: 60 };
let startedAt = 0;
let startIteration = 0;
let lastPost = 0;

function post(reason?: string) {
  if (!engine) return;
  const snapshot = engine.snapshot();
  const response: WorkerResponse = { type: "progress", snapshot, running };
  if (reason) {
    const result = verifyEquivalence(
      snapshot.original,
      engine.best.circuit,
      snapshot.config.verification,
    );
    response.reason = reason;
    response.finalCheck = {
      equivalent: result.equivalent,
      detail: `${result.method}: ${result.detail}`,
    };
  }
  ctx.postMessage(response);
  lastPost = performance.now();
}

function loop() {
  if (!engine || !running) return;
  const sliceEnd = performance.now() + 40;
  try {
    while (performance.now() < sliceEnd) {
      engine.step();
      if (engine.iteration - startIteration >= budget.maxIterations)
        return finish("Limite de iterações atingido.");
      if ((performance.now() - startedAt) / 1000 >= budget.maxSeconds)
        return finish("Limite de tempo atingido.");
    }
  } catch (error) {
    running = false;
    ctx.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    } satisfies WorkerResponse);
    return;
  }
  if (performance.now() - lastPost > 250) post();
  setTimeout(loop, 0);
}

function finish(reason: string) {
  running = false;
  post(reason);
}

function begin(nextBudget?: Budget) {
  if (!engine) return;
  if (nextBudget) budget = nextBudget;
  startedAt = performance.now();
  startIteration = engine.iteration;
  running = true;
  post();
  setTimeout(loop, 0);
}

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  try {
    if (message.type === "start") {
      engine = message.snapshot
        ? QaieEngine.restore(message.snapshot)
        : new QaieEngine(message.circuit, message.config);
      begin(message.budget);
    } else if (message.type === "pause") {
      running = false;
      post("Pausado pelo usuário.");
    } else if (message.type === "resume") {
      begin(message.budget);
    } else if (message.type === "stop") {
      running = false;
      post("Cancelado pelo usuário.");
      engine = undefined;
    } else if (message.type === "import" && engine) {
      for (const c of message.candidates) engine.importCandidate(c.circuit, c.origin, c.lineage);
      post();
    } else if (message.type === "recover" && engine) {
      engine.recover(message.nodeId);
      post();
    }
  } catch (error) {
    running = false;
    ctx.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    } satisfies WorkerResponse);
  }
};
