// reference/sensors/membrane-slider/build.ts
// The neck from the archetype (Author.arch) on the bed face: the archetype
// emits every body of the neck (PLA beam, TPU membrane, cTPU track and
// feet) and its cPLA deck as conductor regions. The three lands carry the
// peg sockets the face pegs plug into; each is a peg pad on its net.
// Conditionals live here (D-178).

import { defineBuild, type Feature } from "@hackbuild/spec";
import { chase } from "./chase";

const ID = "membrane-slider-wall";

export const build = defineBuild(chase, (p, k) => {
  const out = k.arch(ID, { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] }, { L: p.L });
  const beam = `${ID}.0.beam`;
  const pads: Feature[] = (["3V3", "W", "GND"] as const).map((net): Feature => (
    { kind: "pad", id: `pad.${net}`, body: beam, net, size: [3.2, 3.2], for: "peg", note: `peg socket in the ${net} land, 3.2 mm square, 4.6 deep (05_design.js lines 79 to 84)` }
  ));
  return k.part({
    id: "neck", name: "MEMBRANE SLIDER", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [...out.bodies],
    features: [...out.features, ...pads],
    metrics: out.metrics ?? [],
    assertions: [{ type: "apart", nets: ["W", "3V3", "GND"] }],
  });
});
