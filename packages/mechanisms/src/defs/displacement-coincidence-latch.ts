// displacement-coincidence-latch: seed row of seed/mechanisms.seed.yaml.
// Registered at M06-T01; derive() ported at M06-T03 to M06-T05 in src/derive
// and held candidate by the originals rule (statusReason). Fields mirror the
// seed and the original is the
// CANONS.md 11.1 row (D-222).

import { refusedMechanism } from "../def.js";
import { COINCIDENCE_LATCH_PARAMS } from "../derive/coincidence-latch.js";

export const displacementCoincidenceLatch = refusedMechanism({
  id: "displacement-coincidence-latch",
  family: "intermittent",
  dof: 2,
  governs: [
    "margin + overshoot = stroke/2 - camlift - lug_tot",
    "ramp_a >= 40 deg against acrylic friction 0.45",
    "half select never commits",
    "crown struck from the rocker's own origin is exact at any tilt",
    "link horizontal at rest, or L^2 = S^2 + dz^2 jams it",
  ],
  failureModes: [
    "force coincidence (dead)",
    "bistable TPU (creep)",
    "square pegs (cam not bearing)",
  ],
  processes: [
    "laser",
    "fdm",
  ],
  provenance: "OGEE R7 to R17 2026-08",
  status: "candidate",
  statusReason: "kin.py's readout regenerates (test/derive.test.ts), and the rod with its lug and foot notch (p_rod) and the latch plate (p_latch) regenerate the original's exported dxf/rod.dxf and dxf/latch.dxf at the export's printed resolution, worst gap 2.4e-5 mm, and print/rod.stl's volume within 7.1e-4 mm3 (test/coincidence-latch.body.test.ts, src/bodies/ogee-latch.ts); held because CHK-MOT-05 reads a motion handle that only motion.run supplies, so part.build and check.run report it not run on a mechanism reference; promotes with machines/ogee-cell at M07, else M11-T09, with reference mechanisms/coincidence-latch",
  params: COINCIDENCE_LATCH_PARAMS,
  original: [
    { slug: "ogee16", file: "files/src/source/ogee16.scad", fn: "p_rod()", lines: "68 to 80", sha256: "4afd9001c421371385eef257060914a6f578b30c21e62fb51064e90dc4f3b078", record: "ogee16 4.1" },
    { slug: "ogee16", file: "files/src/source/ogee16.scad", fn: "p_latch()", lines: "221 to 233", sha256: "4afd9001c421371385eef257060914a6f578b30c21e62fb51064e90dc4f3b078", record: "ogee16 4.4a" },
    { slug: "ogee16", file: "files/src/source/params.scad", lines: "18 to 96", sha256: "1c0a4b898b4977d87d435273a04857111fab5d43324bee591c2a6ad641591d6d", record: "ogee16 4.1" },
  ],
});
