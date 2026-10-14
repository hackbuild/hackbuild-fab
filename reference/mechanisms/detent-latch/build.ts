// reference/mechanisms/detent-latch/build.ts
// One sheet part from the detent-latch mechanism's apply() (D-177): every cut
// part of TUMBLER's DETENT LATCH plan as a prism body, packed as the cut file
// packs them, with the module's features and the plan audit as build
// warnings. Nothing is computed here; the port is
// packages/mechanisms/src/tumbler.

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

export const build = defineBuild(chase, (p, k) => {
  const m = k.mech("detent-latch", { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] }, p);
  return k.part({
    id: "detent-latch", name: "DETENT LATCH", process: "laser", machine: "sheet600",
    frame: { pose: "print" },
    bodies: m.bodies, features: m.features, metrics: m.metrics, assertions: m.assertions,
  });
});
