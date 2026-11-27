import { circuitHash } from "./circuit";
import type { EngineSnapshot } from "./engine";
import { toQasm } from "./qasm";

export const RESULT_FORMAT = "qaie-result";

export interface ExternalResult {
  format: typeof RESULT_FORMAT;
  version: 1;
  originalHash: string;
  environment: string;
  python?: string;
  numpy?: string;
  elapsedSeconds?: number;
  candidates: { qasm: string; label?: string; method?: string; fidelity?: number }[];
}

const PYTHON = String.raw`import json, math, os, re, sys, time
import numpy as np

P = json.loads(PAYLOAD)
T0 = time.time()
PI4 = math.pi / 4

def angle(text):
    expr = text.replace("pi", repr(math.pi))
    if not re.fullmatch(r"[0-9eE.+\-*/() ]+", expr):
        raise ValueError("ângulo não suportado: " + text)
    return float(eval(expr, {"__builtins__": {}}, {}))

def parse_qasm(src):
    n, gates = None, []
    for raw in src.splitlines():
        line = raw.split("//")[0].strip().rstrip(";").strip()
        if not line or line.startswith(("OPENQASM", "include")):
            continue
        m = re.fullmatch(r"qreg\s+q\[(\d+)\]", line)
        if m:
            n = int(m.group(1)); continue
        m = re.fullmatch(r"(\w+)(?:\(([^)]*)\))?\s+(.+)", line)
        if not m:
            raise ValueError("linha inválida: " + raw)
        params = [angle(a) for a in m.group(2).split(",")] if m.group(2) else []
        qubits = tuple(int(q) for q in re.findall(r"q\[(\d+)\]", m.group(3)))
        gates.append((m.group(1), qubits, params))
    return n, gates

S2 = 1 / math.sqrt(2)
FIXED = {
    "h": np.array([[S2, S2], [S2, -S2]], complex), "x": np.array([[0, 1], [1, 0]], complex),
    "y": np.array([[0, -1j], [1j, 0]]), "z": np.diag([1, -1]).astype(complex),
    "s": np.diag([1, 1j]), "sdg": np.diag([1, -1j]),
    "t": np.diag([1, np.exp(1j * PI4)]), "tdg": np.diag([1, np.exp(-1j * PI4)]),
}

def matrix(name, params):
    if name in FIXED: return FIXED[name]
    a = params[0] / 2
    if name == "rx": return np.array([[math.cos(a), -1j * math.sin(a)], [-1j * math.sin(a), math.cos(a)]])
    if name == "ry": return np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]], complex)
    if name == "rz": return np.diag([np.exp(-1j * a), np.exp(1j * a)])
    raise ValueError("porta não suportada: " + name)

def apply1(psi, U, q):
    return np.moveaxis(np.tensordot(U, psi, axes=([1], [q])), 0, q)

def controlled(psi, controls, target, U):
    idx = [slice(None)] * psi.ndim
    for c in controls: idx[c] = 1
    sub = psi[tuple(idx)]
    t = target - sum(1 for c in controls if c < target)
    psi = psi.copy()
    psi[tuple(idx)] = apply1(sub, U, t)
    return psi

def run(n, gates, psi):
    for name, q, params in gates:
        if name == "cx": psi = controlled(psi, [q[0]], q[1], FIXED["x"])
        elif name == "cz": psi = controlled(psi, [q[0]], q[1], FIXED["z"])
        elif name == "ccx": psi = controlled(psi, [q[0], q[1]], q[2], FIXED["x"])
        elif name == "swap": psi = np.swapaxes(psi, q[0], q[1])
        else: psi = apply1(psi, matrix(name, params), q[0])
    return psi

def equivalent(n, a, b, tol=1e-9):
    """U ≅ V up to one global phase: every basis column (n <= 10) or 8 random states."""
    rng = np.random.default_rng(int(P["seed"]))
    if n <= 10:
        inputs, method = (np.eye(2 ** n, dtype=complex)[k] for k in range(2 ** n)), "unitária exata (NumPy)"
    else:
        inputs, method = (v / np.linalg.norm(v) for v in (rng.normal(size=2 ** n) + 1j * rng.normal(size=2 ** n) for _ in range(8))), "estados aleatórios (NumPy)"
    phase, worst = None, 1.0
    for v in inputs:
        psi = v.reshape([2] * n)
        ov = np.vdot(run(n, a, psi).ravel(), run(n, b, psi).ravel())
        worst = min(worst, abs(ov) ** 2)
        if abs(abs(ov) - 1) > 1e-7: return False, method, worst
        if method.startswith("unitária"):
            phase = ov if phase is None else phase
            if abs(ov - phase) > 1e-7: return False, method, worst
    return worst >= 1 - tol, method, worst

INV = {"h": "h", "x": "x", "y": "y", "z": "z", "cx": "cx", "cz": "cz", "swap": "swap", "ccx": "ccx", "s": "sdg", "sdg": "s", "t": "tdg", "tdg": "t"}
STEPS = {"t": 1, "s": 2, "z": 4, "sdg": 6, "tdg": 7}
NAMES = [[], ["t"], ["s"], ["s", "t"], ["z"], ["z", "t"], ["sdg"], ["tdg"]]

def phase_of(g):
    if len(g[1]) != 1: return None
    if g[0] in STEPS: return STEPS[g[0]] * PI4
    if g[0] == "rz": return g[2][0]
    return None

def phase_gates(q, ph):
    ph = ph % (2 * math.pi)
    k = ph / PI4
    if abs(k - round(k)) < 1e-9: return [(name, (q,), []) for name in NAMES[round(k) % 8]]
    return [("rz", (q,), [ph])]

def simplify(gates):
    """Peephole: cancel inverse neighbours on the same wires and merge diagonal phases."""
    gates, changed = list(gates), True
    while changed:
        changed = False
        for i, g in enumerate(gates):
            for j in range(i + 1, len(gates)):
                h = gates[j]
                if not set(g[1]) & set(h[1]): continue
                if g[1] == h[1] and INV.get(g[0]) == h[0]:
                    del gates[j]; del gates[i]; changed = True
                elif g[1] == h[1] and g[0] in ("rx", "ry") and g[0] == h[0]:
                    gates[i:j + 1] = [(g[0], g[1], [g[2][0] + h[2][0]])] + gates[i + 1:j]; changed = True
                else:
                    pg, ph = phase_of(g), phase_of(h)
                    if pg is not None and ph is not None and g[1] == h[1]:
                        merged = phase_gates(g[1][0], pg + ph)
                        if len(merged) < 2:
                            gates[i:j + 1] = merged + gates[i + 1:j]; changed = True
                break
            if changed: break
    return gates

def to_qasm(n, gates):
    lines = ["OPENQASM 2.0;", 'include "qelib1.inc";', "qreg q[%d];" % n]
    for name, q, params in gates:
        p = "(" + ",".join(repr(float(a)) for a in params) + ")" if params else ""
        lines.append("%s%s %s;" % (name, p, ",".join("q[%d]" % x for x in q)))
    return "\n".join(lines) + "\n"

if os.path.exists("/kaggle"): ENV = "kaggle"
elif "google.colab" in sys.modules or os.path.exists("/content"): ENV = "colab"
elif sys.platform == "darwin": ENV = "mac"
else: ENV = "jupyter"

n, original = parse_qasm(P["originalQasm"])
_, best = parse_qasm(P["bestQasm"])
candidates = []
for label, gates in (("melhor importado + peephole", simplify(best)), ("original + peephole", simplify(original))):
    ok, method, fid = equivalent(n, original, gates)
    print("%-28s portas=%-6d equivalente=%s (%s, fidelidade %.12f)" % (label, len(gates), ok, method, fid))
    if ok: candidates.append({"qasm": to_qasm(n, gates), "label": label, "method": method, "fidelity": fid})

result = {"format": "qaie-result", "version": 1, "originalHash": P["originalHash"], "environment": ENV,
          "python": sys.version.split()[0], "numpy": np.__version__, "elapsedSeconds": time.time() - T0, "candidates": candidates}
out = os.path.join("/kaggle/working" if ENV == "kaggle" else ".", "qaie-result.json")
with open(out, "w") as fh: json.dump(result, fh)
print("Resultado gravado em", out, "— importe-o no Laboratório quântico; ele será verificado de novo no navegador.")
`;

