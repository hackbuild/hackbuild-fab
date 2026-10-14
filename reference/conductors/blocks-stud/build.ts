// reference/conductors/blocks-stud/build.ts
// One conductive BLOCKS column from the archetype (Author.arch) on a one
// stud brick: the archetype stands on the brick's top face and measures
// its stack from the brick's bottom face at the bed. Conditionals live
// here (D-178).

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

const ID = "blocks-stud";
/** BLOCKS pitch, mm: one stud cell less nothing (blocks.js line 19, brickBody parts.js line 52). */
const PITCH = 8;
/** brickBody corner radius, mm (parts.js line 52). */
const CORNER = 0.6;

export const build = defineBuild(chase, (p, k) => {
  const out = k.arch(ID, { origin: [0, 0, p.H], normal: [0, 0, 1], u: [1, 0, 0] }, { standard: "blocks-html", peg: "both", base: 0, net: "S" });
  const body = k.body("body", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(PITCH, PITCH, CORNER)], z: [0, p.H] } });
  return k.part({
    id: "body", name: "BLOCKS STUD", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [body, ...out.bodies],
    features: [...out.features],
    metrics: out.metrics ?? [],
    assertions: [],
  });
});
