// spec/fixtures/nest-motion.ts
// Compiles the nest and motion contracts (M07-T02) through the index, the
// way a package imports them, and holds the shapes later cards rely on:
// rings reuse ids.ts Ring, rotations are quarter turns, a NestItem names its
// stock, gap takes a number or "auto", MotionOp is closed over its five op
// tags, and a Planner returns a PlanResult with a named binding ceiling.
// Each @ts-expect-error line is needed; removing the rule it guards makes
// tsc fail with an unused directive. Numbers are illustrations and prove
// nothing. 2026-10-08.

import type {
  CalibrationReadout, Hash, MotionOp, MotionProgram, MotionRunResult, NestItem, NestRequest, NestResult, PathPoint,
  Placement, PlanResult, Planner, QuarterTurn, Ring,
} from "../index";

const square: Ring = [[0, 0], [10, 0], [10, 10], [0, 10]];
const hole: Ring = [[2, 2], [2, 8], [8, 8], [8, 2]];

export const item: NestItem = { id: "deck", rings: [square, hole], qty: 2, step: 0, stock: "ply3" };

export const request: NestRequest = {
  items: [item], sheet: [600, 400], margin: 6, gap: "auto", mode: "legacy-shelf",
  rotations: [0, 90], partInPart: false, seed: 1,
};

export const fixed: NestRequest = { ...request, gap: 4, mode: "assembly-order", rotations: [0, 90, 180, 270], partInPart: true };

const placed: Placement = { id: "deck", copy: 1, sheet: 0, at: [6, 6], rot: 90, inside: { id: "frame", copy: 0 } };

export const result: NestResult = {
  sheets: 1, placements: [placed], packer: "maxrects-bssf", order: "maxSide", gap: 4, fill: [12.5], oversize: [],
  layoutHash: "0".repeat(64) as Hash,
};

export const turns: readonly QuarterTurn[] = [0, 90, 180, 270];

// @ts-expect-error a rotation is a quarter turn
export const skew: QuarterTurn = 45;

// @ts-expect-error a NestItem names the stock it is cut from
export const noStock: NestItem = { id: "deck", rings: [square], qty: 1 };

// @ts-expect-error gap is mm or "auto"
export const badGap: NestRequest = { ...request, gap: "tight" };

// @ts-expect-error mode is fill, assembly-order or legacy-shelf
export const badMode: NestRequest = { ...request, mode: "greedy" };

// @ts-expect-error a rotation list holds quarter turns only
export const badRotations: NestRequest = { ...request, rotations: [0, 45] };

// @ts-expect-error the packer is maxrects-bssf, shelf or sparrow
export const badPacker: NestResult = { ...result, packer: "jagua" };

export const plates: NestRequest = { ...request, mode: "fill", packer: "maxrects-bssf", order: "area", groupBy: "type" };

// @ts-expect-error groupBy is stock or type
export const badGroup: NestRequest = { ...request, groupBy: "colour" };

const ops: readonly MotionOp[] = [
  { op: "set", target: "zR[0]", value: 0 },
  { op: "move", target: "zC[0]", to: 9, profile: "ease" },
  { op: "commit" },
  { op: "dwell", s: 0.5 },
  { op: "steps", axis: "rotor", halfSteps: 4076, rate: 1000 },
];

export const program: MotionProgram = { id: "ogee.setPixel", machine: "ogee16", args: { row: 0, col: 0 }, ops };

// @ts-expect-error MotionOp is closed over set, move, commit, dwell and steps
export const badOp: MotionOp = { op: "jog", target: "zR[0]" };

// @ts-expect-error a move names its velocity profile
export const noProfile: MotionOp = { op: "move", target: "zR[0]", to: 1 };

export const run: MotionRunResult = {
  program: "ogee.setPixel", states: [{ "zR[0]": 9 }],
  violations: [{ rule: "CHK-MOT-05", at: 2, measured: 0.965, legal: [0, 0.96] }], endHash: "0".repeat(64) as Hash,
};

export const planner: Planner = {
  id: "washer-mm",
  plan(path: readonly PathPoint[]): PlanResult {
    return { space: "mm", points: path.map((p) => ({ ...p, v: 0 })), durationS: 0, binding: "resolution" };
  },
};

// @ts-expect-error a planner id is detent-steps or washer-mm
export const badPlanner: Planner = { ...planner, id: "gcode" };

// @ts-expect-error binding names one ceiling
export const badBinding: PlanResult = { space: "mm", points: [], durationS: 0, binding: "speed" };

export const readout: CalibrationReadout = { kind: "projective", residualMm: 0, roundTripMm: 0.2876, quadAspect: 1 };
