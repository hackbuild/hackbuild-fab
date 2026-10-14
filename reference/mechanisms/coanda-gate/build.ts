// reference/mechanisms/coanda-gate/build.ts
// One sheet part from the coanda-gate mechanism's apply() (D-177): every cut
// part of TUMBLER's COANDA GATE plan as a prism body, packed as the cut file
// packs them, with the module's features and the plan audit as build
// warnings. Nothing is computed here; the port is
// packages/mechanisms/src/tumbler.

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

export const build = defineBuild(chase, (p, k) => {
  const m = k.mech("coanda-gate", { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] }, p);
  return k.part({
    id: "coanda-gate", name: "COANDA GATE", process: "laser", machine: "sheet600",
    frame: { pose: "print" },
    bodies: m.bodies, features: m.features, metrics: m.metrics, assertions: m.assertions,
  });
});
