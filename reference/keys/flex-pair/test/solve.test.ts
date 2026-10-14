// M05-T18 acceptance on the committed goldens and a fresh preset "two"
// build. The figures come from the card (computed there from the PIP cpla
// row, 500 ohm cm along, pip-controller src/layout.js:46, tier inferred,
// and the D-241 band), never from the code under test: the goldens must
// hold them, and parity holds the goldens equal to a fresh build.
//
// K1 along: 15.0 mm centreline, 1.4 x 0.72 mm, 500 ohm cm, 74404.8 ohm.
// GND bus at preset "two": 44.0 mm, 218254.0 ohm. CHK-KEY-01 at defaults:
// measured 1.84 mm, legal 1.428 to 2.04 mm (35 to 50 percent of the built
// cone 4.08 mm, floor 1.2); the travel moved to 2.15 mm fails with fix
// 2.04 mm (D-064, D-241). All computed.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import type { CheckResult, Hash, Net } from "@hackbuild/spec";
import { buildPart, loadDesign, resolveParams, type Built } from "../../../../core/src/commands/build.js";
import { solveBuilt, type CircuitSolveOutput } from "../../../../core/src/commands/circuit-solve.js";
import type { CoreCtx } from "../../../../core/src/registry.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, "..");
const ROOT = path.resolve(DIR, "..", "..", "..");
const golden = <T>(name: string): T => JSON.parse(readFileSync(path.join(DIR, "expected", name), "utf8")) as T;

/** Card figures, ohm and mm (M05-T18 acceptance, computed). */
const KEY1_ALONG_OHM = 74404.8;
const KEY1_ALONG_MM = 15.0;
const GND_BUS_TWO_OHM = 218254.0;
const GND_BUS_TWO_MM = 44.0;
const REL = 1e-3;

const near = (got: number, want: number): void => {
  expect(Math.abs(got - want) / want).toBeLessThan(REL);
};
const alongOf = (net: Net | undefined, mm: number): number => {
  const seg = net?.resistance[0]?.preview.segments.find((s) => s.direction === "along" && Math.abs(s.lengthMm - mm) < 1e-9);
  expect(seg, `an along segment of ${mm} mm on net ${net?.id}`).toBeDefined();
  return seg!.ohm;
};

interface Solve { readonly ok: boolean; readonly result: CircuitSolveOutput }
interface Edit {
  readonly pointer: string; readonly from: number; readonly to: number;
  readonly expect: { readonly changed: readonly string[]; readonly verdicts?: readonly (Pick<CheckResult, "id" | "measured" | "legal" | "fix"> & { from: string; to: string })[] };
}

