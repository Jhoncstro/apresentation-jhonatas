import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FolderOpen, Pause, Play, RotateCcw, Save, Square, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Circuit } from "@/lib/qaie/circuit";
import {
  DEFAULT_CONFIG,
  type EngineSnapshot,
  type LineageNode,
  STRATEGIES,
} from "@/lib/qaie/engine";
import { EXAMPLES } from "@/lib/qaie/examples";
import {
  DEFAULT_WEIGHTS,
  METRIC_LABELS,
  type MetricKey,
  type Weights,
  paretoFront,
} from "@/lib/qaie/metrics";
import { buildVault, canWriteVault, writeVault } from "@/lib/qaie/obsidian";
import { parseCircuit, toQasm } from "@/lib/qaie/qasm";
import {
  type CheckpointRecord,
  type RunRecord,
  deleteRun,
  listCheckpoints,
  listRuns,
  loadCheckpoint,
  loadRun,
  saveCheckpoint,
  saveRun,
  storageAvailable,
} from "@/lib/qaie/storage";
import type { Budget, WorkerRequest, WorkerResponse } from "@/lib/qaie/worker";
import { createZip } from "@/lib/qaie/zip";

const METRICS = Object.keys(METRIC_LABELS) as MetricKey[];
const WEIGHT_KEYS: MetricKey[] = [
  "tCount",
  "tDepth",
  "twoQubitCount",
  "depth",
  "rotationCount",
  "gateCount",
];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const AUTOSAVE_MS = 5000;

function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fmt = (value: number, digits = 4) => (Number.isFinite(value) ? value.toFixed(digits) : "—");
const reduction = (base: number, value: number) =>
  base === 0 ? "—" : `${(((base - value) / base) * 100).toFixed(1)}%`;

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-card/60 p-5 ${className}`}>
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function HistoryChart({ history }: { history: EngineSnapshot["history"] }) {
  if (history.length < 2)
    return <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>;
  const width = 600;
  const height = 160;
  const maxX = history[history.length - 1]?.iteration || 1;
  const costs = history.flatMap((h) => [h.bestCost, h.candidateCost ?? h.bestCost]);
  const minY = Math.min(...costs);
  const maxY = Math.max(...costs, 1);
  const x = (i: number) => (i / maxX) * width;
  const y = (c: number) => height - ((c - minY) / Math.max(1e-9, maxY - minY)) * (height - 10) - 5;
  const best = history.map((h) => `${x(h.iteration)},${y(h.bestCost)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-40 w-full"
      role="img"
      aria-label="Evolução do custo do melhor candidato"
    >
      {history.map((h) =>
        h.candidateCost === undefined ? null : (
          <circle
            key={h.iteration}
            cx={x(h.iteration)}
            cy={y(h.candidateCost)}
            r={1.6}
            className="fill-accent/40"
          />
        ),
      )}
      <polyline points={best} fill="none" className="stroke-primary" strokeWidth={2} />
    </svg>
  );
}

type Status = "parado" | "executando" | "pausado";

