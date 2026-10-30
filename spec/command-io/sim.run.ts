// command sim.run, group prove.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { Mm } from "../ids.js";
import type { TrialResult } from "../sim.js";

export interface SimRunIO {
  input: {
    build: string;
    program?: string;
    /** Trials, count; the sim model default when absent. */
    trials?: number;
    /** First trial seed, integer. */
    seed?: number;
  };
  output: {
    trials: TrialResult;
    closest: readonly {
      a: string;
      b: string;
      /** Closest approach, mm. */
      mm: Mm;
    }[];
  };
}
