// M01-T04 interval solver. The defs here are test stand-ins: every bound
// value is a fact the test passes in, so each expected interval is read
// off the inputs, never off what the solver wrote. Real defs and their
// profile-backed numbers land with M01-T06 to T10.

import { describe, expect, test } from "vitest";
import {
  canonicalize, isThrownCommandError, qualify,
  type Bound, type ConstraintCtx, type ConstraintDef, type ConstraintDim, type KernelId, type ProfileLookup,
} from "@hackbuild/spec";
import { createRegistry, nearest, onGrid, query, solve } from "../src/index";

const computed = qualify([]);

const ctxOf = (facts: ConstraintCtx["facts"]): ConstraintCtx => ({
  // No test def reads profile; a read would throw here and fail the test.
  profile: new Proxy({}, { get: () => { throw new Error("test defs read no profile row"); } }) as unknown as ProfileLookup,
  machine: "ffc5p",
  material: "cpla",
  facts,
});

/** A def putting one bound on dim, its value read from facts[key]. */
function factBound(id: string, dim: ConstraintDim, side: "lo" | "hi", key: string, opts: { kernel?: KernelId; step?: number; unit?: string; expectedFor?: ConstraintDef["expectedFor"] } = {}): ConstraintDef {
  const kernel = opts.kernel ?? "profile";
  return {
    id,
    version: "1.0.0",
    dims: [dim],
    kernels: [kernel],
    units: { [dim]: opts.unit ?? "mm" },
    ...(opts.step === undefined ? {} : { steps: { [dim]: opts.step } }),
    bounds(d, ctx): Bound[] {
      if (d !== dim) return [];
      const v = ctx.facts[key] as number;
      return [{ value: v, side, kernel, reason: `${key} from facts`, ...computed }];
    },
    ...(opts.expectedFor === undefined ? {} : { expectedFor: opts.expectedFor }),
  };
}