describe("keys flex-pair goldens hold the M05-T18 card", () => {
  test("report.json: CHK-KEY-01 on contact.key1 measures 1.84 mm in legal 1.428 to 2.04, pass; no result fails", () => {
    const report = golden<{ findings: CheckResult[] }>("report.json");
    const key = report.findings.filter((f) => f.id === "CHK-KEY-01");
    expect(key).toHaveLength(1);
    expect(key[0]!.target).toMatchObject({ level: "feature", feature: "contact.key1" });
    expect(key[0]!.verdict).toBe("pass");
    expect(key[0]!.measured).toBe(1.84);
    expect(key[0]!.legal).toMatchObject({ kind: "interval", lo: 1.428, hi: 2.04, unit: "mm" });
    expect(report.findings.filter((f) => f.verdict === "fail").map((f) => f.id)).toEqual([]);
    for (const id of ["CHK-KEY-02", "CHK-KEY-03", "CHK-NET-02"]) {
      expect(report.findings.filter((f) => f.id === id).map((f) => f.verdict), id).toEqual(["pass"]);
    }
  });

  test("edit.json: the chase default travel 1.84 to 2.15 flips CHK-KEY-01 pass to fail, legal 1.428 to 2.04, fix set 2.04", () => {
    const edit = golden<Edit>("edit.json");
    expect([edit.pointer, edit.from, edit.to]).toEqual(["/params/1/fields/0/item/3/default", 1.84, 2.15]);
    expect(edit.expect.verdicts?.map((v) => [v.id, v.from, v.to])).toEqual([["CHK-KEY-01", "pass", "fail"]]);
    const flip = edit.expect.verdicts![0]!;
    expect(flip.measured).toBe(2.15);
    expect(flip.legal).toMatchObject({ kind: "interval", lo: 1.428, hi: 2.04 });
    expect(flip.fix).toMatchObject({ param: "/keys/0/gap", set: 2.04, predicts: { verdict: "pass" } });
    expect([...edit.expect.changed].sort()).toEqual(["conductor.gnd1col", "conductor.key1col"]);
  });

  test("query-solve.json: nets GND and K1 with their clip pads, K1 along 74404.8 ohm, one read on K1 at 5 tau, wait 3500 us inferred, ok", () => {
    const solve = golden<Solve>("query-solve.json");
    const out = solve.result;
    expect(out.nets.map((n) => n.id).sort()).toEqual(["GND", "K1"]);
    expect(out.nets.find((n) => n.id === "K1")!.terminals).toEqual(["port.key1", "pad.key1"]);
    expect(out.nets.find((n) => n.id === "GND")!.terminals).toEqual(["port.gnd", "pad.gnd"]);
    near(alongOf(out.nets.find((n) => n.id === "K1"), KEY1_ALONG_MM), KEY1_ALONG_OHM);
    expect(out.reads).toHaveLength(1);
    const read = out.reads[0]!;
    expect([read.net, read.settleTaus, read.wait.emit.value, read.wait.emit.unit, read.wait.emit.qualifier, read.ok]).toEqual(["K1", 5, 3500, "us", "inferred", true]);
    const n05 = out.results.find((r) => r.id === "CHK-NET-05" && (r.target as { feature?: string }).feature === "port.key1");
    expect(n05?.verdict).toBe("skip");
    expect(n05?.constraint).toContain("no port with read model pullup");
  });
});

describe("keys flex-pair at preset two, built now", () => {
  let two: Built;
  let solved: CircuitSolveOutput;
  beforeAll(async () => {
    const design = await loadDesign("reference/keys/flex-pair", ROOT);
    two = await buildPart(design, resolveParams(design.chase, undefined, "two"));
    const ctx = { workspace: ROOT, cwd: ROOT, inputsHash: "0".repeat(64) as Hash } as unknown as CoreCtx;
    solved = (await solveBuilt(two, { build: "reference/keys/flex-pair" }, ctx)).result as CircuitSolveOutput;
  }, 120_000);

  test("the GND bus runs 44.0 mm, 218254.0 ohm along; each key trace 74404.8 ohm along (computed, tier inferred)", () => {
    near(alongOf(solved.nets.find((n) => n.id === "GND"), GND_BUS_TWO_MM), GND_BUS_TWO_OHM);
    for (const k of ["K1", "K2"]) near(alongOf(solved.nets.find((n) => n.id === k), KEY1_ALONG_MM), KEY1_ALONG_OHM);
    for (const n of solved.nets) expect(n.tier).toBe("inferred");
  });

  test("one 3 x 3 mm clip pad per net, two reads", () => {
    const pads = two.part.features.filter((f) => f.kind === "pad");
    expect(pads.map((f) => [f.id, f.kind === "pad" ? f.net : "", f.kind === "pad" ? f.for : "", f.kind === "pad" ? f.size : []]).sort())
      .toEqual([["pad.gnd", "GND", "clip", [3, 3]], ["pad.key1", "K1", "clip", [3, 3]], ["pad.key2", "K2", "clip", [3, 3]]]);
    expect(solved.reads.map((r) => r.net)).toEqual(["K1", "K2"]);
  });

  test("wire cups get no pad and keep the LEADS warning", async () => {
    const design = await loadDesign("reference/keys/flex-pair", ROOT);
    const cups = await buildPart(design, resolveParams(design.chase, { pads: "cup" }, undefined));
    expect(cups.part.features.filter((f) => f.kind === "pad")).toEqual([]);
    expect(cups.part.warnings.map((w) => w.code)).toContain("LEADS");
  }, 120_000);
});
