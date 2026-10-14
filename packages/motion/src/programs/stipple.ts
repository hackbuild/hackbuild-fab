// STIPPLE R17b programs (M07-T11 step 6a): the page's write schedule as
// Motion IR (designs/stipple/legacy/stipple-r17b.html lines 362 to 394).
// A frame is one clear pull, then one cycle per row raising that row comb
// with every column comb the row wants; the latch commits at the top of the
// stroke. Ten cycles a frame on a 10 x 10, which is why the machine has 20
// drive servos (lines 357 to 360). Step times are the page's (220, 120 and
// 220 ms for the clear, 260 and 200 ms for a row cycle) with linear
// profiles, as its step functions write S.lp = LP_SLIDE*u.
//
// Two things the runner does where the page took a shortcut, each with the
// same outcome on R17 and R17b: the page's writeRow tests canLatch on the
// wanted columns only (line 378), and the commit here tests every cell, so
// a half selected cell that latched would show (CHK-MOT-04); the page's
// clear drops every pin at the start of its middle step (lines 366 to
// 367), and the commit here drops them because the plate is out past
// CAM + 0.05, the release rodState() reads (line 154).

import type { MotionOp, MotionProgram } from "@hackbuild/spec";
import type { StippleKinematics } from "../kinematics/stipple.js";
import { barCycle } from "./latch.js";

/** doClear() steps, line 365 to 368, s. */
const CLEAR_PULL_S = 0.22, CLEAR_HOLD_S = 0.12, CLEAR_RETURN_S = 0.22;
/** writeRow() steps, lines 375 and 381, s. */
const ROW_UP_S = 0.26, ROW_DOWN_S = 0.2;

/** doClear(): pull, hold while every pin drops, return. */
export function stippleClear(K: StippleKinematics): MotionOp[] {
  return [
    { op: "move", target: "lp", to: K.P.LP_SLIDE, profile: "verbatim", s: CLEAR_PULL_S },
    { op: "commit" },
    { op: "dwell", s: CLEAR_HOLD_S },
    { op: "move", target: "lp", to: 0, profile: "verbatim", s: CLEAR_RETURN_S },
  ];
}

/** writeRow(i, cols); i or cols may be absent for a bar raised alone. */
export function stippleRow(K: StippleKinematics, i: number | null, cols: readonly number[]): MotionOp[] {
  const bars = [...(i === null ? [] : [`zR[${i}]`]), ...cols.map((j) => `zC[${j}]`)];
  return barCycle(bars, K.P.STROKE, ROW_UP_S, ROW_DOWN_S, "verbatim");
}

/** writeFrame(target), lines 386 to 394: the clear, then one cycle per row that wants any pixel. */
export function stippleWrite(K: StippleKinematics, target: readonly (readonly number[])[]): MotionOp[] {
  const ops = stippleClear(K);
  for (let i = 0; i < K.N; i += 1) {
    const cols: number[] = [];
    for (let j = 0; j < K.N; j += 1) if (target[i]?.[j]) cols.push(j);
    if (cols.length > 0) ops.push(...stippleRow(K, i, cols));
  }
  return ops;
}

/**
 * The page's patterns as targets: checker is the first frame of DEMOS.checker
 * (lines 537 to 545, k = 1), rowWrite DEMOS.write (lines 458 to 463), all every
 * pixel.
 */
export function stipplePattern(K: StippleKinematics, name: "checker" | "rowWrite" | "all"): number[][] {
  const n = K.N;
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    if (name === "checker") return (i + j + 1) % 2 === 0 ? 1 : 0;
    if (name === "rowWrite") return (i * j + i + j) % 3 === 0 ? 1 : 0;
    return 1;
  }));
}

export const STIPPLE_PROGRAMS = {
  "stipple.checker": [],
  "stipple.rowWrite": [],
  "stipple.all": [],
  "stipple.row": ["i"],
  "stipple.col": ["j"],
  "stipple.clear": [],
} as const;
export type StippleProgramId = keyof typeof STIPPLE_PROGRAMS;

export function stippleProgram(K: StippleKinematics, id: StippleProgramId, args: Readonly<Record<string, number>> = {}): MotionProgram {
  let ops: MotionOp[];
  if (id === "stipple.row") ops = stippleRow(K, args.i ?? 0, []);
  else if (id === "stipple.col") ops = stippleRow(K, null, [args.j ?? 0]);
  else if (id === "stipple.clear") ops = stippleClear(K);
  else ops = stippleWrite(K, stipplePattern(K, id === "stipple.checker" ? "checker" : id === "stipple.rowWrite" ? "rowWrite" : "all"));
  return { id, machine: K.latch.machine, args, ops };
}
