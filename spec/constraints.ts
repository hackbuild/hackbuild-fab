// spec/constraints.ts
/**
 * Status: draft until the M01 exit. MILESTONES.md 1.5, D-179.
 * M01 is the first milestone that runs this file.
 */
// The interval solver: ask what a dimension may be, get a bounded range and
// the kernel and reason behind each bound. Kernels and canons register
// ConstraintDef entries at load; the solver imports none of them (D-044).
// Version 5, 2026-10-06. Carries D-044, D-057, D-064, D-071, D-072, D-225.
//
// Worked example (D-072, computed): R = rho L / (w t), so a resistance
// budget is a width floor. Protopasta printed XY 30 ohm cm (vendor), path
// 62 mm, t 0.72 mm, budget 8 kohm: floor 300 x 62 / (8000 x 0.72) = 3.23 mm;
// with printability and fatigue floors 0.80 and a pitch ceiling 6.00, legal
// is 3.23 to 6.00 and the resistance floor binds. At the PIP preset 500 ohm
// cm (inferred) the floor is 53.8 mm, legal is null, and E_UNSAT names
// 71.8 kohm as the budget that fits 6.00.

import type { BuildHash, KernelId, Qualification, Tier } from "./ids.js";
import type { Feature } from "./features.js";
import type { Part } from "./part-ir.js";
import type { Constant, ProfileLookup } from "./profile.js";
import { commandError, type ThrownCommandError } from "./errors.js";

/**
 * `<featureKind>.<field>`, `<role>.<field>` or `net.<quantity>`, for example
 * "conductor.width", "conductor.pathLen", "spring.riseQ", "net.ohm". The
 * net form bounds a per-net quantity the circuit kernel computes, such as
 * total path resistance in ohm (M05-T12).
 */
export type ConstraintDim = `${string}.${string}`;

/**
 * JSON pointer into a chase's params, for example "/keys/0/gap". The same
 * string Fix.param, CheckDef.drivenBy and ParamField ids resolve to.
 */
export type ParamPointer = `/${string}`;

/**
 * One floor or ceiling. qualifier and basis come from qualifyRow() for a
 * bound read straight from a profile row (a printability floor) or from
 * qualify() for a derived bound (the resistance floor: computed, basis the
 * resistivity row's tier).
 */
export type Bound = BoundBase & Qualification;

interface BoundBase {
  /** Bound value in the interval's unit. */
  readonly value: number;
  /**
   * Which side this bound limits: "lo" is a floor (effective floor is the
   * max), "hi" is a ceiling (effective ceiling is the min). The solver files
   * the bound under Interval[side]. In contact.gap, 1.2 and 0.4 x cone are
   * "lo" and 0.5 x cone is "hi".
   */
  readonly side: "lo" | "hi";
  readonly kernel: KernelId;
  /** One line with the numbers that produced it: "8000 ohm budget at 62.0 mm path, 0.72 thick, 30 ohm cm (vendor)". */
  readonly reason: string;
  /** Check id or knowledge record id. */
  readonly source?: string;
}

export interface Interval {
  readonly dim: ConstraintDim;
  /** Unit of every bound, for example "mm", "ratio". */
  readonly unit: string;
  /** All floors; the effective floor is the max. */
  readonly lo: readonly Bound[];
  /** All ceilings; the effective ceiling is the min. */
  readonly hi: readonly Bound[];
  /**
   * [floor, ceiling] in `unit`, or null when floors exceed ceilings
   * (E_UNSAT). An end with no bound on its side is null, meaning unbounded
   * (D-225). On a dim with a step, both ends lie on the step grid.
   */
  readonly legal: readonly [number | null, number | null] | null;
  /**
   * Which bounds bind (D-072): indexes into lo and hi of every bound equal
   * to the effective floor or ceiling, so a tie reports each tied bound.
   * Empty when that side has no bound.
   */
  readonly binding: { /** indexes into lo */ readonly lo: readonly number[]; /** indexes into hi */ readonly hi: readonly number[] };
}

/**
 * What a def says when its floor binds an empty interval (E_UNSAT): the
 * fact that moves the floor, its value, and the value of that fact whose
 * floor meets `ceiling`, with unit. nextDim names the dim a caller queries
 * next to lower the floor (for conductor.width: conductor.t).
 */
export interface UnsatExpectation {
  /** JSON pointer of the fact, for example "/facts/netBudgetOhm". */
  readonly path: ParamPointer;
  readonly got: unknown;
  /** "at least 71760 ohm at width 6.00, path 62.0, thickness 0.72". */
  readonly expected: string;
  readonly nextDim?: ConstraintDim;
}

/** Context a constraint reads. Facts carry declared budgets and loads. */
export interface ConstraintCtx {
  readonly profile: ProfileLookup;
  readonly machine: string;
  readonly material: string;
  readonly part?: Part;
  readonly feature?: Feature;
  /** Declared facts: netBudgetOhm (ohm), flexes, clickForceN (N), pathLen (mm), mcu. Units by key suffix or doc. */
  readonly facts: Readonly<Record<string, number | string | boolean>>;
}

