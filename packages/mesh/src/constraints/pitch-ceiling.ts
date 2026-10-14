// mesh/pitch-ceiling (M01-T06): a conductor between keys on a pitch keeps
// a clearance to each neighbour, so its width is at most pitchMm minus
// pitchClrMm on each side. Both are declared facts; the def reads no
// profile row, so the bound is computed with no basis.

import { qualify, type Bound, type ConstraintDef } from "@hackbuild/spec";

const DIM = "conductor.width" as const;

export const pitchCeiling: ConstraintDef = {
  id: "mesh/pitch-ceiling",
  version: "1.0.0",
  dims: [DIM],
  kernels: ["mesh"],
  units: { [DIM]: "mm" },
  bounds(dim, ctx): readonly Bound[] {
    if (dim !== DIM) return [];
    const pitch = ctx.facts["pitchMm"] as number;
    const clr = ctx.facts["pitchClrMm"] as number;
    // A clearance on each side of the conductor.
    const value = pitch - 2 * clr;
    return [{
      value,
      side: "hi",
      kernel: "mesh",
      reason: `key pitch ${Number(pitch).toFixed(1)} minus ${Number(clr).toFixed(1)} clearance each side`,
      ...qualify([]),
    }];
  },
};
