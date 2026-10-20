// CHK-PRT-19, every piece of an imported part rests on the bed or on
// another piece (hbf image eval 2026-10-20: an img2threejs cap floated 2 mm
// above its stem, union NoError, genus -1, two shells, and part.build
// --import passed it, fab-knowledge:plan-v5/image-eval.md).
// Method: the PIP net pass, as packages/circuit/src/extract/nets.ts lines
// 3 to 5 cite it: union, decompose, take the pieces. Pieces that touch
// another piece merge in the union, so a piece left apart rests on nothing
// unless it reaches the bed.
// The bed plane is the part's lowest point; a piece's lift is its lowest
// point less the bed plane, and a lift past one step of the D-054 mesh grid
// (1/1024 mm) floats. Declared pieces never excuse a floating one.
// The rule runs where the import is read (part.build --import): Part IR
// carries no pieces, so the registered run skips on every part and core
// calls prt19Finding with the pieces it measured (import-path.ts).

import { MESH_GRID_PER_MM, type Finding, type ResultTarget, type Vec3 } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { partTarget, skip } from "../common.js";
import { IMPORT_PATH_CONSTRAINT } from "./import-path.js";

/** Largest lift that still rests on the bed, mm: one D-054 grid step. */
export const LIFT_TOL_MM = 1 / MESH_GRID_PER_MM;

export const PRT19_CONSTRAINT = "a piece that rests on neither the bed nor another piece prints in mid air";

/** One piece of an imported part: its axis-aligned bounds, min then max, mm. */
export interface Piece {
  readonly bounds: readonly [Vec3, Vec3];
}

const round = (v: number, d = 6): number => Number(v.toFixed(d));
const xyz = (v: Vec3): string => v.map((c) => round(c)).join(",");

/** The CHK-PRT-19 finding: the largest piece lift above the bed plane, mm. */
export function prt19Finding(target: ResultTarget, pieces: readonly Piece[]): Finding {
  const bed = Math.min(...pieces.map((p) => p.bounds[0][2]));
  const lifts = pieces.map((p) => p.bounds[0][2] - bed);
  const lift = Math.max(0, ...lifts);
  const floating = pieces.filter((_, i) => lifts[i]! > LIFT_TOL_MM);
  const measured = round(lift);
  const first = floating[0];
  return {
    verdict: floating.length === 0 ? "pass" : "fail", target, measured,
    legal: { kind: "interval", lo: 0, hi: LIFT_TOL_MM, unit: "mm", nearest: Math.min(measured, LIFT_TOL_MM) },
    constraint: floating.length === 0
      ? PRT19_CONSTRAINT
      : `${PRT19_CONSTRAINT}; ${floating.length} of ${pieces.length} pieces float, the highest ${measured} mm (computed) above the bed`,
    extra: {
      pieces: pieces.length, floating: floating.length,
      ...(first === undefined ? {} : { firstFloating: `${xyz(first.bounds[0])} to ${xyz(first.bounds[1])} mm` }),
    },
  };
}

export const check = defineCheck({
  id: "CHK-PRT-19",
  level: "part",
  run: (t) => [skip(partTarget(t.part), "not run", IMPORT_PATH_CONSTRAINT)],
});
