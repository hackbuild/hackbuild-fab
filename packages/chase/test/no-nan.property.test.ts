// No stored document yields NaN (D-131; M10-T03 step 6). For every
// reference and design chase on disk, fast-check generates stored
// documents from the defaults by deleting nested keys, adding unknown
// keys, writing NaN, Infinity, strings, nulls and stray finite numbers
// into fields, and giving lists 0 to max + 2 items. Every document, after
// deep normalise, either passes the derived params schema with every
// number finite (so build.ts never reads a missing or non-finite value)
// or is refused with E_SCHEMA. The build half, finite vertices and
// metrics or E_PARAM_MISSING, runs in core/test/chase-no-nan-build.test.ts.
// The seed is fixed and printed; a failure shrinks and prints the document.

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { inputFields, nonFiniteError, normaliseParams, paramsErrors } from "@hackbuild/chase";
import type { Chase, ParamField } from "@hackbuild/spec";
import { chaseFiles, readChase } from "./helpers.js";

/** Seed of record; override with HBF_PROPERTY_SEED to replay a run. */
export const SEED = Number(process.env["HBF_PROPERTY_SEED"] ?? 20261014);
export const NUM_RUNS = 200;

const junk = fc.oneof(
  fc.constant(Number.NaN), fc.constant(Number.POSITIVE_INFINITY), fc.constant(Number.NEGATIVE_INFINITY),
  fc.string({ maxLength: 4 }), fc.constant(null), fc.constant({}), fc.boolean(),
  fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 }),
);

/** A stored value for one field: absent, junk, or a plausible value (a list holds 0 to max + 2 items). */
function storedValue(f: ParamField): fc.Arbitrary<unknown> {
  if (f.type === "list") {
    return fc.oneof(junk, fc.array(storedDoc(f.item), { minLength: 0, maxLength: f.max + 2 }));
  }
  if (f.type === "instances") {
    const types = Object.keys(f.types);
    const one = fc.record({ id: fc.string({ minLength: 1, maxLength: 3 }), type: types.length > 0 ? fc.constantFrom(...types, "stray") : fc.constant("stray") }, { requiredKeys: [] });
    return fc.oneof(junk, fc.array(one, { minLength: 0, maxLength: f.max + 2 }));
  }
  if (f.type === "enum") return fc.oneof(junk, fc.constantFrom(...f.options.map((o) => o.value)));
  if (f.type === "bool" || f.type === "text" || f.type === "slot") return fc.oneof(junk, fc.constant(f.default));
  if (f.type === "mm" || f.type === "deg" || f.type === "int" || f.type === "ratio" || f.type === "number") return fc.oneof(junk, fc.constant(f.default));
  return junk;
}

/** A stored object for a field set: each key kept, deleted or replaced, plus unknown keys. */
function storedDoc(fields: readonly ParamField[]): fc.Arbitrary<Record<string, unknown>> {
  const known = Object.fromEntries(fields.map((f) => [f.id, storedValue(f)]));
  return fc.tuple(
    fc.record(known, { requiredKeys: [] }),
    fc.dictionary(fc.constantFrom("extra", "zz", "__proto__", "T0"), junk, { maxKeys: 2 }),
  ).map(([k, extra]) => ({ ...extra, ...k }));
}

/** JSON pointer of the first non-finite number, or undefined. */
function nonFinite(v: unknown, at = ""): string | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? undefined : at || "/";
  if (Array.isArray(v)) return v.map((x, i) => nonFinite(x, `${at}/${i}`)).find((x) => x !== undefined);
  if (v !== null && typeof v === "object") return Object.entries(v).map(([k, x]) => nonFinite(x, `${at}/${k}`)).find((x) => x !== undefined);
  return undefined;
}

const files = chaseFiles();
const withParams = files.map((f) => [f, readChase(f)] as const).filter(([, c]) => inputFields(c).length > 0);

describe(`no stored document yields NaN (seed ${SEED}, ${NUM_RUNS} runs per chase)`, () => {
  it("covers the chases on disk that take params", () => {
    console.log(`no-nan property seed ${SEED}, ${NUM_RUNS} runs per chase over ${withParams.length} chases`);
    expect(withParams.length).toBeGreaterThan(30);
  });
  it.each(withParams.map(([f, c]) => [f, c] as [string, Chase]))("%s", (_f, chase) => {
    const outcomes = { finite: 0, refused: 0 };
    fc.assert(
      fc.property(storedDoc(chase.params.flatMap((g) => g.fields)), (doc) => {
        const { params } = normaliseParams(chase, doc);
        expect(nonFinite(params)).toBeUndefined();
        const errs = paramsErrors(chase, params);
        if (errs.length === 0) outcomes.finite += 1;
        else {
          outcomes.refused += 1;
          expect(errs.every((e) => e.code === "E_SCHEMA")).toBe(true);
        }
      }),
      { seed: SEED, numRuns: NUM_RUNS, verbose: 1 },
    );
    expect(outcomes.finite + outcomes.refused).toBe(NUM_RUNS);
    expect(outcomes.finite).toBeGreaterThan(0);
  });
});

describe("the D-131 check after a build", () => {
  it("passes a build whose metrics and vertices are finite", () => {
    expect(nonFiniteError({ metrics: [{ id: "keys.1.travel", value: 1.84, drivenBy: ["/keys/0/gap"] }, { id: "verdict", value: "ok" }], bodies: [{ id: "pad", positions: [0, 1, 2] }] })).toBeUndefined();
  });
  it("is E_PARAM_MISSING naming the drivenBy pointers of a non-finite metric", () => {
    const e = nonFiniteError({ metrics: [{ id: "keys.1.travel", value: Number.NaN, drivenBy: ["/keys/0/gap", "/keys/0/cone"] }] });
    expect([e?.code, e?.path]).toEqual(["E_PARAM_MISSING", "/keys/0/gap"]);
    expect(e?.hint).toContain("/keys/0/gap, /keys/0/cone");
  });
  it("is E_PARAM_MISSING on a non-finite vertex coordinate", () => {
    const e = nonFiniteError({ metrics: [], bodies: [{ id: "pad", positions: [0, 0, 0, 1, Number.POSITIVE_INFINITY, 0] }] });
    expect([e?.code, e?.hint]).toEqual(["E_PARAM_MISSING", "body pad vertex 1 has coordinate Infinity; a param reached the geometry without a value"]);
  });
});
