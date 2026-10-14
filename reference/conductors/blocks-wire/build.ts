// reference/conductors/blocks-wire/build.ts
// One printed wire from the archetype (Author.arch), lying on the bed: the
// sheath, the two peg caps and the core are the archetype's bodies; the
// part declares nothing else. Conditionals live here (D-178).

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

const ID = "blocks-wire";

export const build = defineBuild(chase, (p, k) => {
  const out = k.arch(ID, { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] }, { len: p.len });
  return k.part({
    id: "wire", name: "BLOCKS WIRE", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [...out.bodies],
    features: [...out.features],
    metrics: out.metrics ?? [],
    assertions: [],
  });
});
