// The motion handle the CHK-MOT checks read (spec/motion.ts MotionHandle,
// CheckCtx.motion): the motion kernel reports what it measured on one
// machine and the checks hold the verdicts. A run without a handle reports
// not run.

import type { CheckCtx, Finding, MotionHandle, ResultTarget } from "@hackbuild/spec";
import { skip } from "../common.js";

export const NO_MOTION = "no motion handle supplied to the registry: the caller opens the motion kernel on this machine (latchHandle in @hackbuild/motion)";

export function motionOr(ctx: CheckCtx, target: ResultTarget): MotionHandle | Finding {
  return ctx.motion ?? skip(target, "not run", NO_MOTION);
}

export const isMotion = (v: MotionHandle | Finding): v is MotionHandle => typeof (v as MotionHandle).halfSelect === "function";
