// core/test/fixtures/sandbox/nan/build.ts: returns a plate whose top is NaN.

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

export const build = defineBuild(chase, (p, k) => k.part({
  id: "plate", name: "PLATE", process: "fdm", machine: "ffc5p",
  frame: { originOnAxis: true, carriesOffset: false, pose: "print" },
  bodies: [k.body("plate", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.w, p.w, 2)], z: [0, Number.NaN] } })],
  features: [],
}));
