// CHK-PRT-18 (piece count) and CHK-PRT-19 (floating piece) on the finding
// functions core calls where the import is read. The fixtures hold the
// pieces manifold took from the hbf image eval mushrooms of 2026-10-20
// (fixtures/CHK-PRT-18, -19: mush-first.stl with its cap floated above the
// stem, mush-prim.stl in one piece, measured); the boundary cases are
// written here from the D-054 grid step, never from the module under test.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { ResultTarget, Vec3 } from "@hackbuild/spec";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import { CHECK_MODULES, IMPORT_PATH_CHECKS, IMPORT_PATH_CONSTRAINT, prt18Finding, prt19Finding, registerChecks, type Piece } from "../src/index";

const at: ResultTarget = { level: "part", part: "mush" };
const fixture = <T>(id: string, which: string): T => JSON.parse(readFileSync(new URL(`./fixtures/${id}/${which}.json`, import.meta.url), "utf8")) as T;
const seed = JSON.parse(readFileSync(new URL("../seed/checks.seed.json", import.meta.url), "utf8")) as unknown;

/** One D-054 grid step, mm (spec/ids.ts MESH_GRID_PER_MM = 1024). */
const STEP = 1 / 1024;

/** A 10 mm cube standing at z0, mm. */
const cubeAt = (z0: number, x0 = 0): Piece => ({ bounds: [[x0, 0, z0] as Vec3, [x0 + 10, 10, z0 + 10] as Vec3] });

describe("CHK-PRT-18 piece count", () => {
  test("the fixtures: the floating cap mushroom fails undeclared at 2 pieces, the primitive mushroom passes at 1", () => {
    for (const which of ["fail", "pass"]) {
      const fx = fixture<{ pieces: number; want: { verdict: string; measured: number; lo: number; hi: number } }>("CHK-PRT-18", which);
      const f = prt18Finding(at, fx.pieces, undefined, { body: "mush" });
      expect([f.verdict, f.measured, f.legal], which).toEqual([fx.want.verdict, fx.want.measured, { kind: "interval", lo: fx.want.lo, hi: fx.want.hi, unit: "count", nearest: fx.want.lo }]);
      expect(f.extra).toEqual({ declared: 1, body: "mush" });
    }
  });

  test("declared 1 with 2 pieces fails with measured 2 and legal 1 to 1; declared 2 with 2 pieces passes", () => {
    const one = prt18Finding(at, 2, 1);
    expect([one.verdict, one.measured, one.legal]).toEqual(["fail", 2, { kind: "interval", lo: 1, hi: 1, unit: "count", nearest: 1 }]);
    expect(one.constraint).toContain("the file holds 2 pieces, declared 1");
    const two = prt18Finding(at, 2, 2);
    expect([two.verdict, two.measured, two.legal]).toEqual(["pass", 2, { kind: "interval", lo: 2, hi: 2, unit: "count", nearest: 2 }]);
  });

  test("with nothing declared the default is 1: an undeclared floating cap fails and one piece passes", () => {
    expect(prt18Finding(at, 2).verdict).toBe("fail");
    expect(prt18Finding(at, 2, undefined).verdict).toBe("fail");
    expect(prt18Finding(at, 1).verdict).toBe("pass");
  });
});

describe("CHK-PRT-19 floating piece", () => {
  test("the fixtures: the floating cap fails at its measured lift, the primitive mushroom passes", () => {
    for (const which of ["fail", "pass"]) {
      const fx = fixture<{ pieces: Piece[]; want: { verdict: string; measured: number; floating: number } }>("CHK-PRT-19", which);
      const f = prt19Finding(at, fx.pieces);
      expect([f.verdict, f.measured, f.extra?.["floating"], f.extra?.["pieces"]], which).toEqual([fx.want.verdict, fx.want.measured, fx.want.floating, fx.pieces.length]);
    }
    const cap = prt19Finding(at, fixture<{ pieces: Piece[] }>("CHK-PRT-19", "fail").pieces);
    expect(cap.extra?.["firstFloating"]).toBe("-13.21582,-13.21582,16.519531 to 13.21582,13.21582,30 mm");
    expect(cap.legal).toEqual({ kind: "interval", lo: 0, hi: STEP, unit: "mm", nearest: STEP });
  });

  test("a piece lifted 2 mm fails with measured 2, even with both pieces declared", () => {
    const pieces = [cubeAt(0), cubeAt(2, 20)];
    const f = prt19Finding(at, pieces);
    expect([f.verdict, f.measured, f.extra?.["floating"]]).toEqual(["fail", 2, 1]);
    expect(prt18Finding(at, pieces.length, 2).verdict).toBe("pass");
  });

  test("a lift within one grid step rests on the bed: 0, 0.0005 and exactly 1/1024 mm pass, 0.001 mm fails", () => {
    for (const lift of [0, 0.0005, STEP]) {
      const f = prt19Finding(at, [cubeAt(0), cubeAt(lift, 20)]);
      expect([f.verdict, f.extra?.["floating"]], `lift ${lift}`).toEqual(["pass", 0]);
    }
    const off = prt19Finding(at, [cubeAt(0), cubeAt(0.001, 20)]);
    expect([off.verdict, off.measured]).toEqual(["fail", 0.001]);
  });

  test("the bed plane is the part's lowest point, wherever the file puts it", () => {
    const f = prt19Finding(at, [cubeAt(-7), cubeAt(-5, 20)]);
    expect([f.verdict, f.measured]).toEqual(["fail", 2]);
    expect(prt19Finding(at, [cubeAt(-7), cubeAt(-7, 20)]).verdict).toBe("pass");
  });
});

describe("the registered runs", () => {
  test("both are entered, part level, and skip on a Part IR part with the import path reason", () => {
    const defs = registerChecks({ seed, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES).filter((d) => IMPORT_PATH_CHECKS.includes(d.id));
    expect(defs.map((d) => [d.id, d.version, d.appliesTo.level, d.severity, d.legalKind, d.needs])).toEqual([
      ["CHK-PRT-18", "1.0.0", "part", "block", "interval", ["mesh"]],
      ["CHK-PRT-19", "1.0.0", "part", "block", "interval", ["mesh"]],
    ]);
    for (const d of defs) {
      const rs = (d.run as (t: unknown, ctx: unknown) => readonly { verdict: string; constraint: string }[])({ part: { id: "p" } }, {});
      expect(rs.map((r) => [r.verdict, r.constraint]), d.id).toEqual([["skip", IMPORT_PATH_CONSTRAINT]]);
    }
  });
});
