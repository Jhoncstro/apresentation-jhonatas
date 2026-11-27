import { toQasm } from "./qasm";
import { METRIC_LABELS, type CircuitMetrics, type MetricKey } from "./metrics";
import type { EngineSnapshot, LineageNode } from "./engine";
import type { Transformation } from "./rewrite";

export interface VaultFile {
  path: string;
  content: string;
}

const pct = (value: number) => `${(value * 100).toFixed(2)}%`;
const keys = Object.keys(METRIC_LABELS) as MetricKey[];

function metricTable(baseline: CircuitMetrics, metrics: CircuitMetrics): string {
  const rows = keys.map((k) => {
    const delta = baseline[k] === 0 ? 0 : (metrics[k] - baseline[k]) / baseline[k];
    return `| ${METRIC_LABELS[k]} | ${baseline[k]} | ${metrics[k]} | ${baseline[k] === 0 ? "—" : pct(delta)} |`;
  });
  return ["| Métrica | Original | Candidato | Variação |", "|---|---|---|---|", ...rows].join("\n");
}

function describe(t: Transformation): string {
  const fmt = (gs: Transformation["window"]) =>
    gs
      .map(
        (g) =>
          `${g.name}${g.params?.length ? `(${g.params.map((p) => p.toFixed(4)).join(",")})` : ""} ${g.qubits.join(",")}`,
      )
      .join("; ") || "∅";
  return `- **${t.rule}**: \`${fmt(t.window)}\` → \`${fmt(t.replacement)}\``;
}

function nodeNote(run: string, node: LineageNode, snapshot: EngineSnapshot): string {
  const children = snapshot.nodes
    .filter((n) => n.parentIds.includes(node.id))
    .map((n) => `[[${n.id}]]`);
  return `---
tipo: candidato-qaie
execucao: "${run}"
id: ${node.id}
geracao: ${node.generation}
iteracao: ${node.iteration}
estrategia: "${node.strategy}"
ambiente: "${node.origin ?? "navegador · worker 0"}"
custo: ${node.cost.toFixed(6)}
verificacao: "${node.verification.method}"
fidelidade: ${node.verification.fidelity.toFixed(12)}
melhor_global: ${node.id === snapshot.bestId}
tags: [qaie, cee, candidato]
---
# ${node.id} — ${node.strategy}

**Origem:** ${node.parentIds.length ? node.parentIds.map((p) => `[[${p}]]`).join(", ") : "circuito original"}
**Descendentes:** ${children.join(", ") || "nenhum"}
**Contribuição:** custo ponderado ${node.cost.toFixed(6)} (original = 1.000000)

## Evidência matemática
- Método: ${node.verification.method}
- Fidelidade mínima: ${node.verification.fidelity.toFixed(12)}
- ${node.verification.detail}

## Métricas
${metricTable(snapshot.baseline, node.metrics)}

## Transformações (dependências em relação a [[${node.parentIds[0] ?? "original"}]])
${node.transformations.map(describe).join("\n") || "- nenhuma registrada (simplificação determinística ou original)"}
${node.circuit ? `\n## Circuito\n\`\`\`qasm\n${toQasm(node.circuit)}\`\`\`\n` : ""}`;
}

/** Builds an Obsidian-compatible vault folder for one run (Markdown + YAML front matter + wiki links). */
/** File/folder name safe for vaults and ZIP extraction: no separators, no dot segments. */
export function safeSegment(value: string, fallback: string): string {
  const cleaned = value
    .replace(/[^\p{L}\p{N} _.-]/gu, "-")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 80);
  return cleaned || fallback;
}

