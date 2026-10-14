// M01-T06 reference/electrical/trace-width-budget: the four conductor.width
// defs as core collects them, against the card's golden table
// (docs/plan/milestones/M01-constraints.md M01-T06), typed here as goldens,
// and hbf parity against the committed expected/ (never accepted here).

import { describe, expect, test } from "vitest";
import type { CommandResult, ConstraintCtx, Interval, ParamEnvelope } from "@hackbuild/spec";
import { createProfileLookup } from "@hackbuild/profile";
import { flexFatigueFloor, printabilityFloor } from "@hackbuild/profile";
import { pitchCeiling } from "@hackbuild/mesh";
import { runParity } from "../src/commands/parity.js";
import { fullProfile } from "../src/load-build.js";
import { hbf, json, ROOT } from "./hbf.js";

const REF = "reference/electrical/trace-width-budget";
const DIM = "conductor.width";
const COMMON = "pathMm=62,tMm=0.72,flexes=true,pitchMm=8.0,pitchClrMm=1.0";

/** The card's golden table: material, budget, legal, binding floor ids, the E_UNSAT expected line. */
const GOLDENS = [
  { n: 1, material: "cpla-protopasta", budget: 8000, legal: [3.23, 6], floorsBind: ["circuit"], code: 0, expected: null },
  { n: 2, material: "cpla", budget: 8000, legal: null, floorsBind: ["circuit"], code: 1, expected: "at least 71760 ohm at width 6.00, path 62.0, thickness 0.72" },
  { n: 3, material: "cpla-protopasta", budget: 2000, legal: null, floorsBind: ["circuit"], code: 1, expected: "at least 4306 ohm at width 6.00, path 62.0, thickness 0.72" },
  { n: 4, material: "cpla-protopasta", budget: null, legal: [0.8, 6], floorsBind: ["profile", "profile"], code: 0, expected: null },
] as const;

const argsOf = (g: (typeof GOLDENS)[number]): string[] =>
  ["constraints.query", DIM, "--material", g.material, "--facts", g.budget === null ? COMMON : `${COMMON},netBudgetOhm=${g.budget}`];

describe("conductor.width goldens from the CLI", () => {
  for (const g of GOLDENS) {
    test(`golden ${g.n}`, async () => {
      const { code, r } = await json(...argsOf(g));
      expect(code).toBe(g.code);
      const iv = r.result as unknown as Interval;
      expect(iv.legal === null ? null : iv.legal.map((v) => Number(v!.toFixed(2)))).toEqual(g.legal);
      expect(iv.binding.lo.map((i) => iv.lo[i]!.kernel)).toEqual(g.floorsBind);
      expect(iv.binding.hi.map((i) => iv.hi[i]!.reason)).toEqual(["key pitch 8.0 minus 1.0 clearance each side"]);
      expect(r.errors.map((e) => e.expected ?? null)).toEqual(g.expected === null ? [] : [g.expected]);
    });
  }

  test("golden 1 text prints legal 3.23 to 6.00 mm", async () => {
    const { code, out } = await hbf(argsOf(GOLDENS[0]));
    expect(code).toBe(0);
    expect(out.split("\n")[0]).toContain("legal 3.23 to 6.00 mm");
  });

  test("golden 2 text names the resistivity tier inferred on the resistance bound line", async () => {
    const { out } = await hbf(argsOf(GOLDENS[1]));
    const line = out.split("\n").find((l) => l.startsWith("  floor") && l.includes("CHK-NET-05"));
    expect(line).toBe("  floor 53.82 mm  8000 ohm budget at 62.0 mm path, 0.72 thick, 500 ohm cm (tier inferred)  [circuit, computed from inferred, CHK-NET-05]");
  });
});

