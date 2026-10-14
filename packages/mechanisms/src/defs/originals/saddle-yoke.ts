// saddle-yoke: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origSaddleYoke = refusedMechanism({
  id: "saddle-yoke",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "SPOOL originals (M06-T14, D-222); CANONS.md 11.3: servo saddle and horn-capturing yoke on one square interface mating at any quarter turn, scored by face; CANONS.md 8.3 row: saddle and yoke",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/spool/files/src/spool_parts.py lines 102 to 203 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T06 with reference joints/saddle-yoke",
  original: [
    { slug: "spool", file: "files/src/spool_parts.py", lines: "102 to 203", sha256: "56176ce99411e75b2ca9e87132c208ec8e86b06b65c05cc3c75bd8fab54fd95f", record: "spool RECORD.md" },
    { slug: "spool", file: "files/src/route12.py", lines: "7 to 52", sha256: "0738093e90b5d0f3c746525a48218caedf04b65f8874b4993a54c625f4d44ea2", record: "spool RECORD.md" },
  ],
});