export function QuantumLab() {
  const [source, setSource] = useState(EXAMPLES[0]?.qasm ?? "");
  const [filename, setFilename] = useState("exemplo.qasm");
  const [runName, setRunName] = useState("Experimento 1");
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [budget, setBudget] = useState<Budget>({ maxIterations: 400, maxSeconds: 30 });
  const [seed, setSeed] = useState(DEFAULT_CONFIG.seed);
  const [snapshot, setSnapshot] = useState<EngineSnapshot>();
  const [status, setStatus] = useState<Status>("parado");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [runs, setRuns] = useState<Omit<RunRecord, "snapshot">[]>([]);
  const [checkpoints, setCheckpoints] = useState<Omit<CheckpointRecord, "snapshot">[]>([]);
  const worker = useRef<Worker | null>(null);
  const runId = useRef<string>("");
  const createdAt = useRef(Date.now());
  const latest = useRef<EngineSnapshot | undefined>(undefined);
  const lastSaved = useRef(0);

  const preview = useMemo(() => {
    try {
      const circuit = parseCircuit(source, filename);
      return { circuit, error: undefined };
    } catch (e) {
      return { circuit: undefined, error: e instanceof Error ? e.message : String(e) };
    }
  }, [source, filename]);

  const refreshRuns = useCallback(async () => {
    if (!storageAvailable()) return;
    setRuns(await listRuns());
    if (runId.current) setCheckpoints(await listCheckpoints(runId.current));
  }, []);

  const persist = useCallback(
    async (snap: EngineSnapshot, checkpoint: boolean) => {
      if (!storageAvailable() || !runId.current) return;
      await saveRun(runId.current, runName, snap, createdAt.current);
      if (checkpoint) await saveCheckpoint(runId.current, snap);
      lastSaved.current = Date.now();
      await refreshRuns();
    },
    [runName, refreshRuns],
  );

  const onWorkerMessage = useCallback(
    (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;
      if (data.type === "error") {
        setError(data.message);
        setStatus("parado");
        return;
      }
      latest.current = data.snapshot;
      setSnapshot(data.snapshot);
      if (data.reason) {
        setStatus(data.reason.startsWith("Cancelado") ? "parado" : "pausado");
        setMessage(
          `${data.reason} Verificação final do melhor: ${data.finalCheck?.equivalent ? "equivalente" : "NÃO equivalente"} (${data.finalCheck?.detail}).`,
        );
        void persist(data.snapshot, true);
      } else if (Date.now() - lastSaved.current > AUTOSAVE_MS) {
        void persist(data.snapshot, true);
      }
    },
    [persist],
  );

  useEffect(() => {
    void refreshRuns().catch(() => undefined);
    return () => worker.current?.terminate();
  }, [refreshRuns]);

  const ensureWorker = () => {
    if (!worker.current) {
      worker.current = new Worker(new URL("../lib/qaie/worker.ts", import.meta.url), {
        type: "module",
      });
    }
    worker.current.onmessage = onWorkerMessage;
    return worker.current;
  };

  const send = (request: WorkerRequest) => ensureWorker().postMessage(request);

  function start(fromSnapshot?: EngineSnapshot, id?: string, created?: number) {
    setError(undefined);
    setMessage(undefined);
    const circuit: Circuit | undefined = fromSnapshot?.original ?? preview.circuit;
    if (!circuit) {
      setError(preview.error ?? "Circuito inválido.");
      return;
    }
    runId.current = id ?? `run-${Date.now()}`;
    createdAt.current = created ?? Date.now();
    lastSaved.current = Date.now();
    setStatus("executando");
    send({
      type: "start",
      circuit,
      config: { ...DEFAULT_CONFIG, weights, seed },
      budget,
      ...(fromSnapshot ? { snapshot: fromSnapshot } : {}),
    });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return setError("Arquivo acima de 5 MB.");
    const text = await file.text();
    if (/\.checkpoint\.json$|qaie.*\.json$/i.test(file.name) && text.includes('"bestId"')) {
      try {
        const snap = JSON.parse(text) as EngineSnapshot;
        if (snap.version !== 1 || !snap.original) throw new Error("Checkpoint inválido.");
        setSnapshot(snap);
        latest.current = snap;
        setMessage(`Checkpoint importado (iteração ${snap.iteration}). Clique em Continuar.`);
        runId.current = `run-${Date.now()}`;
        return;
      } catch (e) {
        return setError(e instanceof Error ? e.message : String(e));
      }
    }
    setFilename(file.name);
    setSource(text);
  }

  async function exportVault() {
    const snap = latest.current;
    if (!snap) return;
    const files = buildVault(runName, snap);
    try {
      if (canWriteVault()) {
        const count = await writeVault(files);
        setMessage(`${count} notas gravadas no Vault do Obsidian.`);
      } else {
        download(
          `qaie-obsidian-${Date.now()}.zip`,
          createZip(files) as BlobPart,
          "application/zip",
        );
        setMessage("Navegador sem acesso a pastas: notas baixadas em ZIP para extrair no Vault.");
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function restoreRun(id: string) {
    const record = await loadRun(id);
    if (!record) return;
    setRunName(record.name);
    runId.current = record.id;
    createdAt.current = record.createdAt;
    latest.current = record.snapshot;
    setSnapshot(record.snapshot);
    setStatus("parado");
    setMessage(`Execução "${record.name}" carregada (iteração ${record.iteration}).`);
    setCheckpoints(await listCheckpoints(id));
  }

  async function restoreCheckpoint(id: number) {
    const record = await loadCheckpoint(id);
    if (!record) return;
    latest.current = record.snapshot;
    setSnapshot(record.snapshot);
    setStatus("parado");
    setMessage(
      `Checkpoint da iteração ${record.iteration} carregado. Continuar cria novas gerações a partir dele.`,
    );
  }

  const best = snapshot?.nodes.find((n) => n.id === snapshot.bestId);
  const bestCircuit = snapshot?.elites.find((e) => e.nodeId === snapshot.bestId)?.circuit;
  const pareto = useMemo<LineageNode[]>(
    () => (snapshot ? paretoFront(snapshot.nodes) : []),
    [snapshot],
  );
  const running = status === "executando";

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel title="1. Circuito de entrada">
          <div className="mb-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example.id}
                type="button"
                title={example.description}
                onClick={() => {
                  setSource(example.qasm);
                  setFilename(`${example.id}.qasm`);
                }}
                className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary"
              >
                {example.label}
              </button>
            ))}
          </div>
          <label htmlFor="qaie-source" className="sr-only">
            Circuito OpenQASM 2 ou JSON
          </label>
          <textarea
            id="qaie-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            className="h-64 w-full rounded-xl border border-input bg-background/60 p-3 font-mono text-xs"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className={preview.error ? "text-destructive" : "text-muted-foreground"}>
              {preview.error ??
                `${preview.circuit?.numQubits} qubits · ${preview.circuit?.gates.length} portas`}
            </span>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1 hover:border-primary">
              <Upload size={14} /> Importar .qasm, .json ou checkpoint
              <input
                type="file"
                accept=".qasm,.json,.txt"
                className="sr-only"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </label>
          </div>
        </Panel>

        <Panel title="2. Objetivo e orçamento">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {WEIGHT_KEYS.map((key) => (
              <label key={key} className="grid gap-1">
                <span className="text-xs text-muted-foreground">Peso · {METRIC_LABELS[key]}</span>
                <input
                  type="number"
                  min={0}
                  step={0.05}
                  value={weights[key] ?? 0}
                  disabled={running}
                  onChange={(e) =>
                    setWeights({ ...weights, [key]: Math.max(0, Number(e.target.value)) })
                  }
                  className="portfolio-input"
                />
              </label>
            ))}
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Máx. iterações</span>
              <input
                type="number"
                min={1}
                max={100000}
                value={budget.maxIterations}
                onChange={(e) =>
                  setBudget({ ...budget, maxIterations: Math.max(1, Number(e.target.value)) })
                }
                className="portfolio-input"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Máx. segundos</span>
              <input
                type="number"
                min={1}
                max={3600}
                value={budget.maxSeconds}
                onChange={(e) =>
                  setBudget({ ...budget, maxSeconds: Math.max(1, Number(e.target.value)) })
                }
                className="portfolio-input"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Semente</span>
              <input
                type="number"
                value={seed}
                disabled={running}
                onChange={(e) => setSeed(Math.trunc(Number(e.target.value)))}
                className="portfolio-input"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Nome da execução</span>
              <input
                value={runName}
                onChange={(e) => setRunName(e.target.value)}
                className="portfolio-input"
              />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {status === "parado" && (
              <Button onClick={() => start()} disabled={!preview.circuit} className="rounded-full">
                <Play /> Iniciar
              </Button>
            )}
            {status === "parado" && snapshot && (
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => start(snapshot, runId.current || undefined, createdAt.current)}
              >
                <RotateCcw /> Continuar do checkpoint
              </Button>
            )}
            {running && (
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => send({ type: "pause" })}
              >
                <Pause /> Pausar
              </Button>
            )}
            {status === "pausado" && (
              <Button
                className="rounded-full"
                onClick={() => {
                  setStatus("executando");
                  send({ type: "resume", budget });
                }}
              >
                <Play /> Retomar
              </Button>
            )}
            {status !== "parado" && (
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => send({ type: "stop" })}
              >
                <Square /> Cancelar
              </Button>
            )}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Roda num Web Worker do seu navegador. Equivalência exata até 8 qubits; de 9 a 20 qubits,
            teste com estados aleatórios; acima disso o candidato é rejeitado como não verificável.
            O custo é local e normalizado (original = 1); não é pontuação oficial de competição.
          </p>
        </Panel>
      </div>

      {(error || message) && (
        <p
          role="status"
          className={`rounded-xl border p-3 text-sm ${error ? "border-destructive text-destructive" : "border-border text-muted-foreground"}`}
        >
          {error ?? message}
        </p>
      )}

      {snapshot && best && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Estado", status],
              ["Iterações", String(snapshot.iteration)],
              ["Melhor custo", `${fmt(best.cost)} (${reduction(1, best.cost)} menor)`],
              [
                "Válidos / rejeitados",
                `${snapshot.counters.valid} / ${snapshot.counters.rejected}`,
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-border bg-card/60 p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Original × melhor candidato validado">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1">Métrica</th>
                    <th>Original</th>
                    <th>Melhor</th>
                    <th>Redução</th>
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map((key) => (
                    <tr key={key} className="border-t border-border">
                      <td className="py-1">{METRIC_LABELS[key]}</td>
                      <td>{snapshot.baseline[key]}</td>
                      <td>{best.metrics[key]}</td>
                      <td>{reduction(snapshot.baseline[key], best.metrics[key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground">
                Melhor: {best.id} ({best.strategy}) · {best.verification.method} · fidelidade{" "}
                {fmt(best.verification.fidelity, 10)}
              </p>
            </Panel>
            <Panel title="Evolução do custo">
              <HistoryChart history={snapshot.history} />
              <p className="text-xs text-muted-foreground">
                Linha: melhor global (nunca sobe). Pontos: candidatos válidos.
              </p>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Metaotimização (bandit UCB1)">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1">Estratégia</th>
                    <th>Execuções</th>
                    <th>Recompensa média</th>
                    <th>Novos melhores</th>
                    <th>ms médio</th>
                  </tr>
                </thead>
                <tbody>
                  {STRATEGIES.map((name) => {
                    const s = snapshot.stats[name];
                    return (
                      <tr key={name} className="border-t border-border">
                        <td className="py-1">{name}</td>
                        <td>{s.pulls}</td>
                        <td>{s.pulls ? fmt(s.rewardSum / s.pulls) : "—"}</td>
                        <td>{s.improvements}</td>
                        <td>{s.pulls ? fmt(s.totalMs / s.pulls, 1) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground">
                Temperatura SA {fmt(snapshot.temperature, 3)} · beam {snapshot.config.beamWidth} ·
                estagnação {snapshot.stagnation}/{snapshot.config.stagnationPatience}
              </p>
            </Panel>
            <Panel title="Fronteira de Pareto (T-count, 2 qubits, profundidade)">
              <ul className="grid max-h-56 gap-1 overflow-auto text-sm">
                {pareto.map((n) => (
                  <li key={n.id} className="flex justify-between gap-2 border-t border-border py-1">
                    <span>
                      {n.id} · {n.strategy}
                    </span>
                    <span className="text-muted-foreground">
                      T {n.metrics.tCount} · 2q {n.metrics.twoQubitCount} · prof. {n.metrics.depth}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Evolução cumulativa: genealogia e linhagens">
              <p className="mb-2 text-xs text-muted-foreground">
                Elites (linhagens vivas): {snapshot.elites.map((e) => e.nodeId).join(", ")}.
                Recuperar uma geração antiga a torna base de uma nova linhagem.
              </p>
              <ul className="grid max-h-72 gap-1 overflow-auto text-sm">
                {[...snapshot.nodes]
                  .reverse()
                  .slice(0, 60)
                  .map((n) => (
                    <li
                      key={n.id}
                      className="flex items-center justify-between gap-2 border-t border-border py-1"
                    >
                      <span>
                        <strong className={n.id === snapshot.bestId ? "text-primary" : ""}>
                          {n.id}
                        </strong>{" "}
                        ← {n.parentIds.join(" + ") || "raiz"} · {n.strategy} · {fmt(n.cost)}
                        <span className="text-muted-foreground">
                          {" "}
                          · {n.transformations.length} transf.
                        </span>
                      </span>
                      {n.circuit && !snapshot.elites.some((e) => e.nodeId === n.id) && (
                        <button
                          type="button"
                          className="text-xs text-primary underline"
                          onClick={() =>
                            running
                              ? send({ type: "recover", nodeId: n.id })
                              : setMessage("Inicie ou retome a execução para recuperar gerações.")
                          }
                        >
                          recuperar
                        </button>
                      )}
                    </li>
                  ))}
              </ul>
            </Panel>
            <Panel title="Interações entre melhorias e eventos">
              <ul className="grid max-h-36 gap-1 overflow-auto text-sm">
                {snapshot.interactions
                  .slice(-20)
                  .reverse()
                  .map((i) => (
                    <li
                      key={`${i.iteration}-${i.donors.join()}`}
                      className="border-t border-border py-1"
                    >
                      it. {i.iteration}: {i.donors.join(" + ")} → efeito <strong>{i.effect}</strong>{" "}
                      (combinado {fmt(i.combinedGain)} vs. melhor individual {fmt(i.bestSingleGain)}
                      )
                    </li>
                  ))}
                {snapshot.interactions.length === 0 && (
                  <li className="text-muted-foreground">Nenhuma recombinação ainda.</li>
                )}
              </ul>
              <ul className="mt-3 grid max-h-32 gap-1 overflow-auto text-xs text-muted-foreground">
                {snapshot.events
                  .slice(-10)
                  .reverse()
                  .map((e, k) => (
                    <li key={`${e.iteration}-${k}`}>
                      it. {e.iteration}: {e.message}
                    </li>
                  ))}
              </ul>
            </Panel>
          </div>

          <Panel title="Últimos experimentos">
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-1">It.</th>
                    <th>Estratégia</th>
                    <th>Pai</th>
                    <th>Custo</th>
                    <th>Válido</th>
                    <th>Verificação</th>
                    <th>ms</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.experiments
                    .slice(-30)
                    .reverse()
                    .map((x) => (
                      <tr key={x.iteration} className="border-t border-border">
                        <td className="py-1">{x.iteration}</td>
                        <td>{x.strategy}</td>
                        <td>{x.parentId}</td>
                        <td>
                          {x.cost === undefined ? "—" : fmt(x.cost)}
                          {x.newBest ? " ★" : ""}
                        </td>
                        <td>{x.valid ? "sim" : "não"}</td>
                        <td>{x.method}</td>
                        <td>{fmt(x.ms, 1)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Exportação e memória científica">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                disabled={!bestCircuit}
                onClick={() =>
                  bestCircuit &&
                  download(`qaie-melhor-${best.id}.qasm`, toQasm(bestCircuit), "text/plain")
                }
              >
                <Download /> Melhor circuito (.qasm)
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() =>
                  download(
                    `qaie-${snapshot.iteration}.checkpoint.json`,
                    JSON.stringify(snapshot),
                    "application/json",
                  )
                }
              >
                <Save /> Checkpoint (.json)
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => void exportVault()}>
                <FolderOpen />{" "}
                {canWriteVault() ? "Gravar no Vault do Obsidian" : "Notas Obsidian (.zip)"}
              </Button>
            </div>
          </Panel>
        </>
      )}

      {runs.length > 0 && (
        <Panel title="Execuções salvas neste navegador (IndexedDB)">
          <ul className="grid gap-1 text-sm">
            {runs.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-1"
              >
                <span>
                  {r.name} · it. {r.iteration} · custo {fmt(r.bestCost)} ·{" "}
                  {new Date(r.updatedAt).toLocaleString("pt-BR")}
                </span>
                <span className="flex gap-3 text-xs">
                  <button
                    type="button"
                    disabled={running}
                    className="text-primary underline disabled:opacity-50"
                    onClick={() => void restoreRun(r.id)}
                  >
                    carregar
                  </button>
                  <button
                    type="button"
                    disabled={running && r.id === runId.current}
                    className="text-destructive underline disabled:opacity-50"
                    onClick={() => void deleteRun(r.id).then(refreshRuns)}
                  >
                    excluir
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {checkpoints.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-semibold">Checkpoints da execução atual</h3>
              <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                {checkpoints.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={running}
                      className="rounded-full border border-border px-3 py-1 hover:border-primary disabled:opacity-50"
                      onClick={() => c.id !== undefined && void restoreCheckpoint(c.id)}
                    >
                      it. {c.iteration} · {fmt(c.bestCost, 3)}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      )}
    </div>
  );
}
