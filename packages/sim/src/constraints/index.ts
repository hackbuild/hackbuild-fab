// The ConstraintDefs sim exports; core collects `constraintDefs` at load
// and registers them into the solver (D-044, M01 package placement).

import type { ConstraintDef } from "@hackbuild/spec";
import { clickSpringWindow } from "./click-spring-window.js";

export {
  CLICK_SPRING_WINDOW_ID, Q_GRID, Q_STEP, SPRING_Q, SPRING_Q_UNIT, clickSpringWindow, createClickSpringWindow, feRun, qAt, windowIndexes,
} from "./click-spring-window.js";
export type { ClickRun, SweepPoint, WindowIndexes, WindowLimits } from "./click-spring-window.js";

export const constraintDefs: readonly ConstraintDef[] = [clickSpringWindow];
