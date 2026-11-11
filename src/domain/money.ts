import type { Cents, MemberId } from "./types";

/** "$12.50" | "12.5" | 12.5 -> 1250. Rejects negatives and > 2 decimals. */
export function toCents(input: string | number): Cents {
  const raw = typeof input === "number" ? input.toFixed(2) : input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new Error(`Invalid amount: "${input}"`);
  }
  const [whole, frac = ""] = raw.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** 11990 -> "$119.90". Negative values get a leading minus. */
export function formatSGD(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString("en-SG");
  const rem = String(abs % 100).padStart(2, "0");
  return `${sign}$${dollars}.${rem}`;
}

export function sum(values: Cents[]): Cents {
  return values.reduce((a, b) => a + b, 0);
}

/** Round half up on a non-negative cent value produced by multiplication. */
export function roundCents(value: number): Cents {
  return Math.round(value + Number.EPSILON);
}

/**
 * Split `total` across keys in proportion to `weights`, in whole cents.
 * Each share is floored; the rounding gap goes to the largest share
 * (rule from US-06), so shares always sum exactly to `total`.
 * Keys with zero weight receive nothing.
 */
export function allocateProportional(
  total: Cents,
  weights: Record<MemberId, number>,
): Record<MemberId, Cents> {
  const keys = Object.keys(weights).filter((k) => weights[k] > 0);
  const weightSum = keys.reduce((a, k) => a + weights[k], 0);
  const result: Record<MemberId, Cents> = {};
  if (keys.length === 0 || weightSum === 0) return result;

  for (const k of keys) result[k] = Math.floor((total * weights[k]) / weightSum);
  const gap = total - sum(Object.values(result));
  if (gap !== 0) {
    const largest = keys.reduce((best, k) => (result[k] > result[best] ? k : best), keys[0]);
    result[largest] += gap;
  }
  return result;
}

/**
 * Split `total` equally across `ids`. Leftover cents go one each to the
 * first ids, so the order of `ids` must be stable (e.g. assignment order).
 */
export function splitEqually(total: Cents, ids: MemberId[]): Record<MemberId, Cents> {
  const result: Record<MemberId, Cents> = {};
  if (ids.length === 0) return result;
  const base = Math.floor(total / ids.length);
  let leftover = total - base * ids.length;
  for (const id of ids) {
    result[id] = (result[id] ?? 0) + base + (leftover > 0 ? 1 : 0);
    if (leftover > 0) leftover--;
  }
  return result;
}

export function addInto(target: Record<MemberId, Cents>, add: Record<MemberId, Cents>): void {
  for (const [k, v] of Object.entries(add)) target[k] = (target[k] ?? 0) + v;
}
