// Message numbers (D-010, CHECKS.md 2.5): every number core prints is a
// call here on the computed value. A printed floor rounds up and a printed
// ceiling rounds down at the printed precision, so every printed bound is
// legal. A check message may also print a value derived from its result
// fields; each such derivation is named in DERIVATIONS (M04-T05 step 2).

/** Decimals a value in each unit prints with (M01-T05 step 4); any other unit, Q included, prints 2. */
export const UNIT_DECIMALS: Readonly<Record<string, number>> = { mm: 2, ohm: 0, "ohm cm": 0, percent: 2 };

const DEFAULT_DECIMALS = 2;

/**
 * Tolerance in units of the last printed digit under which a value counts
 * as already on that digit, so 3.2300000000000004 prints 3.23 as a floor.
 */
const DIGIT_EPS = 1e-9;

/** Decimals for unit. */
export const decimalsOf = (unit: string): number => UNIT_DECIMALS[unit] ?? DEFAULT_DECIMALS;

/** How a printed value rounds: up for a floor, down for a ceiling, near for a measured or reported value. */
export type Rounding = "up" | "down" | "near";

/** v at d decimals, rounded per dir. */
export function fixed(v: number, d: number, dir: Rounding = "near"): string {
  const k = 10 ** d;
  const q = v * k;
  const r = Math.round(q);
  const n = dir === "near" || Math.abs(q - r) <= DIGIT_EPS * Math.max(1, Math.abs(q)) ? r : dir === "up" ? Math.ceil(q) : Math.floor(q);
  const out = (n / k).toFixed(d);
  return out === "-0" || /^-0\.0*$/.test(out) ? out.slice(1) : out;
}

/** v in unit at the unit's precision. */
export const fmtIn = (unit: string, v: number, dir: Rounding = "near"): string => fixed(v, decimalsOf(unit), dir);

/** An integer prints whole, anything else at 2 decimals: the finding block's legacy form (AGENT-SURFACE.md 6.3). */
export const fmt = (n: number): string => (Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2));

/**
 * Named derivations a check message may print from the numeric fields of
 * its own result (M04-T05 step 2). Each takes a value and a base, both
 * result fields; the message-numbers test applies every entry to every
 * ordered pair of a finding's fields, so a derivation absent here makes a
 * printed number untraceable.
 */
export const DERIVATIONS = {
  /** value as a percent of base: 67 from 2.15 over 3.20 (api-library-ai-design.md 6.3), 40 from 1.632 over cone 4.08. */
  percentOf: (value: number, base: number): number => (100 * value) / base,
} as const satisfies Readonly<Record<string, (value: number, base: number) => number>>;

export type DerivationName = keyof typeof DERIVATIONS;

/** value as a percent of base (DERIVATIONS.percentOf). */
export const percentOf = DERIVATIONS.percentOf;
