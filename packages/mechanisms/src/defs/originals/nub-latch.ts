// nub-latch: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origNubLatch = refusedMechanism({
  id: "nub-latch",
  family: "snap",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "LOCKET originals (M06-T14, D-222); CANONS.md 11.3: clamshell nub latch via a closed map",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/locket/files/src/build.py latch_parts yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference snaps/nub-latch",
  original: [
    { slug: "locket", file: "files/src/build.py", fn: "latch_parts", sha256: "20ad46eead8132a69f69ec3d9142d1ded7ef1e5e3255acc7b61d4e8de96eb90b", record: "locket RECORD.md" },
  ],
});