/** Thrown CommandError fields, or a failure naming what was thrown. */
function thrown(fn: () => unknown): { code: string; path?: string; got?: unknown; didYouMean?: readonly string[]; record?: string } {
  try {
    fn();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("expected a ThrownCommandError, nothing was thrown");
}

const W = "conductor.width" as const;

describe("composition (step 2)", () => {
  test("one floor and one ceiling give [floor, ceiling], each binding", () => {
    const reg = createRegistry([factBound("t/floor", W, "lo", "a"), factBound("t/ceil", W, "hi", "b", { kernel: "mesh" })]);
    const r = solve(reg, W, ctxOf({ a: 0.8, b: 6 }));
    expect(r.interval.legal).toEqual([0.8, 6]);
    expect(r.interval.unit).toBe("mm");
    expect(r.interval.binding).toEqual({ lo: [0], hi: [0] });
    expect(r.owners).toEqual({ lo: ["t/floor"], hi: ["t/ceil"] });
    expect(r.unsat).toBeNull();
  });

  test("the effective floor is the max and the ceiling the min", () => {
    const reg = createRegistry([
      factBound("t/f1", W, "lo", "a"), factBound("t/f2", W, "lo", "b"),
      factBound("t/c1", W, "hi", "c"), factBound("t/c2", W, "hi", "d"),
    ]);
    const r = solve(reg, W, ctxOf({ a: 0.8, b: 3.23, c: 6, d: 9 }));
    expect(r.interval.legal).toEqual([3.23, 6]);
    expect(r.interval.lo[r.interval.binding.lo[0]!]!.value).toBe(3.23);
    expect(r.owners.lo[r.interval.binding.lo[0]!]).toBe("t/f2");
    expect(r.owners.hi[r.interval.binding.hi[0]!]).toBe("t/c1");
    expect(r.interval.binding.lo).toHaveLength(1);
    expect(r.interval.binding.hi).toHaveLength(1);
  });

  test("two tied floors are both reported binding; a lower floor is not", () => {
    const reg = createRegistry([
      factBound("t/printability", W, "lo", "a"), factBound("t/fatigue", W, "lo", "b"),
      factBound("t/low", W, "lo", "c"), factBound("t/pitch", W, "hi", "d", { kernel: "mesh" }),
    ]);
    const r = solve(reg, W, ctxOf({ a: 0.8, b: 0.8, c: 0.5, d: 6 }));
    expect(r.interval.legal).toEqual([0.8, 6]);
    const bindingOwners = r.interval.binding.lo.map((i) => r.owners.lo[i]).sort();
    expect(bindingOwners).toEqual(["t/fatigue", "t/printability"]);
    expect(r.interval.binding.lo.map((i) => r.interval.lo[i]!.value)).toEqual([0.8, 0.8]);
  });

  test("a side with no bound is open: null end, no binding index", () => {
    const reg = createRegistry([factBound("t/floor", W, "lo", "a")]);
    const r = solve(reg, W, ctxOf({ a: 11.45 }));
    expect(r.interval.legal).toEqual([11.45, null]);
    expect(r.interval.binding).toEqual({ lo: [0], hi: [] });
    expect(canonicalize(r.interval)).toContain('"legal":[11.45,null]');
  });

  test("a def that returns no bound when its fact is absent contributes nothing", () => {
    const optional: ConstraintDef = {
      ...factBound("t/budget", W, "lo", "budget"),
      bounds(_d, ctx): Bound[] {
        return ctx.facts["budget"] === undefined ? [] : [{ value: ctx.facts["budget"] as number, side: "lo", kernel: "profile", reason: "budget", ...computed }];
      },
    };
    const reg = createRegistry([optional, factBound("t/ceil", W, "hi", "b")]);
    expect(solve(reg, W, ctxOf({ b: 6 })).interval.legal).toEqual([null, 6]);
  });
});

describe("E_UNSAT (step 4)", () => {
  const expectedFor: ConstraintDef["expectedFor"] = (_dim, ceiling, ctx) => ({
    path: "/facts/budget",
    got: ctx.facts["budget"],
    expected: `budget for ${String(ceiling)}`,
    nextDim: "conductor.t",
  });

  test("floor above ceiling gives legal null, every bound, and E_UNSAT from the binding floor's def", () => {
    const reg = createRegistry([
      factBound("t/printability", W, "lo", "a"),
      factBound("t/resistance", W, "lo", "budget", { kernel: "circuit", expectedFor }),
      factBound("t/pitch", W, "hi", "c", { kernel: "mesh" }),
    ]);
    const r = solve(reg, W, ctxOf({ a: 0.8, budget: 53.82, c: 6 }));
    expect(r.interval.legal).toBeNull();
    expect(r.interval.lo.map((b) => b.value)).toEqual([0.8, 53.82]);
    expect(r.interval.hi.map((b) => b.value)).toEqual([6]);
    expect(r.owners.lo[r.interval.binding.lo[0]!]).toBe("t/resistance");
    expect(r.unsat).toEqual({
      code: "E_UNSAT",
      path: "/facts/budget",
      got: 53.82,
      expected: "budget for 6",
      record: "t/resistance",
      hint: "floors exceed ceilings; move the binding floor below the ceiling or raise the ceiling",
    });
  });

  test("a binding floor with no expectedFor still gives E_UNSAT naming the ceiling", () => {
    const reg = createRegistry([factBound("t/floor", W, "lo", "a"), factBound("t/ceil", W, "hi", "b")]);
    const r = solve(reg, W, ctxOf({ a: 7, b: 6 }));
    expect(r.interval.legal).toBeNull();
    expect(r.unsat?.code).toBe("E_UNSAT");
    expect(r.unsat?.path).toBeUndefined();
    expect(r.unsat?.expected).toBe("a floor at most 6 mm, the ceiling");
    expect(r.unsat?.record).toBe("t/floor");
  });

  test("on tied binding floors the first tied def by id with an expectedFor answers", () => {
    const named = (tag: string): ConstraintDef["expectedFor"] => (_dim, ceiling) => ({ path: "/facts/a", got: tag, expected: `${tag} at ${String(ceiling)}` });
    const ceil = factBound("t/ceil", W, "hi", "c");
    // t/a sorts before t/b and has no expectedFor, so t/b answers.
    const r1 = solve(createRegistry([factBound("t/b", W, "lo", "a", { expectedFor: named("b") }), factBound("t/a", W, "lo", "a"), ceil]), W, ctxOf({ a: 9, c: 6 }));
    expect(r1.unsat).toMatchObject({ got: "b", record: "t/b" });
    // Both answer: t/a, first in the sorted order, wins whatever the registration order.
    const both = [factBound("t/b", W, "lo", "a", { expectedFor: named("b") }), factBound("t/a", W, "lo", "a", { expectedFor: named("a") }), ceil];
    expect(solve(createRegistry(both), W, ctxOf({ a: 9, c: 6 })).unsat).toMatchObject({ got: "a", record: "t/a" });
    expect(solve(createRegistry([...both].reverse()), W, ctxOf({ a: 9, c: 6 })).unsat).toMatchObject({ got: "a", record: "t/a" });
  });

  test("a lower floor's expectedFor never answers for the binding floor", () => {
    const low = factBound("t/a-low", W, "lo", "a", { expectedFor: () => ({ path: "/facts/a", got: "low", expected: "low" }) });
    const r = solve(createRegistry([low, factBound("t/z-high", W, "lo", "b"), factBound("t/ceil", W, "hi", "c")]), W, ctxOf({ a: 7, b: 9, c: 6 }));
    expect(r.unsat).toMatchObject({ record: "t/z-high", expected: "a floor at most 6 mm, the ceiling" });
  });

  test("floor equal to ceiling is a one-point interval, not E_UNSAT", () => {
    const reg = createRegistry([factBound("t/floor", W, "lo", "a"), factBound("t/ceil", W, "hi", "b")]);
    const r = solve(reg, W, ctxOf({ a: 5.4, b: 5.4 }));
    expect(r.interval.legal).toEqual([5.4, 5.4]);
    expect(r.unsat).toBeNull();
  });
});

describe("E_PARAM_MISSING (step 5)", () => {
  const reg = createRegistry([factBound("t/floor", W, "lo", "pathMm"), factBound("t/ceil", W, "hi", "b")]);

  test("a missing fact names its pointer", () => {
    const e = thrown(() => solve(reg, W, ctxOf({ b: 6 })));
    expect(e).toMatchObject({ code: "E_PARAM_MISSING", path: "/facts/pathMm", got: null, record: "t/floor" });
  });

  test("a non-finite fact names its pointer and never reaches a bound", () => {
    expect(thrown(() => solve(reg, W, ctxOf({ pathMm: Number.NaN, b: 6 })))).toMatchObject({ code: "E_PARAM_MISSING", path: "/facts/pathMm", got: "NaN" });
    expect(thrown(() => solve(reg, W, ctxOf({ pathMm: Number.POSITIVE_INFINITY, b: 6 })))).toMatchObject({ code: "E_PARAM_MISSING", path: "/facts/pathMm" });
  });

  test("a non-finite fact is refused even when the def turns it into a finite bound", () => {
    const guarded: ConstraintDef = {
      ...factBound("t/guarded", W, "lo", "flexMm"),
      // NaN > 0 is false, so without the read check this def would answer 0 silently.
      bounds: (_d, ctx): Bound[] => [{ value: (ctx.facts["flexMm"] as number) > 0 ? 1 : 0, side: "lo", kernel: "profile", reason: "flex", ...computed }],
    };
    expect(thrown(() => solve(createRegistry([guarded]), W, ctxOf({ flexMm: Number.NaN })))).toMatchObject({ code: "E_PARAM_MISSING", path: "/facts/flexMm", record: "t/guarded" });
  });

  test("a string fact where a number is needed names its pointer", () => {
    expect(thrown(() => solve(reg, W, ctxOf({ pathMm: "sixty", b: 6 })))).toMatchObject({ code: "E_PARAM_MISSING", path: "/facts/pathMm", got: "sixty" });
  });

  test("a non-finite bound from complete, finite facts is a def defect, not E_PARAM_MISSING", () => {
    const broken: ConstraintDef = { ...factBound("t/broken", W, "lo", "a"), bounds: (): Bound[] => [{ value: Number.NaN, side: "lo", kernel: "profile", reason: "x", ...computed }] };
    const r2 = createRegistry([broken]);
    expect(() => solve(r2, W, ctxOf({ a: 1 }))).toThrow(/non-finite bound from finite facts/);
  });
});

describe("registry (step 1)", () => {
  test("a duplicate id is E_SCHEMA and leaves the registry unchanged", () => {
    const reg = createRegistry([factBound("t/floor", W, "lo", "a")]);
    expect(thrown(() => reg.register(factBound("t/floor", "conductor.t", "lo", "a")))).toMatchObject({ code: "E_SCHEMA", path: "/id", got: "t/floor" });
    expect(reg.ids()).toEqual(["t/floor"]);
    expect(reg.dims()).toEqual([W]);
  });

  test("a kernel outside KernelId is E_SCHEMA at its index", () => {
    const def = { ...factBound("t/k", W, "lo", "a"), kernels: ["profile", "fem"] } as unknown as ConstraintDef;
    expect(thrown(() => createRegistry([def]))).toMatchObject({ code: "E_SCHEMA", path: "/kernels/1", got: "fem", record: "t/k" });
  });

  test("a dim with no unit, or a unit that disagrees, is E_SCHEMA", () => {
    const noUnit = { ...factBound("t/u", W, "lo", "a"), units: {} } as ConstraintDef;
    expect(thrown(() => createRegistry([noUnit]))).toMatchObject({ code: "E_SCHEMA", path: "/units/conductor.width" });
    expect(thrown(() => createRegistry([factBound("t/a", W, "lo", "a"), factBound("t/b", W, "hi", "b", { unit: "in" })]))).toMatchObject({ code: "E_SCHEMA", got: "in" });
  });

  test("a step that disagrees, or is not positive, is E_SCHEMA", () => {
    const D = "cascade.depth" as const;
    expect(thrown(() => createRegistry([factBound("t/a", D, "lo", "a", { step: 1 }), factBound("t/b", D, "hi", "b")]))).toMatchObject({ code: "E_SCHEMA", path: "/steps/cascade.depth" });
    expect(thrown(() => createRegistry([factBound("t/a", D, "lo", "a", { step: 0 })]))).toMatchObject({ code: "E_SCHEMA", path: "/steps/cascade.depth" });
  });

  test("a bound from a kernel the def does not list is refused", () => {
    const def: ConstraintDef = { ...factBound("t/k", W, "lo", "a"), bounds: (): Bound[] => [{ value: 1, side: "lo", kernel: "sim", reason: "x", ...computed }] };
    expect(() => solve(createRegistry([def]), W, ctxOf({}))).toThrow(/kernel sim/);
  });

  test("an unregistered dim is E_REF with registered dims by edit distance", () => {
    const reg = createRegistry([factBound("t/a", W, "lo", "a"), factBound("t/b", "conductor.t", "lo", "a"), factBound("t/c", "spring.riseQ", "lo", "a")]);
    const e = thrown(() => solve(reg, "conductor.widht", ctxOf({})));
    expect(e.code).toBe("E_REF");
    expect(e.didYouMean?.[0]).toBe("conductor.width");
  });

  test("defsFor keeps registration order", () => {
    const a = factBound("t/z", W, "lo", "a");
    const b = factBound("t/a", W, "hi", "b");
    expect(createRegistry([a, b]).defsFor(W).map((d) => d.id)).toEqual(["t/z", "t/a"]);
  });
});

describe("purity (step 7)", () => {
  const defs = [
    factBound("t/printability", W, "lo", "a"), factBound("t/fatigue", W, "lo", "a"),
    factBound("t/resistance", W, "lo", "b", { kernel: "circuit" }), factBound("t/pitch", W, "hi", "c", { kernel: "mesh" }),
  ];
  const facts = { a: 0.8, b: 3.2291666666666665, c: 6 };

  test("the same query twice gives byte-equal RFC 8785 JSON", () => {
    const reg = createRegistry(defs);
    expect(canonicalize(solve(reg, W, ctxOf(facts)))).toBe(canonicalize(solve(reg, W, ctxOf(facts))));
  });

  test("bounds sort by value, then def id, then the def's own order", () => {
    const two: ConstraintDef = {
      ...factBound("t/m", W, "lo", "a"),
      bounds: (_d, ctx): Bound[] => [
        { value: ctx.facts["a"] as number, side: "lo", kernel: "profile", reason: "second", ...computed },
        { value: ctx.facts["a"] as number, side: "lo", kernel: "profile", reason: "first", ...computed },
      ],
    };
    const r = solve(createRegistry([factBound("t/z", W, "lo", "a"), two, factBound("t/b", W, "lo", "b")]), W, ctxOf({ a: 2, b: 1 }));
    expect(r.owners.lo).toEqual(["t/b", "t/m", "t/m", "t/z"]);
    expect(r.interval.lo.map((b) => b.reason)).toEqual(["b from facts", "second", "first", "a from facts"]);
    expect(r.interval.binding.lo).toEqual([1, 2, 3]);
  });

  test("registration order never changes the bytes", () => {
    const fwd = canonicalize(solve(createRegistry(defs), W, ctxOf(facts)));
    const rev = canonicalize(solve(createRegistry([...defs].reverse()), W, ctxOf(facts)));
    expect(rev).toBe(fwd);
  });

  test("query returns the Interval solve carries", () => {
    const reg = createRegistry(defs);
    expect(query(reg, W, ctxOf(facts))).toEqual(solve(reg, W, ctxOf(facts)).interval);
  });
});

describe("nearest (step 6)", () => {
  const reg = createRegistry([factBound("t/floor", W, "lo", "a"), factBound("t/ceil", W, "hi", "b")]);
  const iv = query(reg, W, ctxOf({ a: 3.23, b: 6 }));

  test("a value inside returns itself; outside clamps to the near end", () => {
    expect(nearest(iv, 4.5)).toBe(4.5);
    expect(nearest(iv, 1.0)).toBe(3.23);
    expect(nearest(iv, 7.0)).toBe(6);
    expect(nearest(iv, 3.23)).toBe(3.23);
  });

  test("an open end is unbounded and an empty interval gives null", () => {
    const open = query(createRegistry([factBound("t/floor", W, "lo", "a")]), W, ctxOf({ a: 2 }));
    expect(nearest(open, 1e6)).toBe(1e6);
    expect(nearest(open, 1)).toBe(2);
    const empty = query(reg, W, ctxOf({ a: 7, b: 6 }));
    expect(nearest(empty, 6.5)).toBeNull();
  });

  test("a non-finite measured value is E_PARAM_MISSING", () => {
    expect(thrown(() => nearest(iv, Number.NaN))).toMatchObject({ code: "E_PARAM_MISSING", path: "/measured" });
  });
});

describe("steps (step 8)", () => {
  const D = "cascade.depth" as const;
  const Q = "spring.riseQ" as const;

  test("an integer dim reports its floor rounded up and ceiling rounded down", () => {
    const reg = createRegistry([factBound("t/f", D, "lo", "a", { step: 1, unit: "stage" }), factBound("t/c", D, "hi", "b", { step: 1, unit: "stage" })]);
    // 1.2 / 0.37 is the TUMBLER Delrin ceiling in stages (M01-T10 table), 3.24 before the grid.
    expect(solve(reg, D, ctxOf({ a: 0.3, b: 1.2 / 0.37 })).interval.legal).toEqual([1, 3]);
    // 1.2 / 0.15 is 8.000000000000002 in binary; the grid keeps it at 8.
    expect(solve(reg, D, ctxOf({ a: 0, b: 1.2 / 0.15 })).interval.legal).toEqual([0, 8]);
  });

  test("a 0.01 grid lands on exact two-decimal values", () => {
    const reg = createRegistry([factBound("t/f", Q, "lo", "a", { step: 0.01, unit: "x t" }), factBound("t/c", Q, "hi", "b", { step: 0.01, unit: "x t" })]);
    const r = solve(reg, Q, ctxOf({ a: 1.715, b: 2.199 }));
    expect(r.interval.legal).toEqual([1.72, 2.19]);
    expect(canonicalize(r.interval.legal)).toBe("[1.72,2.19]");
    expect(r.interval.lo[0]!.value).toBe(1.715);
    // Binding compares unrounded bound values: the snapped ends match no bound.
    expect(r.interval.binding).toEqual({ lo: [0], hi: [0] });
  });

  test("binary rounding next to a grid point stays on that point", () => {
    const reg = createRegistry([factBound("t/f", Q, "lo", "a", { step: 0.01, unit: "x t" }), factBound("t/c", Q, "hi", "b", { step: 0.01, unit: "x t" })]);
    // 0.1 + 0.2 is 0.30000000000000004 and 0.7 + 0.1 is 0.7999999999999999 in binary.
    expect(solve(reg, Q, ctxOf({ a: 0.1 + 0.2, b: 0.7 + 0.1 })).interval.legal).toEqual([0.3, 0.8]);
  });

  test("snapping can empty an interval", () => {
    const reg = createRegistry([factBound("t/f", D, "lo", "a", { step: 1, unit: "stage" }), factBound("t/c", D, "hi", "b", { step: 1, unit: "stage" })]);
    const r = solve(reg, D, ctxOf({ a: 3.1, b: 3.9 }));
    expect(r.interval.legal).toBeNull();
    expect(r.unsat?.expected).toBe("a floor at most 3 stage, the ceiling");
  });

  test("onGrid on a 0.25 step", () => {
    expect(onGrid(11.3, 0.25, "up")).toBe(11.5);
    expect(onGrid(11.45, 0.25, "down")).toBe(11.25);
    expect(onGrid(11.25, 0.25, "up")).toBe(11.25);
  });
});
