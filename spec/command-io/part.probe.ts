// command part.probe, group build.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { ProbeResult } from "../commands";
import type { Vec3 } from "../ids";

export interface PartProbeIO {
  input: {
    part: string;
    /** World point to probe, mm. */
    at?: Vec3;
    /** Section plane height in the print pose, mm. */
    section?: number;
    /** Ray origin in mm and direction, unitless. */
    ray?: { origin: Vec3; dir: Vec3 };
  };
  output: ProbeResult;
}
