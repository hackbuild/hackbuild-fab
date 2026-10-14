// M07-T11 step 6a: the STIPPLE R17b write schedule as Motion IR, the
// second CHK-MOT-04 and CHK-MOT-06 fixture. Inputs are the legacy copies
// in designs/stipple/legacy (sha256 checked against SHA256SUMS). Expected
// sets are the page's own pattern lines, read from the page and evaluated
// here, and the placement check counts are the page's boot chip as the
// STIPPLE record measured it headless on 2026-10-05 ("22 placement checks
// pass", knowledge/designs/stipple.md section 1.2).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  latchedCells, latchMachine, readStippleParams, runProgram, stippleKinematics, stipplePattern, stippleProgram,
} from "@hackbuild/motion";

const root = new URL("../../../", import.meta.url);
const LEGACY = "designs/stipple/legacy/";
const bytes = (p: string): Buffer => readFileSync(new URL(p, root));
const page = bytes(`${LEGACY}stipple-r17b.html`).toString("utf8");
const lines = page.split("\n");
const K = stippleKinematics(readStippleParams(page), "stipple-r17b");
const K17 = stippleKinematics(readStippleParams(bytes(`${LEGACY}stipple-r17.html`).toString("utf8")), "stipple-r17");
const M = latchMachine(K.latch);
const last = (id: Parameters<typeof stippleProgram>[1], args?: Record<string, number>): string[] =>
  latchedCells(runProgram(M, stippleProgram(K, id, args)).result.states.at(-1)!);
const cellsOf = (g: number[][]): string[] => g.flatMap((r, i) => r.flatMap((v, j) => (v ? [`${i},${j}`] : [])));

describe("the legacy copies", () => {
  test("match SHA256SUMS", () => {
    for (const row of bytes(`${LEGACY}SHA256SUMS`).toString("utf8").trim().split("\n")) {
      const [h, f] = row.split(/\s+/);
      expect(createHash("sha256").update(bytes(`${LEGACY}${f}`)).digest("hex"), f).toBe(h);
    }
  });

  test("DATA.P reads N 10, STROKE 5.0, R_LATCH 4.5 on R17b and STROKE 4.8 on R17", () => {
    expect([K.N, K.P.STROKE, K.P.R_LATCH, K.P.FACE2_TOP]).toEqual([10, 5, 4.5, 78.5]);
    expect([K17.P.STROKE, K17.P.R_LATCH, K17.P.FACE2_TOP]).toEqual([4.8, 4.2, undefined]);
  });
});

describe("write schedule (computed)", () => {
  test("the patterns are the page's lines 461 and 542", () => {
    expect(lines[460]).toContain("g[i][j] = ((i*j + i + j) % 3 === 0) ? 1 : 0;");
    expect(lines[541]).toContain("g[i][j] = ((i+j+k) % 2 === 0) ? 1 : 0;");
    const want = (f: (i: number, j: number) => boolean): string[] => [...Array(100).keys()].filter((k) => f(Math.floor(k / 10), k % 10)).map((k) => `${Math.floor(k / 10)},${k % 10}`);
    expect(cellsOf(stipplePattern(K, "checker"))).toEqual(want((i, j) => (i + j + 1) % 2 === 0));
    expect(cellsOf(stipplePattern(K, "rowWrite"))).toEqual(want((i, j) => (i * j + i + j) % 3 === 0));
  });

  test("checker latches exactly its 50 cells, all 100, the row-write pattern its own", () => {
    expect(last("stipple.checker")).toEqual(cellsOf(stipplePattern(K, "checker")));
    expect(last("stipple.checker")).toHaveLength(50);
    expect(last("stipple.all")).toHaveLength(100);
    expect(last("stipple.rowWrite")).toEqual(cellsOf(stipplePattern(K, "rowWrite")));
  });

  test("a frame is one clear and one cycle per row that wants a pixel: 1 + 10 commits for checker", () => {
    const run = runProgram(M, stippleProgram(K, "stipple.checker"));
    expect(run.result.states).toHaveLength(11);
    // 0.22 + 0.12 + 0.22 s of clear, then 10 cycles of 0.26 + 0.20 s.
    expect(run.durationS).toBeCloseTo(0.56 + 10 * 0.46, 12);
  });

  test("a row or column comb raised alone latches nothing (CHK-MOT-04)", () => {
    for (let k = 0; k < K.N; k += 1) {
      expect(last("stipple.row", { i: k }), `row ${k}`).toEqual([]);
      expect(last("stipple.col", { j: k }), `col ${k}`).toEqual([]);
    }
  });

  test("the clear drops a full frame", () => {
    const all = stippleProgram(K, "stipple.all"), clr = stippleProgram(K, "stipple.clear");
    const run = runProgram(M, { ...all, ops: [...all.ops, ...clr.ops] });
    expect(latchedCells(run.result.states.at(-2)!)).toHaveLength(100);
    expect(latchedCells(run.result.states.at(-1)!)).toEqual([]);
  });
});

describe("buildCheck (computed)", () => {
  test("R17b: the page's 22 placement checks pass on the placed parts", () => {
    const c = K.buildCheck();
    expect(c.rows).toHaveLength(22);
    expect(c.bad).toEqual([]);
    const flush = c.rows.find((r) => r[0] === "latched cap flush with rim")!;
    expect(flush[1]).toBeCloseTo(78.5, 9);
  });

  test("R17: 20 checks, no cap well rows", () => {
    const c = K17.buildCheck();
    expect(c.rows).toHaveLength(20);
    expect(c.bad).toEqual([]);
  });
});
