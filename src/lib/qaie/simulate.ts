import type { Circuit, Gate } from "./circuit";

type Matrix2 = [number, number, number, number, number, number, number, number];

const SQRT1_2 = Math.SQRT1_2;

function singleQubitMatrix(g: Gate): Matrix2 | undefined {
  const theta = g.params?.[0] ?? 0;
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  switch (g.name) {
    case "h":
      return [SQRT1_2, 0, SQRT1_2, 0, SQRT1_2, 0, -SQRT1_2, 0];
    case "x":
      return [0, 0, 1, 0, 1, 0, 0, 0];
    case "y":
      return [0, 0, 0, -1, 0, 1, 0, 0];
    case "z":
      return [1, 0, 0, 0, 0, 0, -1, 0];
    case "s":
      return [1, 0, 0, 0, 0, 0, 0, 1];
    case "sdg":
      return [1, 0, 0, 0, 0, 0, 0, -1];
    case "t":
      return [1, 0, 0, 0, 0, 0, SQRT1_2, SQRT1_2];
    case "tdg":
      return [1, 0, 0, 0, 0, 0, SQRT1_2, -SQRT1_2];
    case "rx":
      return [c, 0, 0, -s, 0, -s, c, 0];
    case "ry":
      return [c, 0, -s, 0, s, 0, c, 0];
    case "rz":
      return [c, -s, 0, 0, 0, 0, c, s];
    default:
      return undefined;
  }
}

export class StateVector {
  readonly re: Float64Array;
  readonly im: Float64Array;

  constructor(readonly numQubits: number) {
    this.re = new Float64Array(1 << numQubits);
    this.im = new Float64Array(1 << numQubits);
  }

  static basis(numQubits: number, index: number): StateVector {
    const state = new StateVector(numQubits);
    state.re[index] = 1;
    return state;
  }

  static random(numQubits: number, random: () => number): StateVector {
    const state = new StateVector(numQubits);
    let norm = 0;
    for (let i = 0; i < state.re.length; i++) {
      const u = Math.max(random(), 1e-12);
      const radius = Math.sqrt(-2 * Math.log(u));
      const angle = 2 * Math.PI * random();
      state.re[i] = radius * Math.cos(angle);
      state.im[i] = radius * Math.sin(angle);
      norm += radius * radius;
    }
    const scale = 1 / Math.sqrt(norm);
    for (let i = 0; i < state.re.length; i++) {
      state.re[i] = (state.re[i] ?? 0) * scale;
      state.im[i] = (state.im[i] ?? 0) * scale;
    }
    return state;
  }

  clone(): StateVector {
    const copy = new StateVector(this.numQubits);
    copy.re.set(this.re);
    copy.im.set(this.im);
    return copy;
  }

  apply(g: Gate): void {
    const m = singleQubitMatrix(g);
    if (m) return this.applySingle(g.qubits[0] ?? 0, m);
    const [a = 0, b = 0, c = 0] = g.qubits;
    if (g.name === "cx") return this.applyControlledX(1 << a, b);
    if (g.name === "ccx") return this.applyControlledX((1 << a) | (1 << b), c);
    if (g.name === "cz") return this.applyCz(a, b);
    if (g.name === "swap") return this.applySwap(a, b);
    throw new Error(`Porta sem simulação: ${g.name}.`);
  }

  private applySingle(qubit: number, [ar, ai, br, bi, cr, ci, dr, di]: Matrix2): void {
    const bit = 1 << qubit;
    const { re, im } = this;
    for (let i = 0; i < re.length; i++) {
      if (i & bit) continue;
      const j = i | bit;
      const xr = re[i] ?? 0;
      const xi = im[i] ?? 0;
      const yr = re[j] ?? 0;
      const yi = im[j] ?? 0;
      re[i] = ar * xr - ai * xi + br * yr - bi * yi;
      im[i] = ar * xi + ai * xr + br * yi + bi * yr;
      re[j] = cr * xr - ci * xi + dr * yr - di * yi;
      im[j] = cr * xi + ci * xr + dr * yi + di * yr;
    }
  }

  private applyControlledX(controlMask: number, target: number): void {
    const bit = 1 << target;
    const { re, im } = this;
    for (let i = 0; i < re.length; i++) {
      if (i & bit || (i & controlMask) !== controlMask) continue;
      const j = i | bit;
      const tr = re[i] ?? 0;
      const ti = im[i] ?? 0;
      re[i] = re[j] ?? 0;
      im[i] = im[j] ?? 0;
      re[j] = tr;
      im[j] = ti;
    }
  }

  private applyCz(a: number, b: number): void {
    const mask = (1 << a) | (1 << b);
    for (let i = 0; i < this.re.length; i++) {
      if ((i & mask) === mask) {
        this.re[i] = -(this.re[i] ?? 0);
        this.im[i] = -(this.im[i] ?? 0);
      }
    }
  }

  private applySwap(a: number, b: number): void {
    const bitA = 1 << a;
    const bitB = 1 << b;
    for (let i = 0; i < this.re.length; i++) {
      if (i & bitA && !(i & bitB)) {
        const j = (i & ~bitA) | bitB;
        const tr = this.re[i] ?? 0;
        const ti = this.im[i] ?? 0;
        this.re[i] = this.re[j] ?? 0;
        this.im[i] = this.im[j] ?? 0;
        this.re[j] = tr;
        this.im[j] = ti;
      }
    }
  }

  run(circuit: Circuit): this {
    for (const g of circuit.gates) this.apply(g);
    return this;
  }

  /** ⟨this|other⟩ */
  inner(other: StateVector): { re: number; im: number } {
    let re = 0;
    let im = 0;
    for (let i = 0; i < this.re.length; i++) {
      const ar = this.re[i] ?? 0;
      const ai = this.im[i] ?? 0;
      const br = other.re[i] ?? 0;
      const bi = other.im[i] ?? 0;
      re += ar * br + ai * bi;
      im += ar * bi - ai * br;
    }
    return { re, im };
  }
}
