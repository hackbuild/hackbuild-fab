// read-two-phase-slide: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origReadTwoPhaseSlide = refusedArchetype({
  id: "read-two-phase-slide",
  family: "read-model",
  channels: null,
  senses: [],
  emits: [],
  read: "slide",
  limits: [],
  provenance: "TANG-R6, KEYWAY originals (M06-T14, D-222); CANONS.md 11.3: position, then pressure on a second pass with both ends high",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/tang-r6/files/src/05_design.js D.buildNeck yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 (covers added) with reference sensors/graded-slider",
  original: [
    { slug: "tang-r6", file: "files/src/05_design.js", fn: "D.buildNeck", sha256: "36220ca1d95cef4012ee7e4d153a1afff7357cf0047773c8caafe787fd19e1c3", record: "tang-r6 RECORD.md" },
    { slug: "keyway", file: "files/gen_keyway.py", sha256: "d712ce489ad04cc33f670715e204ad8ac21ee3429a1123e48cfa3dfdcf715e3c", record: "keyway RECORD.md" },
  ],
});