describe("the three other conductor.width defs", () => {
  const ctx = (material: string, facts: ConstraintCtx["facts"]): ConstraintCtx => ({
    profile: createProfileLookup(fullProfile()), machine: "ffc5p", material, facts,
  });

  test("printability: nozzle bore 0.40 x 2 perimeters = 0.80 mm, computed from inferred", () => {
    const [b, ...rest] = printabilityFloor.bounds(DIM, ctx("cpla-protopasta", {}));
    expect(rest).toEqual([]);
    expect(b!.value).toBeCloseTo(0.8, 12);
    expect([b!.qualifier, b!.basis, b!.source]).toEqual(["computed", "inferred", "CHK-PRT-04"]);
  });

  test("printability on a machine with no preset is E_REF", () => {
    expect(() => printabilityFloor.bounds(DIM, { ...ctx("cpla", {}), machine: "centauri" })).toThrow(/no slicer preset/);
  });

  test("fatigue: 0.80 mm only when flexes is true, from the cpla family row", () => {
    expect(flexFatigueFloor.bounds(DIM, ctx("cpla-protopasta", { flexes: true })).map((b) => [b.value, b.qualifier, b.source]))
      .toEqual([[0.8, "inferred", "cpla.flexFatigueWidthMin"]]);
    expect(flexFatigueFloor.bounds(DIM, ctx("cpla", { flexes: false }))).toEqual([]);
    expect(flexFatigueFloor.bounds(DIM, ctx("cpla", {}))).toEqual([]);
    expect(flexFatigueFloor.bounds(DIM, ctx("petg", { flexes: true }))).toEqual([]);
  });

  test("pitch: 8.0 - 2 x 1.0 = 6.00 mm, and 10 - 2 x 1.5 = 7.00 mm", () => {
    expect(pitchCeiling.bounds(DIM, ctx("cpla", { pitchMm: 8, pitchClrMm: 1 }))[0]!.value).toBe(6);
    expect(pitchCeiling.bounds(DIM, ctx("cpla", { pitchMm: 10, pitchClrMm: 1.5 }))[0]!.value).toBe(7);
  });

  test("a missing pitch fact is E_PARAM_MISSING at its pointer", async () => {
    const { code, r } = await json("constraints.query", DIM, "--material", "cpla-protopasta", "--facts", "pathMm=62,tMm=0.72,pitchMm=8.0");
    expect(code).toBe(2);
    expect(r.errors.map((e) => [e.code, e.path])).toEqual([["E_PARAM_MISSING", "/facts/pitchClrMm"]]);
  });
});

describe("the param form on the built trace (M05-T17 step 7, M01-T06 acceptance line 2, D-248)", () => {
  test("/w is bound through the conductor and answers golden 1 with nothing unbound", async () => {
    const { code, r } = await json("constraints.query", "--chase", REF);
    expect(code).toBe(0);
    const env = r.result as unknown as ParamEnvelope;
    expect(env.unbound).toEqual([]);
    const w = env.params["/w"]!;
    expect(w.dim).toBe(DIM);
    expect(w.legal!.map((v) => Number(v!.toFixed(2)))).toEqual([3.23, 6]);
    // The conductor's own material prices it, never the PETG skin it is partitioned from.
    expect(w.lo.find((b) => b.kernel === "circuit")!.reason).toContain("30 ohm cm (tier vendor)");
  });
});

describe("hbf parity against the committed goldens", () => {
  test("every golden, query goldens included, is equal", async () => {
    const out = await runParity({ reference: REF }, ROOT);
    expect(out.files.map((f) => [f.file, f.status])).toEqual([
      ["build.json", "equal"], ["report.json", "equal"], ["edit.json", "equal"], ["artifacts.json", "equal"],
      ["expected/query-1.json", "equal"], ["expected/query-2.json", "equal"], ["expected/query-3.json", "equal"], ["expected/query-4.json", "equal"],
    ]);
    expect(out.ok).toBe(true);
  }, 120000);

  test("a query golden that differs from the rerun fails parity", async () => {
    const { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const dir = mkdtempSync(`${tmpdir()}/hbf-t06-`);
    try {
      cpSync(`${ROOT}/${REF}/expected`, dir, { recursive: true });
      const file = `${dir}/query-2.json`;
      writeFileSync(file, readFileSync(file, "utf8").replace("71760", "71759"));
      const out = await runParity({ reference: REF, expectedDir: dir }, ROOT);
      expect(out.files.filter((f) => f.status !== "equal").map((f) => [f.file, f.status, f.moved])).toEqual([["expected/query-2.json", "differs", ["errors"]]]);
      expect(out.ok).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120000);

  test("a query golden is a CommandResult with ok, verdict and errors as the card states", async () => {
    const { readFileSync } = await import("node:fs");
    const g = (n: number) => JSON.parse(readFileSync(`${ROOT}/${REF}/expected/query-${n}.json`, "utf8")) as CommandResult<Interval>;
    expect([1, 2, 3, 4].map((n) => [g(n).ok, g(n).verdict, g(n).errors.map((e) => e.code)])).toEqual([
      [true, "pass", []], [false, "fail", ["E_UNSAT"]], [false, "fail", ["E_UNSAT"]], [true, "pass", []],
    ]);
  });
});
