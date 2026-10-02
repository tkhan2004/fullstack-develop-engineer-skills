export interface Evidence {
  readonly path: string;
  readonly detail: string;
  /** Strength of this observation on its own, 0–1. */
  readonly weight: number;
}

/** A detected fact. Every claim carries evidence and a confidence; there are no bare assertions. */
export interface Claim<T = string> {
  readonly value: T;
  readonly confidence: number;
  readonly evidence: readonly Evidence[];
  readonly alternatives?: readonly { readonly value: T; readonly confidence: number }[];
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Independent observations reinforce each other: confidence = 1 − Π(1 − weight), capped at 0.99. */
export function combineEvidence(evidence: readonly Evidence[]): number {
  const doubt = evidence.reduce((acc, e) => acc * (1 - Math.min(Math.max(e.weight, 0), 1)), 1);
  return Math.min(0.99, round2(1 - doubt));
}

/** Build a claim from evidence. Throws on empty evidence: an unexplained claim is a bug. */
export function claim<T>(
  value: T,
  evidence: readonly Evidence[],
  alternatives?: readonly { value: T; confidence: number }[],
): Claim<T> {
  if (evidence.length === 0) throw new Error(`Claim "${String(value)}" has no evidence`);
  return {
    value,
    confidence: combineEvidence(evidence),
    evidence: evidence.map((e) => ({ ...e, weight: round2(e.weight) })),
    ...(alternatives && alternatives.length > 0 ? { alternatives } : {}),
  };
}
