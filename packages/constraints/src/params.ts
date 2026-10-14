// spec ConstraintSolver.forParams: legal ranges keyed by param pointer.
// Each binding names a dim and the features whose drivenBy maps a field
// to the pointer. Every def on the dim runs once per feature with
// ctx.feature set, and the bounds of all features go through the one
// composition (compose), so a pointer shared by several features gets the
// intersection. With more than one feature each bound's reason names its
// feature; with one, the reason is the def's own, so the envelope equals
// the dim-form query of the same facts.

import type {
  CommandError, ConstraintCtx, ConstraintDim, Interval, ParamBinding, ParamEnvelope, ParamPointer, Part,
} from "@hackbuild/spec";
import type { ConstraintRegistry } from "./registry.js";
import { boundsFor, compose, type CeilingText, type OwnedBounds } from "./solve.js";

/** One answered pointer whose interval is empty. */
export interface ParamUnsat {
  readonly param: ParamPointer;
  readonly error: CommandError;
  readonly nextDim: ConstraintDim | null;
}

/** forParams with the E_UNSAT entries the envelope's empty intervals carry. */
export interface ParamSolve {
  readonly envelope: ParamEnvelope;
  readonly unsat: readonly ParamUnsat[];
}

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function namedBy(feature: string, g: OwnedBounds): OwnedBounds {
  return { ...g, entries: g.entries.map((e) => ({ ...e, bound: { ...e.bound, reason: `${feature}: ${e.bound.reason}` } })) };
}

/**
 * Intervals for each binding. A binding with no feature lands in unbound
 * with why "no-feature"; core adds the pointers it could not bind
 * ("no-constraint-dim", "not-a-param") before it returns the envelope.
 */
export function forParams(reg: ConstraintRegistry, part: Part, bindings: readonly ParamBinding[], ctx: ConstraintCtx, ceilingText?: CeilingText): ParamSolve {
  const params: Record<ParamPointer, Interval> = {};
  const unbound: { param: ParamPointer; why: ParamEnvelope["unbound"][number]["why"] }[] = [];
  const unsat: ParamUnsat[] = [];
  for (const b of [...bindings].sort((x, y) => byCodeUnit(x.param, y.param))) {
    const features = b.features.flatMap((id) => part.features.filter((f) => f.id === id));
    if (features.length === 0) {
      unbound.push({ param: b.param, why: "no-feature" });
      continue;
    }
    const many = features.length > 1;
    const groups = features.flatMap((feature) => {
      const fctx: ConstraintCtx = { ...ctx, part, feature };
      const gs = boundsFor(reg, b.dim, fctx);
      return many ? gs.map((g) => namedBy(feature.id, g)) : gs;
    });
    const r = compose(reg, b.dim, groups, ceilingText);
    params[b.param] = r.interval;
    if (r.unsat !== null) unsat.push({ param: b.param, error: r.unsat, nextDim: r.nextDim });
  }
  return { envelope: { buildHash: part.buildHash, params, unbound }, unsat };
}
