// core/test/fixtures/arch-apply/host/build.ts: the prism and body.floor, the buried stack floor the PIP keys sit on.

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

export const build = defineBuild(chase, (p, k) => {
  const c = (id: string): number => k.profile.constant(id).value;
  const floor = c("stack.skin") + c("stack.trace") + c("stack.iso") + c("stack.trace") + c("stack.overL2");
  return k.part({
    id: "body", name: "HOST", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [k.body("body", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.W, p.W, 3)], z: [0, p.H] } })],
    features: [],
    faces: [k.face("body.floor", { origin: [0, 0, floor], normal: [0, 0, 1], u: [1, 0, 0] })],
  });
});
