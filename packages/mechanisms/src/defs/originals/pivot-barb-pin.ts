// pivot-barb-pin: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origPivotBarbPin = refusedMechanism({
  id: "pivot-barb-pin",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "OGEE16 originals (M06-T14, D-222); CANONS.md 11.3: pivot pin with a printed head and a long lead-in barb, SNAP fit class",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/ogee16/files/src/source/printed.scad a_pivot lines 393 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference joints/pivot-barb-pin",
  original: [
    { slug: "ogee16", file: "files/src/source/printed.scad", fn: "a_pivot", lines: "393", sha256: "b0631eb717ffc0381dc605ca79cab3f5036ca03a4ba935093c982f784e43d42f", record: "ogee16 RECORD.md" },
  ],
});
