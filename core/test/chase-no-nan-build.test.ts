// The build half of the no-NaN property (D-131; M10-T03 step 6). fast-check
// generates stored documents for the flex-pair (keys deleted, unknown keys,
// NaN, Infinity, strings and stray numbers in fields, lists of 0 to max + 2
// items); each is deep-normalised by packages/chase and then either refused
// by the derived params schema with E_SCHEMA, or built, where every metric
// and every vertex coordinate is finite, or refused with E_PARAM_MISSING.
// A document whose values are all legal can still describe geometry the
// kernel cannot make (two keys at one x after a list is filled with item
// defaults): that is E_KERNEL with its record and no mesh (D-067), which
// is no NaN either, so it is an allowed outcome and counted.
// Builds are cached by their params, so 200 runs cost one build per
// distinct params object. packages/chase/test/no-nan.property.test.ts runs
// the normalise half over every chase on disk.

import { writeFileSync } from "node:fs";
import path from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { nonFiniteError, normaliseParams, paramsErrors } from "@hackbuild/chase";
import { isThrownCommandError, type ParamField } from "@hackbuild/spec";
import { buildPart, loadDesign, resolveParams } from "../src/commands/build.js";
import { REF, ROOT } from "./hbf.js";

const SEED = Number(process.env["HBF_PROPERTY_SEED"] ?? 20261014);
const NUM_RUNS = 200;

const junk = fc.oneof(
  fc.constant(Number.NaN), fc.constant(Number.POSITIVE_INFINITY), fc.string({ maxLength: 3 }), fc.constant(null), fc.boolean(),
  fc.double({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }),
);
function storedValue(f: ParamField): fc.Arbitrary<unknown> {
  if (f.type === "list") return fc.oneof(junk, fc.array(storedDoc(f.item), { minLength: 0, maxLength: f.max + 2 }));
  if (f.type === "enum") return fc.oneof(junk, fc.constantFrom(...f.options.map((o) => o.value)));
  return fc.oneof(junk, fc.constant("default" in f ? f.default : null));
}
function storedDoc(fields: readonly ParamField[]): fc.Arbitrary<Record<string, unknown>> {
  return fc.tuple(
    fc.record(Object.fromEntries(fields.map((f) => [f.id, storedValue(f)])), { requiredKeys: [] }),
    fc.dictionary(fc.constantFrom("extra", "__proto__"), junk, { maxKeys: 1 }),
  ).map(([k, extra]) => ({ ...extra, ...k }));
}

describe(`flex-pair builds no NaN from any stored document (seed ${SEED}, ${NUM_RUNS} runs)`, () => {
  it("each document is refused with E_SCHEMA, builds finite, or is E_PARAM_MISSING or E_KERNEL", async () => {
    const design = await loadDesign(REF, ROOT);
    const cache = new Map<string, Promise<string>>();
    const outcome = (params: Record<string, unknown>): Promise<string> => {
      const key = JSON.stringify(params);
      let p = cache.get(key);
      if (p === undefined) {
        p = (async () => {
          try {
            const built = await buildPart(design, resolveParams(design.chase, params, undefined));
            const e = nonFiniteError({
              metrics: built.part.metrics,
              bodies: built.meshed.bodies.map((b) => ({ id: b.id, positions: b.mesh.positions })),
            });
            return e === undefined ? "finite" : e.code;
          } catch (e) {
            if (isThrownCommandError(e)) return e.hbf.code;
            throw e;
          }
        })();
        cache.set(key, p);
      }
      return p;
    };
    const seen: Record<string, number> = {};
    await fc.assert(
      fc.asyncProperty(storedDoc(design.chase.params.flatMap((g) => g.fields)), async (doc) => {
        const { params } = normaliseParams(design.chase, doc);
        const refused = paramsErrors(design.chase, params);
        const got = refused.length > 0 ? (refused.every((e) => e.code === "E_SCHEMA") ? "E_SCHEMA" : "other") : await outcome(params);
        seen[got] = (seen[got] ?? 0) + 1;
        expect(["E_SCHEMA", "finite", "E_PARAM_MISSING", "E_KERNEL"]).toContain(got);
      }),
      { seed: SEED, numRuns: NUM_RUNS, verbose: 1 },
    );
    const summary = { chase: REF, seed: SEED, numRuns: NUM_RUNS, outcomes: seen, distinctBuilds: cache.size };
    console.log(`flex-pair no-nan ${JSON.stringify(summary)}`);
    const dir = process.env["HBF_EVIDENCE_DIR"];
    if (dir !== undefined) writeFileSync(path.join(dir, "no-nan-build.json"), `${JSON.stringify(summary, null, 1)}\n`);
    expect(seen["finite"] ?? 0).toBeGreaterThan(0);
  }, 600_000);
});
