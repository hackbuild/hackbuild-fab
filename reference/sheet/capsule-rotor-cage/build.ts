// reference/sheet/capsule-rotor-cage/build.ts
// One sheet part from the capsule-pocket-rotor mechanism's apply() (D-177):
// every cut part of the drum cage as a prism body in one row. Nothing is
// computed here; the port is packages/mechanisms/src/bodies/slug-cage.ts.

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

export const build = defineBuild(chase, (p, k) => {
  const m = k.mech("capsule-pocket-rotor", { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] }, p);
  return k.part({
    id: "capsule-rotor-cage", name: "CAPSULE ROTOR CAGE", process: "laser", machine: "sheet600",
    frame: { pose: "print" },
    bodies: m.bodies, features: m.features, metrics: m.metrics, assertions: m.assertions,
  });
});
