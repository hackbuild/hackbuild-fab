// core/test/fixtures/sandbox/escape-import/build.ts: imports a module outside the design directory.

import { defineBuild } from "@hackbuild/spec";
import { outside } from "../outside";
import { chase } from "./chase";

export const build = defineBuild(chase, async (p, k) => {
  if (outside !== 1) throw new Error("unreachable");
  return k.part({
    id: "plate", name: "PLATE", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: true, carriesOffset: false, pose: "print" },
    bodies: [k.body("plate", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.w, p.w, 2)], z: [0, 2] } })],
    features: [],
  });
});
