import {
  GATE_ARITY,
  PARAMETRIC,
  type Circuit,
  type Gate,
  type GateName,
  validateCircuit,
} from "./circuit";

const ALIASES: Record<string, GateName> = {
  cnot: "cx",
  toffoli: "ccx",
  u1: "rz",
  p: "rz",
  phase: "rz",
};
const IGNORED = new Set(["barrier", "creg", "include", "OPENQASM", "id"]);
const MAX_QUBITS = 64;
const MAX_GATES = 200_000;

function evaluateAngle(expression: string): number {
  const source = expression.replace(/\s+/g, "").replace(/pi/gi, `(${Math.PI})`);
  if (!/^[0-9+\-*/().eE]+$/.test(source)) throw new Error(`Ângulo inválido: ${expression}.`);
  let index = 0;
  const peek = () => source[index];
  const number = (): number => {
    if (peek() === "(") {
      index++;
      const value = sum();
      if (peek() !== ")") throw new Error(`Parêntese ausente em ${expression}.`);
      index++;
      return value;
    }
    if (peek() === "-") {
      index++;
      return -number();
    }
    if (peek() === "+") {
      index++;
      return number();
    }
    const match = /^\d*\.?\d+(?:[eE][+-]?\d+)?/.exec(source.slice(index));
    if (!match) throw new Error(`Ângulo inválido: ${expression}.`);
    index += match[0].length;
    return Number(match[0]);
  };
  const product = (): number => {
    let value = number();
    while (peek() === "*" || peek() === "/") {
      const operator = source[index++];
      const right = number();
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };
  const sum = (): number => {
    let value = product();
    while (peek() === "+" || peek() === "-") {
      const operator = source[index++];
      const right = product();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };
  const value = sum();
  if (index !== source.length || !Number.isFinite(value))
    throw new Error(`Ângulo inválido: ${expression}.`);
  return value;
}

/** Parses the OpenQASM 2.0 subset used by the lab (qelib1 gates listed in GATE_ARITY). */
export function parseQasm(source: string): Circuit {
  const registers = new Map<string, { offset: number; size: number }>();
  let numQubits = 0;
  const gates: Gate[] = [];
  const statements = source
    .replace(/\/\/[^\n]*/g, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  const resolve = (operand: string): number[] => {
    const indexed = /^([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]$/.exec(operand);
    if (indexed) {
      const register = registers.get(indexed[1] ?? "");
      const position = Number(indexed[2]);
      if (!register || position >= register.size)
        throw new Error(`Qubit desconhecido: ${operand}.`);
      return [register.offset + position];
    }
    const register = registers.get(operand);
    if (!register) throw new Error(`Registrador desconhecido: ${operand}.`);
    return Array.from({ length: register.size }, (_, i) => register.offset + i);
  };
  const measured = new Set<number>();
  for (const statement of statements) {
    const head = /^([A-Za-z_]\w*)/.exec(statement)?.[1] ?? "";
    if (IGNORED.has(head)) continue;
    if (head === "measure") {
      // Terminal measurements are dropped (the unitary part is optimized); a gate after one is rejected.
      const target = /^measure\s+(.+?)\s*->/.exec(statement)?.[1];
      if (!target) throw new Error(`Medição inválida: ${statement}.`);
      resolve(target).forEach((q) => measured.add(q));
      continue;
    }
    if (head === "qreg") {
      const match = /^qreg\s+([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]$/.exec(statement);
      if (!match) throw new Error(`Declaração qreg inválida: ${statement}.`);
      const size = Number(match[2]);
      registers.set(match[1] ?? "", { offset: numQubits, size });
      numQubits += size;
      if (numQubits > MAX_QUBITS) throw new Error(`Limite de ${MAX_QUBITS} qubits excedido.`);
      continue;
    }
    if (head === "gate" || head === "opaque" || head === "if" || head === "reset") {
      throw new Error(`Instrução não suportada no laboratório: ${head}.`);
    }
    const match = /^([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?\s+(.+)$/.exec(statement);
    if (!match) throw new Error(`Instrução inválida: ${statement}.`);
    const rawName = (match[1] ?? "").toLowerCase();
    const name = (ALIASES[rawName] ?? rawName) as GateName;
    if (!(name in GATE_ARITY)) throw new Error(`Porta não suportada: ${rawName}.`);
    const params = match[2] !== undefined ? match[2].split(",").map(evaluateAngle) : undefined;
    if (PARAMETRIC.has(name) !== Boolean(params))
      throw new Error(`Parâmetros inválidos em ${rawName}.`);
    const operands = (match[3] ?? "").split(",").map((o) => resolve(o.trim()));
    const width = Math.max(...operands.map((o) => o.length));
    for (let i = 0; i < width; i++) {
      const qubits = operands.map((o) => (o.length === 1 ? o[0] : o[i]) as number);
      if (qubits.some((q) => measured.has(q))) {
        throw new Error(
          `Medição intermediária não suportada: porta ${rawName} após medir o qubit.`,
        );
      }
      gates.push(params ? { name, qubits, params: [...params] } : { name, qubits });
      if (gates.length > MAX_GATES) throw new Error(`Limite de ${MAX_GATES} portas excedido.`);
    }
  }
  const circuit = { numQubits, gates };
  validateCircuit(circuit);
  return circuit;
}

function formatAngle(angle: number): string {
  const ratio = angle / Math.PI;
  for (const denominator of [1, 2, 4, 8, 16]) {
    const numerator = Math.round(ratio * denominator);
    if (Math.abs(ratio * denominator - numerator) < 1e-12) {
      if (numerator === 0) return "0";
      const sign = numerator < 0 ? "-" : "";
      const abs = Math.abs(numerator);
      return `${sign}${abs === 1 ? "" : `${abs}*`}pi${denominator === 1 ? "" : `/${denominator}`}`;
    }
  }
  return angle.toPrecision(17);
}

export function toQasm(circuit: Circuit): string {
  const lines = ["OPENQASM 2.0;", 'include "qelib1.inc";', `qreg q[${circuit.numQubits}];`];
  for (const g of circuit.gates) {
    const params = g.params ? `(${g.params.map(formatAngle).join(",")})` : "";
    lines.push(`${g.name}${params} ${g.qubits.map((q) => `q[${q}]`).join(",")};`);
  }
  return `${lines.join("\n")}\n`;
}

export function parseCircuitJson(source: string): Circuit {
  const data = JSON.parse(source) as unknown;
  if (typeof data !== "object" || data === null) throw new Error("JSON de circuito inválido.");
  const record = data as { numQubits?: unknown; gates?: unknown };
  if (typeof record.numQubits !== "number" || !Array.isArray(record.gates)) {
    throw new Error("O JSON precisa de numQubits e gates.");
  }
  if (record.numQubits > MAX_QUBITS || record.gates.length > MAX_GATES)
    throw new Error("Circuito grande demais.");
  const gates = record.gates.map((entry: unknown): Gate => {
    const g = entry as { name?: unknown; qubits?: unknown; params?: unknown };
    const name = String(g.name).toLowerCase() as GateName;
    const qubits = Array.isArray(g.qubits) ? g.qubits.map(Number) : [];
    return Array.isArray(g.params)
      ? { name, qubits, params: g.params.map(Number) }
      : { name, qubits };
  });
  const circuit = { numQubits: record.numQubits, gates };
  validateCircuit(circuit);
  return circuit;
}

export function parseCircuit(source: string, filename = ""): Circuit {
  const trimmed = source.trim();
  if (filename.toLowerCase().endsWith(".json") || trimmed.startsWith("{"))
    return parseCircuitJson(trimmed);
  return parseQasm(source);
}
