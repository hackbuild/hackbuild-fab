// M01-T07 reference: the committed goldens under expected/ against the card
// and against geometry computed here from the declared defaults, never
// against values this run writes. hbf parity --accept is the only writer
// of the goldens (D-227); this test reruns parity without accept under a
// SOURCE_DATE_EPOCH other than the pinned one, so a golden that follows the
// clock or HEAD fails here.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { Bound, CommandResult, Interval } from "@hackbuild/spec";
import { runParity } from "../../../../core/src/commands/parity.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, "..");
const ROOT = path.resolve(DIR, "..", "..", "..");
const REF = "reference/keys/click-spring-window";
const golden = <T>(name: string): T => JSON.parse(readFileSync(path.join(DIR, "expected", name), "utf8")) as T;

// Card, M01-T07: golden table at PIP defaults and the acceptance lines.
const CARD = { legal: [1.72, 2.19], snap: 1.16, bistable: 2.31, acrossStrain: 1.71, pinnedEpoch: 315532800 } as const;
// PIP defaults (layout.js line 36), as chase.ts declares them: mm.
const PIP = { l: 24, t: 0.55, w: 1.6, g: 1, Q: 2 } as const;

type Query = CommandResult<Interval>;
const binding = (iv: Interval): { lo: Bound[]; hi: Bound[] } => ({ lo: iv.binding.lo.map((i) => iv.lo[i]!), hi: iv.binding.hi.map((i) => iv.hi[i]!) });

describe("query goldens", () => {
  test(`PIP defaults: legal ${CARD.legal[0]} to ${CARD.legal[1]} x t, binding floor drop and ceiling strain, exit 0`, () => {
    const q = golden<Query>("query-pip.json");
    const iv = q.result!;
    expect([q.verdict, q.errors]).toEqual(["pass", []]);
    expect([iv.dim, iv.unit, iv.legal]).toEqual(["spring.Q", "x t", CARD.legal]);
    const b = binding(iv);
    expect(b.lo.map((x) => [x.value, x.kernel, x.source])).toEqual([[CARD.legal[0], "sim", "CHK-KEY-04"]]);
    expect(b.lo[0]!.reason).toMatch(/^drop at least click\.dropMin/);
    expect(b.hi.map((x) => [x.value, x.kernel, x.source])).toEqual([[CARD.legal[1], "profile", "CHK-KEY-04"]]);
    expect(b.hi[0]!.reason).toMatch(/^strain at the stop at most 2\.50 percent/);
    expect(iv.lo.map((x) => x.value)).toContain(CARD.snap);
    expect(iv.hi.map((x) => x.value)).toContain(CARD.bistable);
  });

  test("l 22, t 0.5: recorded as computed by the port, a pass with drop and strain binding", () => {
    const q = golden<Query>("query-l22.json");
    const iv = q.result!;
    expect(q.verdict).toBe("pass");
    expect(iv.legal).not.toBeNull();
    expect(binding(iv).lo[0]!.reason).toMatch(/^drop at least/);
    expect(binding(iv).hi[0]!.reason).toMatch(/^strain at the stop/);
    expect(iv.lo[0]!.reason).toContain("l 22 t 0.5");
  });

  test(`bend acrossLayers: E_UNSAT, drop floor ${CARD.legal[0]} over the strain ceiling ${CARD.acrossStrain} at 1.50 percent`, () => {
    const q = golden<Query>("query-across.json");
    const iv = q.result!;
    expect([q.verdict, iv.legal]).toEqual(["fail", null]);
    expect(q.errors.map((e) => [e.code, e.record])).toEqual([["E_UNSAT", "sim/click-spring-window"]]);
    const b = binding(iv);
    expect(b.lo.map((x) => [x.value, x.reason.split(" ")[0]])).toEqual([[CARD.legal[0], "drop"]]);
    expect(b.hi.map((x) => [x.value, x.reason.split(" ")[0]])).toEqual([[CARD.acrossStrain, "strain"]]);
    expect(b.hi[0]!.reason).toContain("1.50 percent, petg click bent across layers");
  });
});

describe("build goldens", () => {
  test("pinned to the epoch 315532800", () => {
    expect(golden<{ inputs: { sourceDateEpoch: number } }>("build.json").inputs.sourceDateEpoch).toBe(CARD.pinnedEpoch);
  });

  test("two arches, each volume t l w within 0.1 percent: a vertical offset of t over the span has area t l exactly", () => {
    const vols = golden<{ volumes: Record<string, number> }>("build.json").volumes;
    expect(Object.keys(vols).sort()).toEqual(["arch1", "arch2"]);
    const want = PIP.t * PIP.l * PIP.w;
    for (const v of Object.values(vols)) expect(Math.abs(v - want) / want).toBeLessThan(1e-3);
  });

  test("the parity edit raises Q one step, moves both arches and the rise by t x 0.01", () => {
    const e = golden<{ pointer: string; from: number; to: number; expect: { changed: string[]; unchanged: string[]; metricDelta: Record<string, number> } }>("edit.json");
    expect([e.pointer, e.from, e.to]).toEqual(["/Q", PIP.Q, 2.01]);
    expect(e.expect.changed).toEqual(["arch1", "arch2"]);
    expect(e.expect.metricDelta["spring.riseMm"]).toBeCloseTo(PIP.t * 0.01, 9);
  });
});

describe("parity against the committed goldens", () => {
  const saved = process.env["SOURCE_DATE_EPOCH"];
  beforeAll(() => {
    process.env["SOURCE_DATE_EPOCH"] = "1791072000";
  });
  afterAll(() => {
    if (saved === undefined) delete process.env["SOURCE_DATE_EPOCH"];
    else process.env["SOURCE_DATE_EPOCH"] = saved;
  });

  test("every golden, the three query goldens included, is equal", async () => {
    const out = await runParity({ reference: REF }, ROOT);
    expect(out.files.map((f) => [f.file, f.status])).toEqual([
      ["build.json", "equal"], ["report.json", "equal"], ["edit.json", "equal"], ["artifacts.json", "equal"],
      ["expected/query-pip.json", "equal"], ["expected/query-l22.json", "equal"], ["expected/query-across.json", "equal"],
    ]);
    expect(out.ok).toBe(true);
  }, 300_000);
});
