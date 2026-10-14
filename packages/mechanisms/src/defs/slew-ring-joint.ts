// slew-ring-joint: seed row of seed/mechanisms.seed.yaml.
// Registered at M06-T01; derive() ported at M06-T03 to M06-T05 in src/derive
// and held candidate by the originals rule (statusReason). Fields mirror the
// seed and the original is the
// CANONS.md 11.1 row (D-222).

import { refusedMechanism } from "../def.js";
import { SLEW_RING_PARAMS } from "../derive/slew-ring.js";

export const slewRingJoint = refusedMechanism({
  id: "slew-ring-joint",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: ["fdm"],
  provenance: "PINTLE 2026-08",
  status: "candidate",
  statusReason: "the R6 P dict regenerates, and the thrust contact the original's meshes bear on, 12.9 to 16.4 mm under the rotor's lead-in chamfer, regenerates as 322.2 mm2 (test/slew-ring.body.test.ts), but the bodies are not ported: the rotor's dovetail rail (pintle_parts.py lines 437 to 443, a convex hull extruded along x) has no kernel route, since prism, stack and csg operands extrude along z and revolve is a body of revolution; the stator's cuts read shapely buffers (stadium_poly lines 226 to 227, spine_poly.buffer lines 372 to 382) whose GEOS vertices geom's Clipper2 offset does not reproduce; and the D-054 grid alone moves the original's own stator and rotor volumes by 0.157 and 0.172 mm3 (computed, test/legacy/slew-ring.json), past the originals rule's 1e-3 mm3, so no snapped port can meet it; no source computes the section moduli; promotes at M11-T09 with reference joints/slew-ring once a route expresses the rail and the volume tolerance is set for snapped ports",
  params: SLEW_RING_PARAMS,
  original: [
    { slug: "pintle", file: "files/src/pintle_parts.py", lines: "328 to 358, 402 to 408", sha256: "5280a22350a488e721d411504a562dec2007f421129e5f7462e055cb2b45a6b1", record: "pintle 5.1" },
  ],
});
