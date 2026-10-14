// printed-frame-shrink-joint: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origPrintedFrameShrinkJoint = refusedMechanism({
  id: "printed-frame-shrink-joint",
  family: "fit",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "OGEE16 originals (M06-T14, D-222); CANONS.md 11.3: frame as separate printed plates with shrink taken into tab clearance",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/ogee16/files/src/source/printed.scad fr(), PRINT_SHRINK lines 150 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M07, else M11-T09 with reference machines/ogee-cell",
  original: [
    { slug: "ogee16", file: "files/src/source/printed.scad", fn: "fr(), PRINT_SHRINK", lines: "150", sha256: "b0631eb717ffc0381dc605ca79cab3f5036ca03a4ba935093c982f784e43d42f", record: "ogee16 RECORD.md" },
  ],
});
