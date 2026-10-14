// reference/conductors/blocks-stud-applied/build.ts
// The plain prism and the one face a placement addresses: body.top, its
// origin at the top face centre, normal up, u along x. The face moves with
// H, so an applied entry on it stays on the top when the height changes
// (D-165). Nothing else is declared; part.build merges chase.applied.

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

export const build = defineBuild(chase, (p, k) => k.part({
  id: "body", name: "PRISM", process: "fdm", machine: "ffc5p",
  frame: { originOnAxis: true, carriesOffset: false, pose: "print" },
  bodies: [k.body("body", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.W, p.D, 0)], z: [0, p.H] } })],
  features: [],
  faces: [k.face("body.top", { origin: [0, 0, p.H], normal: [0, 0, 1], u: [1, 0, 0] })],
}));
