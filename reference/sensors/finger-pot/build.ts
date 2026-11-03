// reference/sensors/finger-pot/build.ts
// The GIB slider from the archetype (Author.arch) on the bed, each GIB
// part one body on its slot, objects placed as the GIB export places them.

import { defineDesignBuild } from "@hackbuild/spec";
import { designModule } from "./design";

const ID = "finger-pot";

export const build = defineDesignBuild(designModule, (p, k) => {
  const out = k.arch(ID, { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] }, { L: p.L });
  return k.part({
    id: "slider", name: "FINGER POT", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [...out.bodies],
    features: [...out.features],
    metrics: out.metrics ?? [],
    assertions: [],
  });
});
