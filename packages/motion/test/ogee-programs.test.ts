// M07-T11: OGEE setPixel and clear as Motion IR. Expected values come from
// the M07-T01 record packages/motion/records/ogee16-kin.json, whose
// `programs` block replays the viewer's apply() rule over kin.py in Python
// (designs/ogee16/extract/kin-record.py), and from its 128
// check_viewer rows for the crank angles; none is computed by this package.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { isThrownCommandError } from "@hackbuild/spec";
import {
  expectSet, latchedCells, latchMachine, ogeeCranks, ogeeKinematics, ogeeProgram, readScadParams, runProgram,
} from "@hackbuild/motion";

const root = new URL("../../../", import.meta.url);
const read = (p: string): string => readFileSync(new URL(p, root), "utf8");

interface Rec {
  result: {
    rows: { names: string[]; kinPy: number[][] };
    programs: {
      checker: { latched: number; cells: number[][]; matrix: number[][] };
      clearAfterChecker: number;
      barAlone: [string, number, number][];
      all: number;
      pullCamPlus004: { lp: number; latched: number };
      pullCamPlus005: { lp: number; latched: number };
    };
  };
}
const rec = JSON.parse(read("packages/motion/records/ogee16-kin.json")) as Rec;
const K = ogeeKinematics(readScadParams(read("designs/ogee16/legacy/source/params.scad")));
const M = latchMachine(K.latch);
const cells = (p: ReturnType<typeof ogeeProgram>, from = M.init()): string[] => {
  const m = { ...M, init: () => from };
  const run = runProgram(m, p);
  return latchedCells(run.result.states.at(-1) ?? M.view(from));
};
const matrixCells = (mx: number[][]): string[] => mx.flatMap((r, i) => r.flatMap((v, j) => (v === 1 ? [`${i},${j}`] : [])));

describe("setPixel and clear (computed)", () => {
  test("checker latches the 8 cells the record lists, in the viewer's drive order", () => {
    const p = ogeeProgram(K, "ogee.checker");
    const run = runProgram(M, p);
    expect(latchedCells(run.result.states.at(-1)!)).toEqual(matrixCells(rec.result.programs.checker.matrix));
    expect(rec.result.programs.checker.latched).toBe(8);
    expect(latchedCells(run.result.states.at(-1)!)).toEqual(["0,0", "0,2", "1,1", "1,3", "2,0", "2,2", "3,1", "3,3"]);
    // One commit per drive: the latched set grows one cell a sweep.
    expect(run.result.states.map((s) => latchedCells(s).length)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test("clear after checker leaves the record's 0", () => {
    const chk = ogeeProgram(K, "ogee.checker"), clr = ogeeProgram(K, "ogee.clear");
    const run = runProgram(M, { ...chk, id: "checker then clear", ops: [...chk.ops, ...clr.ops] });
    expect(latchedCells(run.result.states.at(-2)!)).toHaveLength(8);
    expect(latchedCells(run.result.states.at(-1)!)).toHaveLength(rec.result.programs.clearAfterChecker);
  });

  test("all latches the record's 16", () => {
    expect(cells(ogeeProgram(K, "ogee.all"))).toHaveLength(rec.result.programs.all);
  });

  test("each bar alone latches the record's 0 (CHK-MOT-04 kernel)", () => {
    for (const [kind, k, n] of rec.result.programs.barAlone) {
      const p = ogeeProgram(K, kind === "row" ? "ogee.row" : "ogee.col", kind === "row" ? { i: k } : { j: k });
      expect(cells(p), `${kind} ${k}`).toHaveLength(n);
    }
  });

  test("a pull to the record's CAM + 0.04 keeps all 16; to CAM + 0.05 clears", () => {
    const full = { ...M.init(), latched: Array.from({ length: K.N }, () => new Array<0 | 1>(K.N).fill(1)) };
    const { pullCamPlus004: keep, pullCamPlus005: drop } = rec.result.programs;
    expect(keep.lp.toFixed(3)).toBe("0.965");
    expect(drop.lp.toFixed(3)).toBe("0.975");
    expect(cells(ogeeProgram(K, "ogee.clear", { lp: keep.lp }), full)).toHaveLength(keep.latched);
    expect(cells(ogeeProgram(K, "ogee.clear", { lp: drop.lp }), full)).toHaveLength(drop.latched);
  });

  test("diagonal latches the four diagonal cells", () => {
    expect(cells(ogeeProgram(K, "ogee.diagonal"))).toEqual(["0,0", "1,1", "2,2", "3,3"]);
  });

  test("--expect all against checker fails with the measured and declared sets", () => {
    const measured = cells(ogeeProgram(K, "ogee.checker"));
    const all = cells(ogeeProgram(K, "ogee.all"));
    const e = expectSet(measured, all);
    expect(e.pass).toBe(false);
    expect(e.measured).toHaveLength(8);
    expect(e.declared).toHaveLength(16);
    expect(e.missing).toEqual(["0,1", "0,3", "1,0", "1,2", "2,1", "2,3", "3,0", "3,2"]);
    expect(expectSet(measured, matrixCells(rec.result.programs.checker.matrix)).pass).toBe(true);
  });
});

describe("crank angles for drive servos (computed)", () => {
  test("rest 228.590 and full stroke 131.410 deg; the latch crank swings 14.478 deg either side of centre (computed)", () => {
    const c = ogeeCranks(K);
    const { names, kinPy } = rec.result.rows;
    const phi = names.indexOf("crank phi"), lphi = names.indexOf("latch phi");
    // check_viewer.py case 1 (all at rest), cell 0,0; case 2 (row 0 at STROKE), cell 0,0; case 7 (lp at LP_SLIDE), cell 0,0.
    expect(Math.abs(c.restDeg - kinPy[0]![phi]!)).toBeLessThan(1e-9);
    expect(Math.abs(c.fullDeg - kinPy[16]![phi]!)).toBeLessThan(1e-9);
    expect(Math.abs(c.latchRestDeg - kinPy[0]![lphi]!)).toBeLessThan(1e-9);
    expect(Math.abs(c.latchPulledDeg - kinPy[96]![lphi]!)).toBeLessThan(1e-9);
    expect([c.restDeg, c.fullDeg, -c.latchRestDeg, c.latchPulledDeg].map((v) => v.toFixed(3))).toEqual(["228.590", "131.410", "14.478", "14.478"]);
  });
});

describe("the IR", () => {
  test("a drive is ease up, commit, ease down over the viewer's 700 ms", () => {
    const p = ogeeProgram(K, "ogee.setPixel", { i: 1, j: 2 });
    expect(p.ops.map((o) => o.op)).toEqual(["move", "move", "commit", "move", "move"]);
    expect(runProgram(M, p).durationS).toBeCloseTo(0.7, 12);
    expect(runProgram(M, ogeeProgram(K, "ogee.clear")).durationS).toBeCloseTo(0.9, 12);
  });

  test("a state variable the machine lacks is E_REF", () => {
    let code = "";
    try {
      runProgram(M, { id: "x", machine: "ogee16", args: {}, ops: [{ op: "set", target: "zR[7]", value: 1 }] });
    } catch (e) {
      if (isThrownCommandError(e)) code = e.hbf.code;
    }
    expect(code).toBe("E_REF");
  });
});