export function buildVault(runName: string, snapshot: EngineSnapshot, runId = ""): VaultFile[] {
  const folder = safeSegment(runName, "execucao");
  const base = `QAIE/${runId ? `${folder} · ${safeSegment(runId, "execucao")}` : folder}`;
  const best = snapshot.nodes.find((n) => n.id === snapshot.bestId);
  const bestElite = snapshot.elites.find((e) => e.nodeId === snapshot.bestId);
  const stats = Object.entries(snapshot.stats)
    .map(
      ([name, s]) =>
        `| ${name} | ${s.pulls} | ${s.pulls ? (s.rewardSum / s.pulls).toFixed(4) : "—"} | ${s.improvements} | ${s.pulls ? (s.totalMs / s.pulls).toFixed(1) : "—"} |`,
    )
    .join("\n");
  const files: VaultFile[] = [
    {
      path: `${base}/Índice.md`,
      content: `---
tipo: execucao-qaie
iteracoes: ${snapshot.iteration}
melhor: ${snapshot.bestId}
custo_melhor: ${best?.cost.toFixed(6) ?? "1"}
semente: ${snapshot.config.seed}
tags: [qaie, execucao]
---
# ${runName}

Melhor candidato validado: [[${snapshot.bestId}]] (custo ${best?.cost.toFixed(6)}).
Candidatos válidos: ${snapshot.counters.valid} · rejeitados: ${snapshot.counters.rejected} · duplicados: ${snapshot.counters.duplicates}.

> Custo ponderado local, normalizado pelo circuito original. Não é uma pontuação oficial de competição.

## Métricas do melhor candidato
${best ? metricTable(snapshot.baseline, best.metrics) : ""}

## Estratégias (bandit UCB1)
| Estratégia | Execuções | Recompensa média | Novos melhores | ms médio |
|---|---|---|---|---|
${stats}

## Notas
- [[Genealogia]] · [[Interações]] · [[Eventos]] · [[Configuração]]
`,
    },
    {
      path: `${base}/Genealogia.md`,
      content: `# Genealogia\n\n${snapshot.nodes
        .map(
          (n) =>
            `- [[${n.id}]] ← ${n.parentIds.map((p) => `[[${p}]]`).join(" + ") || "raiz"} · ${n.strategy} · custo ${n.cost.toFixed(6)}`,
        )
        .join("\n")}\n`,
    },
    {
      path: `${base}/Interações.md`,
      content: `# Interações entre melhorias\n\nRecombinação aplica as transformações do doador sobre o circuito do receptor e reavalia o resultado; nenhuma pontuação é somada.\n\n| Iteração | Linhagens | Ganho combinado | Melhor ganho individual | Efeito |\n|---|---|---|---|---|\n${snapshot.interactions
        .map(
          (i) =>
            `| ${i.iteration} | [[${i.donors[0]}]] + [[${i.donors[1]}]] | ${i.combinedGain.toFixed(6)} | ${i.bestSingleGain.toFixed(6)} | ${i.effect} |`,
        )
        .join("\n")}\n`,
    },
    {
      path: `${base}/Eventos.md`,
      content: `# Eventos\n\n${snapshot.events.map((e) => `- iteração ${e.iteration}: ${e.message}`).join("\n") || "- nenhum"}\n`,
    },
    {
      path: `${base}/Configuração.md`,
      content: `# Configuração\n\n\`\`\`json\n${JSON.stringify(snapshot.config, null, 2)}\n\`\`\`\n`,
    },
    ...snapshot.nodes.map((n) => ({
      path: `${base}/Candidatos/${safeSegment(n.id, "candidato")}.md`,
      content: nodeNote(runName, n, snapshot),
    })),
  ];
  if (bestElite) files.push({ path: `${base}/melhor.qasm`, content: toQasm(bestElite.circuit) });
  return files;
}

interface WritableDirectory {
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<WritableDirectory>;
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<{
    createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
  }>;
}

export const canWriteVault = () => typeof window !== "undefined" && "showDirectoryPicker" in window;

/** Writes files into a user-selected Obsidian vault folder (Chromium File System Access API). */
export async function writeVault(files: VaultFile[]): Promise<number> {
  const picker = (
    window as unknown as { showDirectoryPicker(o?: { mode: string }): Promise<WritableDirectory> }
  ).showDirectoryPicker;
  const root = await picker({ mode: "readwrite" });
  for (const file of files) {
    const parts = file.path.split("/");
    const name = parts.pop() as string;
    let dir = root;
    for (const part of parts) dir = await dir.getDirectoryHandle(part, { create: true });
    const writable = await (await dir.getFileHandle(name, { create: true })).createWritable();
    await writable.write(file.content);
    await writable.close();
  }
  return files.length;
}
