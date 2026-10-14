// horn-capture-joint: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origHornCaptureJoint = refusedMechanism({
  id: "horn-capture-joint",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "DAVIT originals (M06-T14, D-222); CANONS.md 11.3: one-sided keyed horn recess with hub relief; the horn screw clamps the part between head and hub",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/davit/files/src/lib.py lines 174 to 197 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference joints/horn-capture",
  original: [
    { slug: "davit", file: "files/src/lib.py", lines: "174 to 197", sha256: "33d8ebe0f4aa6bcf36ea4ab678d1f0e0bb4a3a5233abced76fc905b931b5057a", record: "davit RECORD.md" },
    { slug: "davit", file: "files/src/parts_r4.py", lines: "67 to 78", sha256: "ddae2111221fb45608190cedf31cc9b05cd916fce12fd8afd11ab812da885a36", record: "davit RECORD.md" },
  ],
});
