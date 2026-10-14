// G-40 and G-18 on the flex-pair chase and bench (the reference's own
// files). CHECKS.md 2.7: a step's checks are those bound to a field of its
// panels; unbound checks belong to the last step; done is "no failing
// check", visited is a separate mark. The bed chip is CHK-PRT-16's verdict.

import { describe, expect, it } from "vitest";
import type { CheckResult } from "@hackbuild/spec";
import { bedFits, stepMarks, stepOfResults } from "../src/bench/steps.js";
import { chase } from "../../../reference/keys/flex-pair/chase.js";
import { bench } from "../../../reference/keys/flex-pair/bench.js";

const steps = bench.rail ?? [];
const res = (id: string, verdict: CheckResult["verdict"], param?: string): CheckResult =>
  ({ id, verdict, ...(param === undefined ? {} : { fix: { param, set: 1, paramLegal: [0, 2], predicts: { measured: 1, verdict: "pass" } } }) }) as unknown as CheckResult;

describe("step scope (CHECKS.md 2.7)", () => {
  it("a fix on a pad field is step 1, on a list item step 2, on the wire step 3; an unbound check is the export step", () => {
    const rs = [res("CHK-A", "pass", "/W"), res("CHK-KEY-01", "fail", "/keys/1/gap"), res("CHK-C", "warn", "/w"), res("CHK-PRT-16", "pass")];
    expect(stepOfResults(steps, chase.params, rs)).toEqual([0, 1, 2, 3]);
  });

  it("done means no failing check in the step; visited never implies done", () => {
    const rs = [res("CHK-A", "warn", "/W"), res("CHK-KEY-01", "fail", "/keys/0/gap"), res("CHK-PRT-16", "pass")];
    expect(stepMarks(steps, chase.params, rs, [0, 1])).toEqual([
      { done: true, visited: true },
      { done: false, visited: true },
      { done: true, visited: false },
      { done: true, visited: false },
    ]);
  });

  it("no build on screen marks no step done", () => {
    expect(stepMarks(steps, chase.params, null, [0]).map((m) => m.done)).toEqual([false, false, false, false]);
  });

  it("a failing unbound check holds the export step open", () => {
    expect(stepMarks(steps, chase.params, [res("CHK-PRT-16", "fail")], []).map((m) => m.done)).toEqual([true, true, true, false]);
  });
});

describe("bed chip (G-18)", () => {
  it("reads CHK-PRT-16 over every axis; one fail is over bed; none is unknown", () => {
    expect(bedFits([res("CHK-PRT-16", "pass"), res("CHK-PRT-16", "pass")])).toBe(true);
    expect(bedFits([res("CHK-PRT-16", "pass"), res("CHK-PRT-16", "fail")])).toBe(false);
    expect(bedFits([res("CHK-KEY-01", "fail")])).toBeNull();
  });
});
