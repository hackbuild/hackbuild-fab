// The M01-T10 fixture def that stays here, exported as constraintDefs for
// core to register at load (M01 package placement). cascade-slop and
// hook-rule moved to packages/mechanisms/src/constraints at M06-T02 and
// M06-T03; the OGEE16 window moves to the OGEE design at M10.

import type { ConstraintDef } from "@hackbuild/spec";
import { ogee16LatchServoWindow } from "./ogee16-latch-servo-window.js";

export * from "./ogee16-latch-servo-window.js";
export { verdictOf } from "./common.js";

export const constraintDefs: readonly ConstraintDef[] = [ogee16LatchServoWindow];
