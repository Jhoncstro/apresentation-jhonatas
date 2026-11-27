import type { EngineSnapshot } from "@/lib/qaie/engine";
import { type DetectedResources, ENVIRONMENTS, type EnvironmentStatus } from "@/lib/qaie/resources";

export interface IslandState {
  index: number;
  seed: number;
  running: boolean;
  iteration: number;
  bestCost: number;
  cpuMs: number;
  sent: number;
}

const BADGE: Record<EnvironmentStatus, string> = {
  conectado: "border-primary text-primary",
  "exportação manual": "border-accent text-accent",
  "não implementado": "border-border text-muted-foreground",
};

const fmt = (value: number, digits = 3) => (Number.isFinite(value) ? value.toFixed(digits) : "—");

export function DistributedCenter({
  resources,
  recommendation,
  islands,
  snapshot,
  checkpointCount,
  vaultSyncedAt,
  workerCount,
  onWorkerCount,
  running,
}: {
  resources?: DetectedResources | undefined;
  recommendation?: { id: string; reason: string } | undefined;
  islands: IslandState[];
  snapshot?: EngineSnapshot | undefined;
  checkpointCount: number;
  vaultSyncedAt?: number | undefined;
  workerCount: number;
  onWorkerCount: (n: number) => void;
  running: boolean;
}) {
  const byOrigin = new Map<string, { count: number; best: number }>();
  for (const node of snapshot?.nodes ?? []) {
    if (node.id === "g0") continue;
    const origin = node.origin ?? "navegador · worker 0";
    const entry = byOrigin.get(origin) ?? { count: 0, best: Infinity };
    byOrigin.set(origin, { count: entry.count + 1, best: Math.min(entry.best, node.cost) });
  }
  const distributed = (snapshot?.nodes ?? []).filter((n) => n.strategy === "importado");
  const recommended = ENVIRONMENTS.find((e) => e.id === recommendation?.id);

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5">
      <h2 className="text-base font-semibold">Distributed Computing Center</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Somente o navegador executa daqui. Kaggle, Colab, Jupyter e Mac recebem um pacote .ipynb e
        devolvem qaie-result.json, que é verificado de novo antes de entrar na genealogia. Custo
        estimado: R$ 0, sem serviços pagos.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Núcleos lógicos", resources ? String(resources.cores) : "—"],
          [
            "Memória do dispositivo",
            resources?.deviceMemoryGB ? `${resources.deviceMemoryGB} GB (aprox.)` : "não informada",
          ],
          [
            "WebGPU / WASM",
            resources
              ? `${resources.webgpu ? "sim" : "não"} / ${resources.wasm ? "sim" : "não"} (não usados)`
              : "—",
          ],
          [
            "Armazenamento local",
            resources?.storageQuotaMB
              ? `${fmt(resources.storageUsageMB ?? 0, 1)} de ${fmt(resources.storageQuotaMB, 0)} MB`
              : "—",
          ],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4 text-sm">
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Workers paralelos (ilhas)</span>
          <input
            type="number"
            min={1}
            max={Math.max(1, resources?.cores ?? 4)}
            value={workerCount}
            disabled={running}
            onChange={(e) =>
              onWorkerCount(
                Math.max(1, Math.min(resources?.cores ?? 4, Math.trunc(Number(e.target.value)))),
              )
            }
            className="portfolio-input w-32"
          />
        </label>
        {recommended && (
          <p className="text-xs text-muted-foreground">
            Recomendado para este circuito:{" "}
            <strong className="text-foreground">{recommended.name}</strong>.{" "}
            {recommendation?.reason}
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Experimentos ativos e fila</h3>
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1">Worker</th>
                <th>Semente</th>
                <th>Estado</th>
                <th>It.</th>
                <th>Melhor</th>
                <th>CPU s</th>
                <th>Ganho/CPU s</th>
                <th>Enviados</th>
              </tr>
            </thead>
            <tbody>
              {islands.map((w) => (
                <tr key={w.index} className="border-t border-border">
                  <td className="py-1">{w.index === 0 ? "0 (hub)" : w.index}</td>
                  <td>{w.seed}</td>
                  <td>{w.running ? "executando" : "parado"}</td>
                  <td>{w.iteration}</td>
                  <td>{fmt(w.bestCost, 4)}</td>
                  <td>{fmt(w.cpuMs / 1000, 1)}</td>
                  <td>{w.cpuMs > 0 ? fmt((1 - w.bestCost) / (w.cpuMs / 1000), 4) : "—"}</td>
                  <td>{w.index === 0 ? "—" : w.sent}</td>
                </tr>
              ))}
              {islands.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-2 text-muted-foreground">
                    Nenhum worker ativo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <h3 className="mb-2 mt-4 text-sm font-semibold">Melhorias por ambiente</h3>
          <ul className="grid gap-1 text-xs">
            {[...byOrigin.entries()].map(([origin, v]) => (
              <li key={origin} className="flex justify-between border-t border-border py-1">
                <span>{origin}</span>
                <span className="text-muted-foreground">
                  {v.count} candidatos · melhor {fmt(v.best, 4)}
                </span>
              </li>
            ))}
            {byOrigin.size === 0 && (
              <li className="text-muted-foreground">Sem candidatos ainda.</li>
            )}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Checkpoints neste navegador: {checkpointCount} · Obsidian:{" "}
            {vaultSyncedAt
              ? `exportado em ${new Date(vaultSyncedAt).toLocaleTimeString("pt-BR")}`
              : "não exportado nesta sessão"}
          </p>
          <h3 className="mb-2 mt-4 text-sm font-semibold">Histórico de resultados distribuídos</h3>
          <ul className="grid max-h-32 gap-1 overflow-auto text-xs">
            {distributed
              .slice(-20)
              .reverse()
              .map((n) => (
                <li key={n.id} className="border-t border-border py-1">
                  {n.id} de {n.origin} · custo {fmt(n.cost, 4)} · {n.verification.method}
                  {n.id === snapshot?.bestId ? " · melhor global" : ""}
                </li>
              ))}
            {distributed.length === 0 && (
              <li className="text-muted-foreground">Nenhum candidato importado ainda.</li>
            )}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Ambientes</h3>
          <ul className="grid gap-1 text-xs">
            {ENVIRONMENTS.map((env) => (
              <li
                key={env.id}
                className="flex items-start justify-between gap-3 border-t border-border py-1"
              >
                <span>
                  <strong>{env.name}</strong>{" "}
                  <span className="text-muted-foreground">· {env.group}</span>
                  <br />
                  <span className="text-muted-foreground">{env.note}</span>
                </span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 ${BADGE[env.status]}`}>
                  {env.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
