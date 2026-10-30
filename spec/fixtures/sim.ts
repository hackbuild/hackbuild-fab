// spec/fixtures/sim.ts
// Compile-time proofs for the sim.sweep command output (spec/sim.ts
// SweepResult). The command's pose and prismatic modes measure distance or
// raster cells, never a volume, so their clashes carry mm3 null; the shape
// below is a pose-mode clash as packages/sim/src/scenes.ts SweepClash
// reports it. Numbers are illustrations and prove nothing.
// 2026-10-08.

import type { CommandIO } from "../commands.js";
import type { Hash } from "../ids.js";

export const poseSweep: CommandIO["sim.sweep"]["output"] = {
  sweptHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000" as Hash,
  poses: 3,
  clashes: [{ with: "palm", mm3: null, masked: false }],
};
