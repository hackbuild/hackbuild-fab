// hbf chase.validate (M10-T04 acceptance, validate half). The CLI runs in
// process on the flex pair and on the fixtures under
// packages/chase/test/fixtures. The flex pair validates with 0 errors:
// key/flex-gap registers the contact.gap dim its params name.

import { describe, expect, it } from "vitest";
import { ERROR_TRANSPORT, type CommandError, type ValidateQuestion } from "@hackbuild/spec";
import { json, REF } from "./hbf.js";

const FIX = "packages/chase/test/fixtures";
type Out = { questions: ValidateQuestion[]; resolvedChecks: string[] };
const run = async (target: string) => {
  const { code, r } = await json("chase.validate", target);
  return { code, errors: r.errors as readonly CommandError[], result: r.result as unknown as Out, raw: r };
};

describe("chase.validate on the flex pair", () => {
  it("lists exactly two Q-TIER questions, at the cpla and ctpu slots, each with the inferred row in force", async () => {
    const { errors, result } = await run(REF);
    expect(errors.map((e) => `${e.code} ${e.path} ${String(e.got)}`)).toEqual([]);
    expect(result.questions.map((q) => [q.id, q.path, q.defaultInForce])).toEqual([
      ["Q-TIER", "/materials/1", "cpla.pip.along, 500 ohm cm inferred, CHK-NET-05 warns"],
      ["Q-TIER", "/materials/3", "ctpu.pip.bulk, 400 ohm cm inferred, CHK-NET-05 warns"],
    ]);
  }, 60_000);
  it("carries no string array named errors, missing or questions (plan-deltas R76)", async () => {
    const { raw } = await run(REF);
    const walk = (v: unknown, key: string): void => {
      if (Array.isArray(v)) {
        if (["errors", "missing", "questions"].includes(key)) for (const x of v) expect(typeof x, key).not.toBe("string");
        v.forEach((x) => walk(x, ""));
      } else if (typeof v === "object" && v !== null) for (const [k, x] of Object.entries(v)) walk(x, k);
    };
    walk(raw, "");
  }, 60_000);
});

describe("chase.validate on the fixtures", () => {
  it("surface-no-stack exits 0 with one question, Q-STACK at /build", async () => {
    const { code, errors, result } = await run(`${FIX}/surface-no-stack`);
    expect([code, errors]).toEqual([0, []]);
    expect(result.questions.map((q) => [q.id, q.path])).toEqual([["Q-STACK", "/build"]]);
  }, 60_000);
  it("rail-ends-in-check exits 2 with E_SCHEMA at /rail/<last>/step", async () => {
    const { code, errors } = await run(`${FIX}/rail-ends-in-check`);
    expect(code).toBe(2);
    expect(errors.map((e) => [e.code, e.path])).toEqual([["E_SCHEMA", "/rail/1/step"]]);
  }, 60_000);
  it.each([
    ["field-id-unique", "E_SCHEMA", "/params/1/fields/0/id"],
    ["enum-default", "E_SCHEMA", "/params/1/fields/0/default"],
    ["default-range", "E_SCHEMA", "/params/0/fields/0/default"],
    ["show-when", "E_REF", "/params/0/fields/1/showWhen"],
    ["preset-param", "E_REF", "/presets/0/params/wd"],
  ])("chase-param/%s exits 2 with %s at %s and record chase-param/<rule>", async (rule, code, at) => {
    const r = await run(`${FIX}/chase-param/${rule}`);
    expect(r.code).toBe(2);
    expect(ERROR_TRANSPORT[code as CommandError["code"]].exit).toBe(2);
    expect(r.errors.map((e) => [e.code, e.path, e.record])).toEqual([[code, at, `chase-param/${rule}`]]);
    if (code === "E_REF") expect(r.errors[0]!.didYouMean!.length).toBeGreaterThan(0);
  }, 60_000);
});
