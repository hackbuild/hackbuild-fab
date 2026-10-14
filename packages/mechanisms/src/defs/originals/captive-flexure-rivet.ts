// captive-flexure-rivet: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origCaptiveFlexureRivet = refusedMechanism({
  id: "captive-flexure-rivet",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "PHASELOCK originals (M06-T14, D-222); CANONS.md 11.3: TPU hub and tongues in PETG slots held by a dumbbell rivet with radial clearance",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/phaselock/files/extracted/phaselock_v1.scad lines 71 to 86, 138 to 155 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference joints/captive-flexure",
  original: [
    { slug: "phaselock", file: "files/extracted/phaselock_v1.scad", lines: "71 to 86, 138 to 155", sha256: "57f204556c5728ca601c915a84d8f06189b40570d7a341c65cd0df740366a1dd", record: "phaselock RECORD.md" },
  ],
});
