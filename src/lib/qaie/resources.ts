export type EnvironmentStatus = "conectado" | "exportação manual" | "não implementado";

export interface ComputeEnvironment {
  id: string;
  name: string;
  group: "Local" | "Navegador" | "Científico externo" | "Nuvem" | "Automação";
  status: EnvironmentStatus;
  note: string;
}

/**
 * Real availability in this static site. "conectado" = runs from this page; "exportação manual" =
 * the page produces a notebook/checkpoint package the user runs there and imports back;
 * "não implementado" = listed for the roadmap only. Free tiers and quotas must be checked on each
 * provider's official terms before use; nothing here bypasses them or contracts paid services.
 */
export const ENVIRONMENTS: ComputeEnvironment[] = [
  {
    id: "browser-workers",
    name: "Web Workers",
    group: "Navegador",
    status: "conectado",
    note: "Pool de workers paralelos com migração de elites entre ilhas.",
  },
  {
    id: "indexeddb",
    name: "IndexedDB",
    group: "Navegador",
    status: "conectado",
    note: "Execuções e checkpoints locais do navegador.",
  },
  {
    id: "webgpu",
    name: "WebGPU",
    group: "Navegador",
    status: "não implementado",
    note: "Detectado, mas a simulação ainda roda em CPU.",
  },
  {
    id: "wasm",
    name: "WebAssembly",
    group: "Navegador",
    status: "não implementado",
    note: "Detectado; não há núcleo WASM compilado.",
  },
  {
    id: "kaggle",
    name: "Kaggle Notebooks",
    group: "Científico externo",
    status: "exportação manual",
    note: "Importe o .ipynb gerado; o resultado volta como qaie-result.json.",
  },
  {
    id: "colab",
    name: "Google Colab",
    group: "Científico externo",
    status: "exportação manual",
    note: "Mesmo pacote .ipynb (NumPy).",
  },
  {
    id: "jupyter",
    name: "Jupyter / JupyterHub",
    group: "Científico externo",
    status: "exportação manual",
    note: "Mesmo pacote .ipynb (NumPy).",
  },
  {
    id: "mac",
    name: "Mac (Python local)",
    group: "Local",
    status: "exportação manual",
    note: "Rode o .ipynb no Jupyter local; não há conector direto com o Mac.",
  },
  {
    id: "qiskit",
    name: "Qiskit / Cirq / PyZX",
    group: "Local",
    status: "não implementado",
    note: "O notebook usa apenas NumPy.",
  },
  {
    id: "hf",
    name: "Hugging Face Spaces",
    group: "Científico externo",
    status: "não implementado",
    note: "Sem adaptador.",
  },
  {
    id: "gcp",
    name: "Google Cloud",
    group: "Nuvem",
    status: "não implementado",
    note: "Sem adaptador; orçamento de servidores R$ 0.",
  },
  {
    id: "oracle",
    name: "Oracle Cloud",
    group: "Nuvem",
    status: "não implementado",
    note: "Sem adaptador; orçamento de servidores R$ 0.",
  },
  {
    id: "azure",
    name: "Microsoft Azure",
    group: "Nuvem",
    status: "não implementado",
    note: "Sem adaptador; orçamento de servidores R$ 0.",
  },
  {
    id: "aws",
    name: "AWS",
    group: "Nuvem",
    status: "não implementado",
    note: "Sem adaptador; orçamento de servidores R$ 0.",
  },
  {
    id: "actions",
    name: "GitHub Actions",
    group: "Automação",
    status: "conectado",
    note: "Testes do motor (vitest) rodam no CI do repositório; não executa otimizações.",
  },
  {
    id: "docker",
    name: "Docker",
    group: "Automação",
    status: "não implementado",
    note: "Sem imagem publicada.",
  },
];

export interface DetectedResources {
  cores: number;
  deviceMemoryGB?: number;
  webgpu: boolean;
  wasm: boolean;
  storageUsageMB?: number;
  storageQuotaMB?: number;
  crossOriginIsolated: boolean;
}

export async function detectResources(): Promise<DetectedResources> {
  const nav = (typeof navigator !== "undefined" ? navigator : {}) as Navigator & {
    deviceMemory?: number;
    gpu?: unknown;
  };
  const result: DetectedResources = {
    cores: nav.hardwareConcurrency || 1,
    webgpu: "gpu" in nav && !!nav.gpu,
    wasm: typeof WebAssembly === "object",
    crossOriginIsolated: typeof crossOriginIsolated !== "undefined" && crossOriginIsolated,
  };
  if (nav.deviceMemory) result.deviceMemoryGB = nav.deviceMemory;
  try {
    const estimate = await nav.storage?.estimate?.();
    if (estimate?.usage !== undefined) result.storageUsageMB = estimate.usage / 2 ** 20;
    if (estimate?.quota !== undefined) result.storageQuotaMB = estimate.quota / 2 ** 20;
  } catch {
    // Storage estimate is optional.
  }
  return result;
}

/** Suggested placement by problem size (state-vector cost grows as 2^n). */
export function recommendEnvironment(
  numQubits: number,
  gateCount: number,
): { id: string; reason: string } {
  if (numQubits <= 12 && gateCount <= 20000)
    return {
      id: "browser-workers",
      reason: "Circuito pequeno: verificação exata ou amostrada rápida no navegador.",
    };
  if (numQubits <= 20)
    return {
      id: "browser-workers",
      reason:
        "Até 20 qubits: o navegador verifica por estados aleatórios, mas cada verificação é cara; use poucos workers.",
    };
  return {
    id: "kaggle",
    reason:
      "Acima de 20 qubits o navegador não verifica; exporte o pacote para um notebook e importe o resultado.",
  };
}

export const defaultWorkerCount = (cores: number) => Math.max(1, Math.min(4, cores - 1));
