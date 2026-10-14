// The interval solver (D-044, D-072, R56). Composes every registered def
// naming a dim: the effective floor is the max of the floors, the ceiling
// the min of the ceilings, and every bound equal to either is reported as
// binding. Floors above ceilings give legal null and an E_UNSAT entry built
// by the def that owns the binding floor. Pure: the result depends on dim,
// ctx and the registered defs only, never on registration order.

import {
  type Bound, type CommandError, type ConstraintCtx, type ConstraintDef, type ConstraintDim, type Interval,
} from "@hackbuild/spec";
import type { ConstraintRegistry } from "./registry.js";
import { factMissingError, measuredMissingError, unknownDimError, unsatError } from "./errors.js";

/** What constraints.query returns for one dim. */
export interface QueryResult {
  readonly interval: Interval;
  /** Def id that produced each bound, parallel to interval.lo and interval.hi. */
  readonly owners: { readonly lo: readonly string[]; readonly hi: readonly string[] };
  /** The E_UNSAT entry when legal is null, else null. */
  readonly unsat: CommandError | null;
  /** UnsatExpectation.nextDim of the def that answered unsat: the dim a caller queries next. Null when none. */
  readonly nextDim: ConstraintDim | null;
}

export interface Entry {
  readonly bound: Bound;
  readonly owner: string;
  readonly ord: number;
}

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Value order, then def id, then the def's own order: independent of registration order. */
const entryOrder = (a: Entry, b: Entry): number => a.bound.value - b.bound.value || byCodeUnit(a.owner, b.owner) || a.ord - b.ord;

/**
 * Relative tolerance, in grid units, under which a value counts as already
 * on the grid. Absorbs binary rounding such as 1.2 / 0.15 = 8.000000000000002.
 */
const GRID_EPS = 1e-9;

/** The grid value at or above (up) or at or below (down) v, for step s. */
export function onGrid(v: number, s: number, dir: "up" | "down"): number {
  const q = v / s;
  const r = Math.round(q);
  const k = Math.abs(q - r) <= GRID_EPS * Math.max(1, Math.abs(q)) ? r : dir === "up" ? Math.ceil(q) : Math.floor(q);
  if (k === 0) return 0;
  // k / (1 / s) keeps 172 x 0.01 at 1.72 rather than 1.7200000000000002.
  const inv = 1 / s;
  const invR = Math.round(inv);
  return Math.abs(inv - invR) <= GRID_EPS * invR ? k / invR : k * s;
}

/** ctx with a facts view that records which keys a def read, in order. */
function tracked(ctx: ConstraintCtx): { readonly ctx: ConstraintCtx; readonly reads: Set<string> } {
  const reads = new Set<string>();
  const note = (k: string | symbol): void => {
    if (typeof k === "string") reads.add(k);
  };
  const facts = new Proxy(ctx.facts, {
    get(t, k, r) {
      note(k);
      return Reflect.get(t, k, r);
    },
    has(t, k) {
      note(k);
      return Reflect.has(t, k);
    },
    getOwnPropertyDescriptor(t, k) {
      note(k);
      return Reflect.getOwnPropertyDescriptor(t, k);
    },
  });
  return { ctx: { ...ctx, facts }, reads };
}

const own = (facts: ConstraintCtx["facts"], k: string): unknown => (Object.hasOwn(facts, k) ? facts[k] : undefined);

/** First fact read that is present as a non-finite number. */
function nonFiniteRead(facts: ConstraintCtx["facts"], reads: ReadonlySet<string>): string | undefined {
  for (const k of reads) {
    const v = own(facts, k);
    if (typeof v === "number" && !Number.isFinite(v)) return k;
  }
  return undefined;
}

/** First fact read that is absent or not a finite number. */
function unusableRead(facts: ConstraintCtx["facts"], reads: ReadonlySet<string>): string | undefined {
  for (const k of reads) {
    const v = own(facts, k);
    if (typeof v !== "number" || !Number.isFinite(v)) return k;
  }
  return undefined;
}

function boundsOf(def: ConstraintDef, dim: ConstraintDim, ctx: ConstraintCtx): Entry[] {
  const t = tracked(ctx);
  const out = def.bounds(dim, t.ctx);
  const bad = nonFiniteRead(ctx.facts, t.reads);
  if (bad !== undefined) throw factMissingError(bad, own(ctx.facts, bad), def.id);
  return out.map((bound, ord) => {
    if (bound.side !== "lo" && bound.side !== "hi") throw new Error(`constraint ${def.id} returned a bound with side ${String(bound.side)}; side is lo or hi`);
    if (!def.kernels.includes(bound.kernel)) throw new Error(`constraint ${def.id} returned a bound from kernel ${bound.kernel}, which its kernels list leaves out`);
    if (typeof bound.value !== "number" || !Number.isFinite(bound.value)) {
      const key = unusableRead(ctx.facts, t.reads);
      if (key !== undefined) throw factMissingError(key, own(ctx.facts, key), def.id);
      // Complete, finite inputs gave a non-finite bound: a def defect, a crash (spec/errors.ts).
      throw new Error(`constraint ${def.id} returned a non-finite bound from finite facts`);
    }
    return { bound, owner: def.id, ord };
  });
}

