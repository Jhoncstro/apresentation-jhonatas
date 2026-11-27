import { useMemo, useState } from "react";
import type { Circuit } from "@/lib/qaie/circuit";
import type { EngineSnapshot } from "@/lib/qaie/engine";
import type { IslandState } from "./distributed-center";

const COLORS = { candidate: "#c084fc", best: "#a3e635", imported: "#fb923c", original: "#94a3b8" };
const position = (i: number) => {
  const angle = i * 2.399963;
  const radius = 28 + Math.sqrt(i) * 15;
  return { x: 300 + Math.cos(angle) * radius * 1.35, y: 218 + Math.sin(angle) * radius };
};

/** Bounded SVG view of reported data; no extra simulation, timers or network requests. */
export function QuantumGraph({
  circuit,
  snapshot,
  islands,
  running,
}: {
  circuit?: Circuit | undefined;
  snapshot?: EngineSnapshot | undefined;
  islands: IslandState[];
  running: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string>();
  const nodes = useMemo(() => {
    if (!snapshot) return [];
    const ids = new Set([
      snapshot.nodes[0]?.id,
      snapshot.bestId,
      ...snapshot.nodes.slice(-78).map((n) => n.id),
    ]);
    return snapshot.nodes
      .filter((n) => ids.has(n.id))
      .map((node, i) => ({ ...node, ...position(i) }));
  }, [snapshot]);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const selected = byId.get(selectedId ?? "") ?? byId.get(snapshot?.bestId ?? "");
  const qubits = Array.from({ length: circuit?.numQubits ?? 0 }, (_, i) => {
    const angle = (i * Math.PI * 2) / (circuit?.numQubits || 1) - Math.PI / 2;
    return { x: 300 + Math.cos(angle) * 145, y: 215 + Math.sin(angle) * 120 };
  });
  const links = useMemo(() => {
    const counts = new Map<string, { a: number; b: number; count: number }>();
    for (const gate of circuit?.gates ?? []) {
      for (let i = 0; i < gate.qubits.length; i++) {
        for (let j = i + 1; j < gate.qubits.length; j++) {
          const [a, b] = [gate.qubits[i]!, gate.qubits[j]!].sort((a, b) => a - b);
          const key = `${a}:${b}`;
          counts.set(key, { a: a!, b: b!, count: (counts.get(key)?.count ?? 0) + 1 });
        }
      }
    }
    return [...counts.values()];
  }, [circuit]);

  return (
    <div
      className="qaie-graph overflow-hidden rounded-xl border border-white/10 bg-[#10151f] text-slate-200"
      data-running={running}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 text-xs">
        <span className="font-medium tracking-wide">
          {snapshot ? "Evolução dos circuitos" : "Mapa do circuito"}
        </span>
        <span className="flex items-center gap-2 text-slate-400">
          <span
            className={`h-1.5 w-1.5 rounded-full ${running ? "bg-lime-400" : "bg-slate-500"}`}
          />
          {running ? "Ao vivo" : snapshot ? "Último estado recebido" : "Pronto para iniciar"}
        </span>
      </div>
      <svg
        viewBox="0 0 600 390"
        className="block w-full"
        aria-label={
          snapshot
            ? "Genealogia dos candidatos e atividade dos workers"
            : "Qubits e suas interações no circuito de entrada"
        }
        role="group"
      >
        <defs>
          <radialGradient id="qaie-graph-glow">
            <stop stopColor="#a855f7" stopOpacity="0.12" />
            <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="300" cy="215" rx="270" ry="175" fill="url(#qaie-graph-glow)" />
        {[75, 120, 165].map((r) => (
          <ellipse
            key={r}
            cx="300"
            cy="218"
            rx={r * 1.35}
            ry={r}
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.035"
          />
        ))}
        {snapshot ? (
          <>
            {nodes.flatMap((n) =>
              n.parentIds.map((id) => {
                const parent = byId.get(id);
                return parent ? (
                  <line
                    key={`${id}-${n.id}`}
                    x1={parent.x}
                    y1={parent.y}
                    x2={n.x}
                    y2={n.y}
                    stroke={n.id === snapshot.bestId ? COLORS.best : COLORS.candidate}
                    strokeOpacity="0.25"
                  />
                ) : null;
              }),
            )}
            {nodes.map((n) => {
              const color =
                n.id === snapshot.bestId
                  ? COLORS.best
                  : n.strategy === "original"
                    ? COLORS.original
                    : n.strategy === "importado"
                      ? COLORS.imported
                      : COLORS.candidate;
              return (
                <g
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Candidato ${n.id}, custo ${n.cost.toFixed(4)}`}
                  onClick={() => setSelectedId(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(n.id);
                    }
                  }}
                  className="qaie-graph-node cursor-pointer"
                  style={{ color }}
                >
                  <title>
                    {n.id} · {n.strategy} · custo {n.cost.toFixed(4)}
                  </title>
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.id === snapshot.bestId ? 18 : 11}
                    fill="currentColor"
                    opacity="0.09"
                  />
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.id === snapshot.bestId ? 7 : 4}
                    fill="currentColor"
                  />
                  {selected?.id === n.id && (
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r="12"
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.6"
                    />
                  )}
                </g>
              );
            })}
          </>
        ) : (
          <>
            {links.map(({ a, b, count }) => (
              <line
                key={`${a}:${b}`}
                x1={qubits[a]?.x}
                y1={qubits[a]?.y}
                x2={qubits[b]?.x}
                y2={qubits[b]?.y}
                stroke={COLORS.candidate}
                strokeWidth={Math.min(4, 1 + Math.log2(count))}
                strokeOpacity="0.35"
              >
                <title>
                  {count} porta(s) entre q{a} e q{b}
                </title>
              </line>
            ))}
            {qubits.map((q, i) => (
              <g key={i}>
                <circle cx={q.x} cy={q.y} r="18" fill={COLORS.candidate} opacity="0.1" />
                <circle cx={q.x} cy={q.y} r="5" fill={COLORS.candidate} />
                <text x={q.x} y={q.y + 30} textAnchor="middle" fill="#cbd5e1" fontSize="12">
                  q{i}
                </text>
              </g>
            ))}
            <text x="300" y="218" textAnchor="middle" fill="#94a3b8" fontSize="12">
              {circuit
                ? `${circuit.numQubits} qubits · ${circuit.gates.length} portas`
                : "Carregue um circuito válido"}
            </text>
          </>
        )}
        {islands.map((w, i) => {
          const x = (600 * (i + 1)) / (islands.length + 1);
          const active = running && w.running;
          return (
            <g key={w.index} className={active ? "qaie-worker-active" : ""}>
              <title>
                Worker {w.index}: {w.iteration} iterações · custo {w.bestCost.toFixed(4)} · {w.sent}{" "}
                melhorias enviadas
              </title>
              <line
                x1={x}
                y1="64"
                x2="300"
                y2="200"
                stroke={active ? "#67e8f9" : "#475569"}
                strokeOpacity="0.2"
                strokeDasharray="3 8"
                className="qaie-worker-link"
              />
              <circle
                cx={x}
                cy="43"
                r="18"
                fill="#0f2630"
                stroke="#67e8f9"
                strokeOpacity={active ? 0.7 : 0.2}
              />
              <circle
                cx={x}
                cy="43"
                r="11"
                fill="none"
                stroke="#67e8f9"
                className="qaie-worker-pulse"
                opacity="0.25"
              />
              <text x={x} y="47" textAnchor="middle" fill="#a5f3fc" fontSize="10">
                W{w.index}
              </text>
              <text x={x} y="15" textAnchor="middle" fill="#94a3b8" fontSize="9">
                {w.iteration} it.
              </text>
            </g>
          );
        })}
      </svg>
      <div className="border-t border-white/10 px-4 py-3 text-xs">
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-slate-400">
          <span>
            <span className="text-purple-400">●</span> {snapshot ? "Candidato" : "Qubit"}
          </span>
          {snapshot && (
            <>
              <span>
                <span className="text-lime-400">●</span> Melhor
              </span>
              <span>
                <span className="text-orange-400">●</span> Importado
              </span>
            </>
          )}
          <span>
            <span className="text-cyan-300">●</span> Worker
          </span>
        </div>
        {selected ? (
          <p className="leading-relaxed text-slate-300">
            {selected.id} · {selected.strategy} · custo{" "}
            <strong className="text-lime-300">{selected.cost.toFixed(4)}</strong>
            <br />
            <span className="text-slate-400">
              {selected.verification.method} · geração {selected.generation}. {nodes.length}/
              {snapshot?.nodes.length} candidatos visíveis no hub.
            </span>
          </p>
        ) : (
          <p className="leading-relaxed text-slate-400">
            As conexões representam portas entre qubits. Inicie para acompanhar workers e genealogia
            real dos candidatos.
          </p>
        )}
      </div>
    </div>
  );
}
