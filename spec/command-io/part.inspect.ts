// command part.inspect, group build.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { FeatureView } from "../commands.js";
import type { Body, FrameDecl } from "../part-ir.js";

export interface PartInspectIO {
  input: { part: string };
  output: { features: readonly FeatureView[]; frame: FrameDecl; bodies: readonly Body[] };
}
