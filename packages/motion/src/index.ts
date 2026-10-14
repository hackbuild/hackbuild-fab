// @hackbuild/motion: Motion IR, programs, planners and the one kinematics
// module (D-139). Tier 1; M07.

export * from "./kinematics/index.js";
export * from "./latch.js";
export * from "./runner.js";
export * from "./handle.js";
export * from "./programs/latch.js";
export * from "./programs/ogee.js";
export * from "./programs/stipple.js";
export * from "./programs/slug.js";

// The Motion IR contract types live in spec/motion.ts (M07-T02).
export type {
  CalibrationReadout, LatchIdentityReadout, MotionHandle, MotionOp, MotionProgram, MotionRule, MotionRunResult, MotionViolation,
  PathPoint, PlanResult, PlannedPoint, Planner, StateVar,
} from "@hackbuild/spec";
export * from "./planners/index.js";
export * from "./calibrate.js";
export * from "./serialise.js";
export * from "./programs/paths.js";
