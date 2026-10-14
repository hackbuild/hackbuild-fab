// core/test/fixtures/sandbox/chase-code/build.ts: a plate; its chase.ts carries a statement the reader refuses.

import { defineBuild } from "@hackbuild/spec";

import { chase } from "./chase";

export const build = defineBuild(chase, async (p, k) => {

  return k.part({
    id: "plate", name: "PLATE", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: true, carriesOffset: false, pose: "print" },
    bodies: [k.body("plate", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.w, p.w, 2)], z: [0, 2] } })],
    features: [],
  });
});
