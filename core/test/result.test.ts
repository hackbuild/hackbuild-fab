// CommandResult assembly and the text mirror (AGENT-SURFACE.md 6.1, 6.3):
// verdict from the worst finding, findings fail first then warn, ok from
// resultOk only, and the mirror prints status, findings, errors, next in
// that order. The part.build run asserts the result fields end to end.

import { describe, expect, it } from "vitest";
import type { CheckResult, CommandResult, Hash } from "@hackbuild/spec";
import { countsOf, errorResult, findingsOf, finish, worst } from "../src/result.js";
import { renderResult } from "../src/text.js";
import { fixCalls } from "../src/commands/build.js";
import { REF, json } from "./hbf.js";

const r = (id: string, verdict: CheckResult["verdict"]): CheckResult => ({
  id: id as CheckResult["id"], version: "1.0.0", verdict, severity: "block", target: { level: "part", part: "p" },
  measured: 1, legal: { kind: "interval", lo: 0, hi: 2, unit: "mm", nearest: 1 }, constraint: "c", origin: `hbf://check/${id}` as CheckResult["origin"],
});
const H = "0".repeat(64) as Hash;

describe("result assembly", () => {
  it("takes the worst verdict, counts each, and orders findings fail then warn", () => {
    const rs = [r("A", "pass"), r("B", "warn"), r("C", "fail"), r("D", "skip"), r("E", "warn")];
    expect(worst(rs)).toBe("fail");
    expect(worst([])).toBe("pass");
    expect(worst([r("D", "skip")])).toBe("skip");
    expect(countsOf(rs)).toEqual({ pass: 1, warn: 2, fail: 1, skip: 1 });
    expect(findingsOf(rs).map((x) => x.id)).toEqual(["C", "B", "E"]);
  });

  it("sets ok from resultOk alone", () => {
    const base = { stage: "done" as const, inputsHash: H, findings: [], counts: countsOf([]), errors: [], artifacts: [], next: [] };
    expect(finish({ ...base, verdict: "warn" }).ok).toBe(true);
    expect(finish({ ...base, verdict: "fail" }).ok).toBe(false);
    expect(finish({ ...base, verdict: "pass", errors: [{ code: "E_REF", hint: "x" }] }).ok).toBe(false);
  });

  it("puts the rebuild call in next for an E_HANDLE that names its chase", () => {
    const e = errorResult({ code: "E_HANDLE", hint: "collected", chase: "keys-flex-pair" }, H);
    expect(e.ok).toBe(false);
    expect(e.next).toEqual([{ command: "part.build", args: { chase: "keys-flex-pair" }, why: "rebuild; the store collected that build" }]);
  });

  it("prints the mirror in the order status, findings, errors, next", () => {
    const res: CommandResult<unknown> = finish({
      verdict: "fail", stage: "done", inputsHash: H, findings: [r("C", "fail"), r("B", "warn")], counts: { pass: 0, warn: 1, fail: 1, skip: 0 },
      errors: [{ code: "E_KERNEL", hint: "a kernel refused", record: "mesh-kernel" }], artifacts: [],
      next: [{ command: "part.build", args: { chase: "d", params: { "/w": 1 } }, why: "fix" }],
    });
    const lines = renderResult("check.run", "d", res).split("\n");
    expect(lines[0]).toMatch(/^FAIL check\.run d +1 fail +1 warn +0 pass +0 skip$/);
    const at = (pre: string): number => lines.findIndex((l) => l.startsWith(pre));
    expect(at("FAIL C")).toBeLessThan(at("WARN B"));
    expect(at("WARN B")).toBeLessThan(at("E_KERNEL"));
    expect(at("E_KERNEL")).toBeLessThan(at("next  hbf part.build d"));
  });
});

describe("fixCalls reads the one findingsOf (D-067 print order)", () => {
  const withFix = (x: CheckResult, param: string, set: number): CheckResult => ({ ...x, fix: { param, set, predicts: { measured: set, verdict: "pass" } } } as CheckResult);
  it("gives one next call per fail, warn and note fix, in FAIL, WARN, NOTE order", () => {
    const note = { ...withFix(r("N", "warn"), "/n", 3), severity: "note" } as CheckResult;
    const rs = [note, withFix(r("W", "warn"), "/w", 2), r("P", "pass"), withFix(r("F", "fail"), "/f", 1)];
    const next = fixCalls("part.build", "designs/d", rs, { preset: "p" });
    expect(next.map((n) => n.args)).toEqual([
      { preset: "p", params: { "/f": 1 }, chase: "designs/d" },
      { preset: "p", params: { "/w": 2 }, chase: "designs/d" },
      { preset: "p", params: { "/n": 3 }, chase: "designs/d" },
    ]);
    expect(next.map((n) => n.why.split(";")[0])).toEqual(["F fails", "W warns", "N warns"]);
    expect(fixCalls("check.run", "designs/d", [withFix(r("F", "fail"), "/f", 1)], {})[0]!.args).toEqual({ params: { "/f": 1 }, build: "designs/d" });
  });
});

describe("part.build CommandResult (M00-T13 step 3)", () => {
  it("carries buildHash, inputsHash, counts and the build uri; two runs agree", async () => {
    const a = await json("part.build", REF);
    const b = await json("part.build", REF);
    expect(a.code).toBe(0);
    expect(a.r.ok).toBe(true);
    expect(a.r.buildHash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.r.inputsHash).toMatch(/^[0-9a-f]{64}$/);
    expect(b.r.buildHash).toBe(a.r.buildHash);
    expect(b.r.inputsHash).toBe(a.r.inputsHash);
    expect(a.r.result?.["build"]).toBe(`hbf://build/${a.r.buildHash}`);
    const c = a.r.counts;
    expect(c.pass + c.warn + c.fail + c.skip).toBeGreaterThan(0);
    expect(a.r.findings.every((f) => f.verdict === "fail" || f.verdict === "warn")).toBe(true);
    expect(a.r.result?.["ir"]).toBeNull();
  }, 120_000);
});
