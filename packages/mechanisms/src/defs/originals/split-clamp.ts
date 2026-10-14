// split-clamp: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origSplitClamp = refusedMechanism({
  id: "split-clamp",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "STANCHION originals (M06-T14, D-222); CANONS.md 11.3: pipe split clamp from one printed half used twice, with nut traps",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/stanchion/files/src/cad.py lines 115 to 132 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference joints/split-clamp",
  original: [
    { slug: "stanchion", file: "files/src/cad.py", lines: "115 to 132", sha256: "4fe0bf820f885dd229901f8608cf9e4ac11a1def46bfb08afbcad212e4cefec8", record: "stanchion RECORD.md" },
  ],
});