const cell = (cell_type: "markdown" | "code", source: string) => ({
  cell_type,
  metadata: {},
  source: source.split(/(?<=\n)/),
  ...(cell_type === "code" ? { execution_count: null, outputs: [] } : {}),
});

/** Jupyter notebook (Kaggle, Colab, local Jupyter on a Mac) that re-verifies and refines the best circuit with NumPy. */
export function buildNotebook(snapshot: EngineSnapshot, runName: string): string {
  const best =
    snapshot.elites.find((e) => e.nodeId === snapshot.bestId)?.circuit ?? snapshot.original;
  const payload = {
    runName,
    seed: snapshot.config.seed,
    originalHash: circuitHash(snapshot.original),
    originalQasm: toQasm(snapshot.original),
    bestQasm: toQasm(best),
  };
  const notebook = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { name: "python3", display_name: "Python 3", language: "python" },
      language_info: { name: "python" },
    },
    cells: [
      cell(
        "markdown",
        `# QAIE — pacote de experimento: ${runName}\n\nGerado pelo Laboratório quântico (iteração ${snapshot.iteration}, semente ${snapshot.config.seed}). Requer apenas Python 3 e NumPy.\n\n1. Execute as células.\n2. Baixe \`qaie-result.json\`.\n3. Importe-o no Laboratório: cada circuito é verificado de novo no navegador antes de entrar na genealogia. Nenhuma pontuação deste notebook é aceita diretamente.\n`,
      ),
      cell("code", `PAYLOAD = ${JSON.stringify(JSON.stringify(payload))}\n`),
      cell("code", PYTHON),
    ],
  };
  return JSON.stringify(notebook, null, 1);
}

export function parseExternalResult(text: string): ExternalResult | undefined {
  const data = JSON.parse(text) as Partial<ExternalResult>;
  if (data.format !== RESULT_FORMAT) return undefined;
  if (
    data.version !== 1 ||
    !Array.isArray(data.candidates) ||
    typeof data.originalHash !== "string"
  ) {
    throw new Error("Resultado externo inválido.");
  }
  return data as ExternalResult;
}
