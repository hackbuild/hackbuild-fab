// OGEE16 programs (M07-T11 step 2), ported from the viewer's command
// layer: drive(i, j) and doClear() (fab-knowledge:originals/ogee16/files/src/source/
// viewer_template.html lines 587 to 591, through sweep() at lines 573 to
// 586; the printed viewer's drive_ and pull, printed_viewer_template.html
// lines 349 to 367, are the same commands at 760 ms) and the checker,
// diagonal and all sequences (lines 592 to 598). A drive is a 700 ms there and back sweep and a clear a 900 ms one,
// each the viewer's default; the commit sits at full stroke and is decided
// by the kinematics, never by which frames render.

import type { MotionOp, MotionProgram } from "@hackbuild/spec";
import type { OgeeKinematics } from "../kinematics/ogee.js";
import { barCycle } from "./latch.js";

/** drive() default, viewer_template.html line 587, s. */
const DRIVE_S = 0.7;
/** doClear() default, viewer_template.html line 591, s. */
const CLEAR_S = 0.9;

/** drive(i, j): row i and column j to STROKE, commit, back; -1 leaves that bar at rest. */
export function ogeeDrive(K: OgeeKinematics, i: number, j: number): MotionOp[] {
  const bars = [...(i >= 0 ? [`zR[${i}]`] : []), ...(j >= 0 ? [`zC[${j}]`] : [])];
  return barCycle(bars, K.P.STROKE, DRIVE_S / 2, DRIVE_S / 2, "ease");
}

/** doClear(): the plate to lp (LP_SLIDE by default), commit, back. */
export function ogeeClear(K: OgeeKinematics, lp: number = K.P.LP_SLIDE): MotionOp[] {
  return barCycle(["lp"], lp, CLEAR_S / 2, CLEAR_S / 2, "ease");
}

/** The viewer's sequences (lines 592 to 598), cells as [i, j] in drive order. */
export function ogeeSequence(K: OgeeKinematics, name: "checker" | "diagonal" | "all"): [number, number][] {
  const n = K.N;
  const cells = [...Array(n * n).keys()].map((k): [number, number] => [Math.floor(k / n), k % n]);
  if (name === "checker") return cells.filter(([i, j]) => (i + j) % 2 === 0);
  if (name === "diagonal") return [...Array(n).keys()].map((k): [number, number] => [k, k]);
  return cells;
}

/** Program ids this file builds, with the args each reads. */
export const OGEE_PROGRAMS = {
  "ogee.setPixel": ["i", "j"],
  "ogee.row": ["i"],
  "ogee.col": ["j"],
  "ogee.clear": ["lp"],
  "ogee.checker": [],
  "ogee.diagonal": [],
  "ogee.all": [],
} as const;
export type OgeeProgramId = keyof typeof OGEE_PROGRAMS;

/** Build an OGEE program as Motion IR. lp of ogee.clear is mm and optional. */
export function ogeeProgram(K: OgeeKinematics, id: OgeeProgramId, args: Readonly<Record<string, number>> = {}): MotionProgram {
  const a = (k: string): number => args[k] ?? 0;
  let ops: MotionOp[];
  if (id === "ogee.setPixel") ops = ogeeDrive(K, a("i"), a("j"));
  else if (id === "ogee.row") ops = ogeeDrive(K, a("i"), -1);
  else if (id === "ogee.col") ops = ogeeDrive(K, -1, a("j"));
  else if (id === "ogee.clear") ops = ogeeClear(K, args.lp);
  else ops = ogeeSequence(K, id === "ogee.checker" ? "checker" : id === "ogee.diagonal" ? "diagonal" : "all").flatMap(([i, j]) => ogeeDrive(K, i, j));
  return { id, machine: "ogee16", args, ops };
}

/**
 * Crank angles for drive `servos` (pushServos, viewer_template.html lines
 * 559 to 563), deg: each bar crank at rest and at full stroke, 180 plus and
 * minus CRANK_SW, and the latch crank with the plate at rest and pulled,
 * minus and plus LCRANK_SW, so the latch crank turns 2 LCRANK_SW over a pull.
 */
export function ogeeCranks(K: OgeeKinematics): { restDeg: number; fullDeg: number; latchRestDeg: number; latchPulledDeg: number } {
  return { restDeg: K.crankPhi(0), fullDeg: K.crankPhi(K.P.STROKE), latchRestDeg: K.lCrankPhi(0), latchPulledDeg: K.lCrankPhi(K.P.LP_SLIDE) };
}
