// M07-T11 step 6, the CHK-MOT-06 kernel: a program's outcome is decided at
// the command, so `checker` gives one end hash under every frame, two
// frames per 700 ms sweep, and no frames, on OGEE16 and on STIPPLE R17b.
// The two-frame schedule is the OGEE viewer's record of software GL (two
// frames fired in 700 ms and nothing latched; viewer_template.html lines
// 565 to 572); a runner that let frames decide would latch nothing under
// it, so the test also requires the declared set.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  FRAME_SCHEDULES, latchedCells, latchMachine, ogeeKinematics, ogeeProgram, readScadParams, readStippleParams, runProgram,
  stippleKinematics, stipplePattern, stippleProgram, type MachineModel,
} from "@hackbuild/motion";

const root = new URL("../../../", import.meta.url);
const read = (p: string): string => readFileSync(new URL(p, root), "utf8");
const OG = ogeeKinematics(readScadParams(read("designs/ogee16/legacy/source/params.scad")));
const ST = stippleKinematics(readStippleParams(read("packages/motion/inputs/stipple/stipple-r17b-DATA.txt")), "stipple-r17b");
const rec = JSON.parse(read("packages/motion/records/ogee16-kin.json")) as { result: { programs: { checker: { matrix: number[][] } } } };
const cellsOf = (g: number[][]): string[] => g.flatMap((r, i) => r.flatMap((v, j) => (v ? [`${i},${j}`] : [])));

const fixtures: [string, MachineModel<unknown>, ReturnType<typeof ogeeProgram>, string[]][] = [
  ["OGEE16 checker", latchMachine(OG.latch) as MachineModel<unknown>, ogeeProgram(OG, "ogee.checker"), cellsOf(rec.result.programs.checker.matrix)],
  ["STIPPLE R17b checker", latchMachine(ST.latch) as MachineModel<unknown>, stippleProgram(ST, "stipple.checker"), cellsOf(stipplePattern(ST, "checker"))],
];

describe.each(fixtures)("%s", (_name, M, program, declared) => {
  const runs = FRAME_SCHEDULES.map((s) => ({ s, run: runProgram(M, program, s) }));

  test("one endHash across the three schedules, and the declared latched set", () => {
    expect(runs.map((r) => r.s.id)).toEqual(["every frame", "two frames in 700 ms", "no frames"]);
    expect(new Set(runs.map((r) => r.run.result.endHash)).size).toBe(1);
    for (const r of runs) expect(latchedCells(r.run.result.states.at(-1)!), r.s.id).toEqual(declared);
  });

  test("the schedules differ in what they draw: every frame draws a bar at full stroke, no frames draws nothing", () => {
    const peak = (r: (typeof runs)[number]): boolean => r.run.frames.some((f) => Object.entries(f.view).some(([k, v]) => /^z[RC]\[/.test(k) && Math.abs(v - (M === fixtures[0]![1] ? OG.P.STROKE : ST.P.STROKE)) < 1e-9));
    const [every, two, none] = runs;
    expect(every!.run.frames.length).toBeGreaterThan(60);
    expect(peak(every!)).toBe(true);
    expect(two!.run.frames.length).toBeGreaterThan(1);
    expect(none!.run.frames).toEqual([]);
    // A frame draws the committed latches and never adds one: the first frame shows none latched.
    expect(latchedCells(every!.run.frames[0]!.view)).toEqual([]);
  });

  test("a frame never writes a state: the committed states are the same objects' values with and without frames", () => {
    expect(runs[0]!.run.result.states).toEqual(runs[2]!.run.result.states);
  });
});
