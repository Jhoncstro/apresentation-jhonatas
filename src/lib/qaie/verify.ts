import type { Circuit } from "./circuit";
import { StateVector } from "./simulate";
import { mulberry32 } from "./random";

export type VerificationMethod = "unitária exata" | "estados aleatórios" | "não verificável";

export interface VerificationResult {
  equivalent: boolean;
  method: VerificationMethod;
  /** Minimum |⟨Uψ|Vψ⟩|² over the tested inputs (1 means identical up to global phase). */
  fidelity: number;
  samples: number;
  detail: string;
}

export interface VerificationOptions {
  exactMaxQubits?: number;
  sampledMaxQubits?: number;
  samples?: number;
  tolerance?: number;
  seed?: number;
}

const DEFAULTS = { exactMaxQubits: 8, sampledMaxQubits: 20, samples: 6, tolerance: 1e-9, seed: 7 };

/**
 * Checks U ≅ V up to a single global phase. Small circuits compare every column of the unitary;
 * larger ones compare the action on Haar-like random states (a probabilistic test).
 */
export function verifyEquivalence(
  reference: Circuit,
  candidate: Circuit,
  options: VerificationOptions = {},
): VerificationResult {
  const config = { ...DEFAULTS, ...options };
  const n = reference.numQubits;
  if (candidate.numQubits !== n) {
    return {
      equivalent: false,
      method: "unitária exata",
      fidelity: 0,
      samples: 0,
      detail: "Número de qubits diferente.",
    };
  }
  if (n <= config.exactMaxQubits) return exactCheck(reference, candidate, config.tolerance);
  if (n <= config.sampledMaxQubits) return sampledCheck(reference, candidate, config);
  return {
    equivalent: false,
    method: "não verificável",
    fidelity: 0,
    samples: 0,
    detail: `Acima de ${config.sampledMaxQubits} qubits a simulação no navegador não é viável; candidato rejeitado.`,
  };
}

function exactCheck(reference: Circuit, candidate: Circuit, tolerance: number): VerificationResult {
  const n = reference.numQubits;
  const size = 1 << n;
  let phaseRe = 0;
  let phaseIm = 0;
  let worst = 1;
  for (let column = 0; column < size; column++) {
    const u = StateVector.basis(n, column).run(reference);
    const v = StateVector.basis(n, column).run(candidate);
    const overlap = u.inner(v);
    const fidelity = overlap.re * overlap.re + overlap.im * overlap.im;
    worst = Math.min(worst, fidelity);
    if (fidelity < 1 - tolerance) {
      return {
        equivalent: false,
        method: "unitária exata",
        fidelity: worst,
        samples: column + 1,
        detail: `Coluna ${column} difere.`,
      };
    }
    if (column === 0) {
      phaseRe = overlap.re;
      phaseIm = overlap.im;
    } else if (Math.hypot(overlap.re - phaseRe, overlap.im - phaseIm) > Math.sqrt(tolerance) * 10) {
      return {
        equivalent: false,
        method: "unitária exata",
        fidelity: worst,
        samples: column + 1,
        detail: `Fase relativa difere na coluna ${column}.`,
      };
    }
  }
  return {
    equivalent: true,
    method: "unitária exata",
    fidelity: worst,
    samples: size,
    detail: `${size} colunas idênticas a menos de fase global.`,
  };
}

function sampledCheck(
  reference: Circuit,
  candidate: Circuit,
  config: typeof DEFAULTS,
): VerificationResult {
  const random = mulberry32(config.seed);
  let worst = 1;
  for (let sample = 0; sample < config.samples; sample++) {
    const input = StateVector.random(reference.numQubits, random);
    const u = input.clone().run(reference);
    const v = input.run(candidate);
    const overlap = u.inner(v);
    worst = Math.min(worst, overlap.re * overlap.re + overlap.im * overlap.im);
    if (worst < 1 - config.tolerance * 100) {
      return {
        equivalent: false,
        method: "estados aleatórios",
        fidelity: worst,
        samples: sample + 1,
        detail: `Estado aleatório ${sample + 1} difere.`,
      };
    }
  }
  return {
    equivalent: true,
    method: "estados aleatórios",
    fidelity: worst,
    samples: config.samples,
    detail: `${config.samples} estados aleatórios com fidelidade ≥ ${worst.toFixed(12)} (teste probabilístico).`,
  };
}
