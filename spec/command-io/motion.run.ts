// command motion.run, group prove.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { CommandResult } from "../commands";
import type { MotionRunResult, PlanResult } from "../motion";

export interface MotionRunIO {
  /** Reconciled with spec/motion.ts by M07-T14. */
  input: {
    /** Program id, for example "ogee.checker" or "slug.vend". */
    program: string;
    /** Program arguments by name, each in the unit the program names (k vends, i row index). */
    args?: Readonly<Record<string, number>>;
    /** Declared latched set: all, none, a pattern the program names, or cells "i,j" joined by spaces (D-074). */
    expect?: string;
    /** Also run the motion checks of the program's machine (CHK-MOT-04 to 06). */
    audit?: boolean;
  };
  /** PlanResult for a planner program; findings travel in CommandResult.findings. */
  output: MotionRunResult | PlanResult;
}
