// M01-T05: forParams and the nextDim a binding floor's def names. The defs
// read every bound from facts or from the feature they are handed, so each
// expected interval is read off the inputs.

import { describe, expect, test } from "vitest";
import { qualify, type Bound, type ConstraintCtx, type ConstraintDef, type Part, type ProfileLookup } from "@hackbuild/spec";
import { createRegistry, forParams, solve } from "../src/index";

const computed = qualify([]);
const D = "conductor.width" as const;

const ctxOf = (facts: ConstraintCtx["facts"]): ConstraintCtx => ({
  profile: new Proxy({}, { get: () => { throw new Error("test defs read no profile row"); } }) as unknown as ProfileLookup,
  machine: "ffc5p",
  material: "cpla",
  facts,
});

/** Floor from the feature's own `w` field, so two features give two floors. */
const featureFloor: ConstraintDef = {
  id: "t/feature-floor", version: "1.0.0", dims: [D], kernels: ["circuit"], units: { [D]: "mm" },
  bounds(_d, ctx): Bound[] {
    const w = (ctx.feature as unknown as { w: number } | undefined)?.w;
    return w === undefined ? [] : [{ value: w, side: "lo", kernel: "circuit", reason: "feature floor", ...computed }];
  },
  expectedFor: (_d, ceiling) => ({ path: "/facts/cap", got: ceiling, expected: "a larger cap", nextDim: "conductor.t" }),
};
const cap: ConstraintDef = {
  id: "t/cap", version: "1.0.0", dims: [D], kernels: ["mesh"], units: { [D]: "mm" },
  bounds: (_d, ctx): Bound[] => [{ value: ctx.facts["cap"] as number, side: "hi", kernel: "mesh", reason: "cap", ...computed }],
};

const part = (features: readonly { id: string; w: number; drivenBy?: Record<string, string> }[]): Part =>
  ({ buildHash: "b".repeat(64), features, bodies: [], metrics: [] }) as unknown as Part;

describe("nextDim (M01-T05 step 5)", () => {
  test("an empty interval carries the binding def's nextDim; a satisfiable one carries null", () => {
    const reg = createRegistry([featureFloor, cap]);
    const p = part([{ id: "conductor.a", w: 3 }]);
    const empty = solve(reg, D, { ...ctxOf({ cap: 2 }), feature: p.features[0]! });
    expect(empty.interval.legal).toBeNull();
    expect(empty.nextDim).toBe("conductor.t");
    const fits = solve(reg, D, { ...ctxOf({ cap: 4 }), feature: p.features[0]! });
    expect(fits.nextDim).toBeNull();
  });
});

describe("forParams", () => {
  const reg = createRegistry([featureFloor, cap]);

  test("one feature: the interval equals the dim-form solve with that feature", () => {
    const p = part([{ id: "conductor.a", w: 3 }]);
    const s = forParams(reg, p, [{ param: "/w", dim: D, features: ["conductor.a"] }], ctxOf({ cap: 6 }));
    const direct = solve(reg, D, { ...ctxOf({ cap: 6 }), part: p, feature: p.features[0]! });
    expect(s.envelope.params["/w"]).toEqual(direct.interval);
    expect(s.envelope.buildHash).toBe(p.buildHash);
    expect(s.unsat).toEqual([]);
  });

  test("two features on one pointer intersect, and each bound names its feature", () => {
    const p = part([{ id: "conductor.a", w: 3 }, { id: "conductor.b", w: 4.5 }]);
    const s = forParams(reg, p, [{ param: "/w", dim: D, features: ["conductor.a", "conductor.b"] }], ctxOf({ cap: 6 }));
    const iv = s.envelope.params["/w"]!;
    expect(iv.legal).toEqual([4.5, 6]);
    expect(iv.lo.map((b) => b.reason)).toEqual(["conductor.a: feature floor", "conductor.b: feature floor"]);
    expect(iv.binding.lo).toEqual([1]);
  });

  test("a binding with no feature in the part is unbound no-feature; an empty one lands in unsat", () => {
    const p = part([{ id: "conductor.a", w: 7 }]);
    const s = forParams(reg, p, [
      { param: "/z", dim: D, features: ["conductor.gone"] },
      { param: "/w", dim: D, features: ["conductor.a"] },
    ], ctxOf({ cap: 6 }));
    expect(s.envelope.unbound).toEqual([{ param: "/z", why: "no-feature" }]);
    expect(s.envelope.params["/w"]!.legal).toBeNull();
    expect(s.unsat.map((u) => [u.param, u.error.code, u.nextDim])).toEqual([["/w", "E_UNSAT", "conductor.t"]]);
  });
});
