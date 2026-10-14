// reference/electrical/blocks-pullup-band/build.ts
// The two wire cores of the default table scene, IO2 to A and GND to B,
// side by side on the stud pitch: straight prisms coreW by coreT, lenMm
// long. Shapes, sheath and stud caps are BOSS WIRE's (canon blocks-wire,
// M06) and are not built here. circuit.solve reads the scene's element
// lists (chase.ts scene.legacy), never these bodies.

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

export const build = defineBuild(chase, (p, k) => {
  const core = k.ring.roundRect(p.lenMm, p.coreW, 0);
  const a = k.body("wire.io2", { role: "conductor", slot: 1, base: { route: "prism", outline: [core], z: [0, p.coreT] } });
  const b = k.body("wire.gnd", { role: "conductor", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.lenMm, p.coreW, 0, [0, p.pitchMm])], z: [0, p.coreT] } });
  return k.part({
    id: "wires", name: "BLOCKS PULLUP BAND", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [a, b],
    features: [], metrics: [], assertions: [],
  });
});