/** A registered constraint. Pure. */
export interface ConstraintDef {
  readonly id: string;
  /** Semver, hashed into registryHash. */
  readonly version: string;
  readonly dims: readonly ConstraintDim[];
  /** Kernels contributing bounds; a cross-kernel constraint lists more than one. */
  readonly kernels: readonly KernelId[];
  /**
   * Unit of each dim in `dims`, for example {"conductor.width": "mm"}. Every
   * def naming a dim declares the same unit, or registration is E_SCHEMA.
   */
  readonly units: Readonly<Partial<Record<ConstraintDim, string>>>;
  /**
   * Grid step per dim, in its unit: 1 for an integer dim (cascade.depth),
   * 0.01 for Q. The solver reports the effective floor rounded up and the
   * ceiling rounded down onto the grid. Defs naming one dim agree on it.
   */
  readonly steps?: Readonly<Partial<Record<ConstraintDim, number>>>;
  /**
   * Every floor and ceiling this constraint puts on dim, each tagged with
   * side. A fact the def needs and finds absent or non-finite is
   * E_PARAM_MISSING at `/facts/<key>`; the solver raises it when the def
   * returns a non-finite value after reading such a fact.
   */
  bounds(dim: ConstraintDim, ctx: ConstraintCtx): readonly Bound[];
  /**
   * For an empty interval whose binding floor this def set: the fact that
   * moves the floor and the value of it that meets `ceiling` (the
   * resistance floor answers the budget that fits 6.00 mm). Null when no
   * single fact moves it.
   */
  expectedFor?(dim: ConstraintDim, ceiling: number, ctx: ConstraintCtx): UnsatExpectation | null;
}

/**
 * Composes every registered constraint naming a dim. An unknown dim throws
 * a ThrownCommandError with code E_REF with up to three suggestions.
 */
export interface ConstraintSolver {
  query(dim: ConstraintDim, ctx: ConstraintCtx): Interval;
  /** Every dim a part's features touch, in one call. */
  envelope(part: Part, ctx: ConstraintCtx): readonly Interval[];
  /**
   * Intervals keyed by param pointer. Each binding names the dim (from
   * ParamField.constraintDim) and the features whose drivenBy names that
   * pointer (declared in build.ts through Author.bind).
   * Facts come from the built part and its declarations; `ctx.facts`
   * overrides them key by key. When several features share one pointer,
   * the interval is the intersection and each bound's reason names its
   * feature.
   */
  forParams(part: Part, bindings: readonly ParamBinding[], ctx: ConstraintCtx): ParamEnvelope;
  /** The value inside `legal` nearest to `value`, in the interval's unit; null when legal is null. */
  nearest(interval: Interval, value: number): number | null;
}

/** One param the envelope answers for. */
export interface ParamBinding {
  readonly param: ParamPointer;
  readonly dim: ConstraintDim;
  /** Feature ids whose drivenBy maps a field to `param`. Empty means no feature declared it. */
  readonly features: readonly string[];
}

/**
 * Legal ranges for a design's params in one answer. The rail draws its
 * range tracks and enum options from this, and constraints.query returns
 * it, so the UI and a model read one source.
 */
export interface ParamEnvelope {
  /** Build the facts were read from. */
  readonly buildHash: BuildHash;
  /** One Interval per answered pointer; its `dim` is the ParamField's constraintDim. */
  readonly params: Readonly<Record<ParamPointer, Interval>>;
  /** Pointers asked for that have no constraintDim, or that reached no feature; never silently dropped. */
  readonly unbound: readonly { readonly param: ParamPointer; readonly why: "no-constraint-dim" | "no-feature" | "not-a-param" | "no-loss-row" }[];
}

// ---- fact readers every ConstraintDef shares ----
// One home for them (M06-T02): the constraints fixtures and the canon
// packages' defs read facts through these, so an absent fact names its own
// pointer the same way wherever the def lives.

/** Pointer token per RFC 6901. */
export const pointerToken = (k: string): string => k.replace(/~/g, "~0").replace(/\//g, "~1");

/** JSON pointer of a fact key: "/facts/netBudgetOhm". */
export const factPointer = (key: string): `/${string}` => `/facts/${pointerToken(key)}`;

/** A fact a def read was absent or not a finite number (D-064). */
export function factMissingError(key: string, got: unknown, defId: string): ThrownCommandError {
  return commandError({
    code: "E_PARAM_MISSING",
    path: factPointer(key),
    got: got === undefined ? null : typeof got === "number" ? String(got) : got,
    expected: "a finite number",
    hint: `fact ${key} is missing or not a finite number; pass it in facts`,
    record: defId,
  });
}

/** A required numeric fact, or E_PARAM_MISSING at /facts/<key> naming defId. */
export function needFact(ctx: ConstraintCtx, key: string, defId: string): number {
  const v = Object.hasOwn(ctx.facts, key) ? ctx.facts[key] : undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  throw factMissingError(key, v, defId);
}

/** A non-negative numeric fact, or E_SCHEMA at its pointer. */
export function needNonNegative(ctx: ConstraintCtx, key: string, defId: string): number {
  const v = needFact(ctx, key, defId);
  if (v >= 0) return v;
  throw commandError({
    code: "E_SCHEMA", path: `/facts/${key}`, got: String(v), expected: "a number at least 0",
    hint: `fact ${key} is a clearance in mm; pass 0 or more`, record: defId,
  });
}

/** A fact that overrides a profile constant when present, else the constant row. */
export interface Overridable {
  readonly value: number;
  /** The constant row when the value came from profile, null when a fact overrode it. */
  readonly row: Constant | null;
}

export function factOrConstant(ctx: ConstraintCtx, key: string, constantId: string, defId: string): Overridable {
  if (Object.hasOwn(ctx.facts, key)) return { value: needFact(ctx, key, defId), row: null };
  const row = ctx.profile.constant(constantId);
  return { value: row.value, row };
}

/** Tiers of the constant rows among xs, for qualify(); a fact reads no row and adds none. */
export const tiersOf = (xs: readonly Overridable[]): Tier[] =>
  xs.flatMap((x) => (x.row === null ? [] : [x.row.provenance.tier]));
