// flexure-finger-spinner: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origFlexureFingerSpinner = refusedMechanism({
  id: "flexure-finger-spinner",
  family: "memory",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "COTTER originals (M06-T14, D-222); CANONS.md 11.3: flick wheel with a flexure finger and bump clicking into rim notches, press-fit fluted knob; CANONS.md 8.3 row: flick spinner with click detent",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/cotter/files/cotter-src/src/modules2.js lines 67 to 81 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference mechanisms/spinner-detent",
  original: [
    { slug: "cotter", file: "files/cotter-src/src/modules2.js", lines: "67 to 81", sha256: "b76e852532eda6784037c6848dac87cb930e0b9b8e18aef326ab684a074cef74", record: "cotter RECORD.md" },
  ],
});