/** Indexes of every entry whose value equals v. */
const indexesAt = (entries: readonly Entry[], v: number | null): number[] =>
  v === null ? [] : entries.flatMap((e, i) => (e.bound.value === v ? [i] : []));

/** One def's bounds on dim, each with its owner; a reason prefix names a feature when forParams intersects several. */
export interface OwnedBounds {
  readonly def: ConstraintDef;
  readonly ctx: ConstraintCtx;
  readonly entries: readonly Entry[];
}

/** Every registered def's bounds on dim under ctx. E_REF on an unregistered dim, E_PARAM_MISSING on a missing fact. */
export function boundsFor(reg: ConstraintRegistry, dim: ConstraintDim, ctx: ConstraintCtx): OwnedBounds[] {
  const defs = reg.defsFor(dim);
  if (defs.length === 0) throw unknownDimError(dim, reg.dims());
  return defs.map((def) => ({ def, ctx, entries: boundsOf(def, dim, ctx) }));
}

/**
 * How the ceiling prints in the E_UNSAT expected line when the binding
 * floor's def has no expectedFor. This package sits below the formatter
 * (core/src/text/fmt.ts, tools/tiers.json), so a caller that prints passes
 * its formatter in; the default is the unrounded number.
 */
export type CeilingText = (ceiling: number, unit: string) => string;

const RAW_CEILING: CeilingText = (v) => String(v);

/**
 * The one composition (D-072, R56): floor is the max of the floors,
 * ceiling the min of the ceilings, both snapped onto the dim's grid, every
 * bound equal to either reported binding, and E_UNSAT from the def that
 * owns the binding floor. solve and forParams both end here.
 */
export function compose(reg: ConstraintRegistry, dim: ConstraintDim, groups: readonly OwnedBounds[], ceilingText: CeilingText = RAW_CEILING): QueryResult {
  const unit = reg.unitOf(dim)!;
  const step = reg.stepOf(dim);
  const all = groups.flatMap((g) => g.entries);
  const lo = all.filter((e) => e.bound.side === "lo").sort(entryOrder);
  const hi = all.filter((e) => e.bound.side === "hi").sort(entryOrder);

  const floorRaw = lo.length === 0 ? null : Math.max(...lo.map((e) => e.bound.value));
  const ceilRaw = hi.length === 0 ? null : Math.min(...hi.map((e) => e.bound.value));
  const floor = floorRaw === null || step === undefined ? floorRaw : onGrid(floorRaw, step, "up");
  const ceil = ceilRaw === null || step === undefined ? ceilRaw : onGrid(ceilRaw, step, "down");
  const empty = floor !== null && ceil !== null && floor > ceil;

  const binding = { lo: indexesAt(lo, floorRaw), hi: indexesAt(hi, ceilRaw) };
  const interval: Interval = {
    dim,
    unit,
    lo: lo.map((e) => e.bound),
    hi: hi.map((e) => e.bound),
    legal: empty ? null : [floor, ceil],
    binding,
  };

  let unsat: CommandError | null = null;
  let nextDim: ConstraintDim | null = null;
  if (empty) {
    for (const i of binding.lo) {
      const e = lo[i]!;
      const g = groups.find((x) => x.entries.includes(e))!;
      const exp = g.def.expectedFor?.(dim, ceil, g.ctx) ?? null;
      if (exp !== null) {
        unsat = unsatError({ path: exp.path, got: exp.got, expected: exp.expected, record: g.def.id });
        nextDim = exp.nextDim ?? null;
        break;
      }
    }
    unsat ??= unsatError({ expected: `a floor at most ${ceilingText(ceil!, unit)} ${unit}, the ceiling`, record: lo[binding.lo[0]!]!.owner });
  }

  return { interval, owners: { lo: lo.map((e) => e.owner), hi: hi.map((e) => e.owner) }, unsat, nextDim };
}

/** Composes every def naming dim. E_REF on an unregistered dim, E_PARAM_MISSING on a missing fact. */
export function solve(reg: ConstraintRegistry, dim: ConstraintDim, ctx: ConstraintCtx, ceilingText?: CeilingText): QueryResult {
  return compose(reg, dim, boundsFor(reg, dim, ctx), ceilingText);
}

/** spec ConstraintSolver.query: the Interval alone. */
export function query(reg: ConstraintRegistry, dim: ConstraintDim, ctx: ConstraintCtx): Interval {
  return solve(reg, dim, ctx).interval;
}

/**
 * spec ConstraintSolver.nearest: value clamped into legal; a value inside
 * returns itself, a null end is unbounded, and an empty interval gives null.
 */
export function nearest(interval: Interval, value: number): number | null {
  if (!Number.isFinite(value)) throw measuredMissingError(value);
  if (interval.legal === null) return null;
  const [lo, hi] = interval.legal;
  if (lo !== null && value < lo) return lo;
  if (hi !== null && value > hi) return hi;
  return value;
}
