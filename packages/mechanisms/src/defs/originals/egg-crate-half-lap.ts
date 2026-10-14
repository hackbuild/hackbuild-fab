// egg-crate-half-lap: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origEggCrateHalfLap = refusedMechanism({
  id: "egg-crate-half-lap",
  family: "kerf",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "GUSSET originals (M06-T14, D-222); CANONS.md 11.3: half-lap slots t + clr by hm/2 with laminated trestles and tabs into mortises",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/gusset/files/gusset-v16.html tableModel lines 546 to 618 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference sheet/egg-crate-table",
  original: [
    { slug: "gusset", file: "files/gusset-v16.html", fn: "tableModel", lines: "546 to 618", sha256: "a29d4f27b07376941230d21638b989f8ce5698ce0ec3ac2c04f2177e24b8ed97", record: "gusset RECORD.md" },
  ],
});
