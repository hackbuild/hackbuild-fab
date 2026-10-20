// packages/mesh/test/fixtures/loft-sweep-hull/build.ts: three disjoint
// bodies on the bed, one per new route. The loft is a square frustum 20 to
// 10 mm, the sweep a 32 segment circle r 2 up a vertical path, the hull two
// 64 segment cylinders r 3 at 10 mm centres (PLAN.md 3.3). Tops sit on
// ffc5p_20260819 layer tops, 0.25 plus 0.24 mm steps (computed): 10.09 is
// layer 42 and 5.05 layer 21. Every size is a test input, not a profile
// number.

import { defineBuild, type Ring } from "@hackbuild/spec";
import { chase } from "./chase";

/** Loft and sweep top, mm. */
export const TOP = 10.09;

const square = (half: number, cx: number, cy: number): Ring => [[cx - half, cy - half], [cx + half, cy - half], [cx + half, cy + half], [cx - half, cy + half]];

export const build = defineBuild(chase, (p, k) => k.part({
  id: "body", name: "LOFT SWEEP HULL", process: "fdm", machine: "ffc5p",
  frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
  bodies: [
    k.body("loft", { role: "body", slot: 1, material: "petg", base: { route: "loft", sections: [{ ring: square(10, 0, 0), z: 0 }, { ring: square(5, 0, 0), z: TOP }] } }),
    k.body("sweep", { role: "body", slot: 1, material: "petg", base: { route: "sweep", section: k.ring.circle(2, [0, 0], 32), path: [[30, 0, 0], [30, 0, TOP]] } }),
    k.body("hull", {
      role: "body", slot: 1, material: "petg",
      base: {
        route: "csg", op: "hull",
        of: [
          { route: "prism", outline: [k.ring.circle(3, [0, 30], 64)], z: [0, p.h] },
          { route: "prism", outline: [k.ring.circle(3, [10, 30], 64)], z: [0, p.h] },
        ],
      },
    }),
  ],
  features: [],
}));
