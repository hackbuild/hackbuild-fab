// reference/sensors/membrane-slider-thinpot/build.ts
// THINPOT from the archetype (Author.arch) on the bed: base, track,
// membrane and collector strip, the membrane and strip in the original's
// print pose beside the base.

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

const ID = "membrane-slider-thinpot";

export const build = defineBuild(chase, (p, k) => {
  const out = k.arch(ID, { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] }, { len: p.len });
  return k.part({
    id: "thinpot", name: "THINPOT", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [...out.bodies],
    features: [...out.features],
    metrics: out.metrics ?? [],
    assertions: [],
  });
});
