// reference/joints/balance-beam/build.ts
// One sheet part from the pin-free-balance-beam mechanism's apply()
// (D-177): STIPPLE's link as a prism body, the way the page's geomOf
// builds it. Nothing is computed here; the port is
// packages/mechanisms/src/bodies/balance-beam-link.ts.

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

export const build = defineBuild(chase, (p, k) => {
  const m = k.mech("pin-free-balance-beam", { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] }, p);
  return k.part({
    id: "balance-beam", name: "PIN FREE BALANCE BEAM", process: "laser", machine: "sheet600",
    frame: { pose: "print" },
    bodies: m.bodies, features: m.features, metrics: m.metrics, assertions: m.assertions,
  });
});
