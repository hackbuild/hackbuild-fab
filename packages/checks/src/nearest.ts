// Nearest legal values (M04-T04 step 2, D-064): the closest legal value to
// the measured one, at the param's step. An interval clamps and rounds
// toward the inside; a multiple returns the grid neighbours below and above;
// a set returns the closest member; boolean and none have no nearest. The
// grid is the one the solver snaps on (packages/constraints onGrid),
// counted from an origin: a param's grid starts at its range minimum (G-09).

import { onGrid } from "@hackbuild/constraints";

/** Clears float noise such as 3 x 0.4 = 1.2000000000000002. */
export const tidy = (v: number): number => Math.round(v * 1e9) / 1e9;

/** The grid value at or above (up) or at or below (down) v, for step s counted from origin. */
export function gridAt(v: number, step: number, origin: number, dir: "up" | "down"): number {
  return tidy(origin + onGrid(v - origin, step, dir));
}

/**
 * The legal part of [lo, hi] on the step grid: each end rounded toward the
 * inside. Null when no grid value lies inside. An open end stays null.
 */
export function gridInterval(
  lo: number | null, hi: number | null, step: number | undefined, origin = 0,
): readonly [number | null, number | null] | null {
  if (lo !== null && hi !== null && lo > hi) throw new Error("E_UNSAT reaches the solver, never this function");
  if (step === undefined || !(step > 0)) return [lo, hi];
  const a = lo === null ? null : gridAt(lo, step, origin, "up");
  const b = hi === null ? null : gridAt(hi, step, origin, "down");
  return a !== null && b !== null && a > b ? null : [a, b];
}

/**
 * Rounds toward the inside of the interval so the fix value is legal at the
 * param's step. A null end is open. Null when no grid value is inside.
 */
export function nearestInterval(lo: number | null, hi: number | null, measured: number, step: number, origin = 0): number | null {
  const iv = gridInterval(lo, hi, step, origin);
  if (iv === null) return null;
  const [a, b] = iv;
  if (a !== null && measured < a) return a;
  if (b !== null && measured > b) return b;
  const k = tidy(origin + Math.round((measured - origin) / step) * step);
  if (a !== null && k < a) return a;
  if (b !== null && k > b) return b;
  return k;
}

/** The grid values offset + n x base at or below and at or above measured; one value twice when measured is on the grid. */
export function nearestMultiple(base: number, measured: number, offset = 0): [number, number] {
  const n = (measured - offset) / base;
  return [tidy(offset + Math.floor(n + 1e-9) * base), tidy(offset + Math.ceil(n - 1e-9) * base)];
}

/** The member closest to measured; a word matches only itself. First member on a tie. Undefined for an empty set. */
export function nearestSet(values: readonly (number | string)[], measured: number | string): number | string | undefined {
  if (values.includes(measured)) return measured;
  if (typeof measured !== "number") return values[0];
  let best: number | undefined;
  for (const v of values) if (typeof v === "number" && (best === undefined || Math.abs(v - measured) < Math.abs(best - measured))) best = v;
  return best ?? values[0];
}
