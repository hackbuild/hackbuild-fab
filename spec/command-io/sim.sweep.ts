// command sim.sweep, group prove.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { Pose } from "../part-ir";
import type { SweepResult } from "../sim";

export interface SimSweepIO {
  input: {
    build: string;
    joint: string;
    /** Sweep steps, count. */
    steps?: number;
  };
  /** Pose and prismatic modes measure no volume; their clashes carry mm3 null. */
  output: SweepResult<number | null>;
}
