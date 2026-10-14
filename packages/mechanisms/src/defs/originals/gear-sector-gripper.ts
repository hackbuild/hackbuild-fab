// gear-sector-gripper: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origGearSectorGripper = refusedMechanism({
  id: "gear-sector-gripper",
  family: "gears",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "DAVIT originals (M06-T14, D-222); CANONS.md 11.3: two gear sectors with rooted teeth, an octagon pin and a press-fit pin cap",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/davit/files/src/parts_r4.py lines 245 to 296 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M07, else M11-T09 with reference machines/davit-joint",
  original: [
    { slug: "davit", file: "files/src/parts_r4.py", lines: "245 to 296", sha256: "ddae2111221fb45608190cedf31cc9b05cd916fce12fd8afd11ab812da885a36", record: "davit RECORD.md" },
  ],
});
