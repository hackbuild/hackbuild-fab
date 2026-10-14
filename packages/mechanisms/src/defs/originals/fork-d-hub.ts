// fork-d-hub: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origForkDHub = refusedMechanism({
  id: "fork-d-hub",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "PAWL originals (M06-T14, D-222); CANONS.md 11.3: D-socket hub with a pinch slot and a fork on the link that does not hold the motor; the mout frame rule; CANONS.md 8.3 row: fork and D-hub",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/pawl/files/src/parts.py yet, and no number is recorded, since the original was not run headless at M06-T14; the card notes, not yet held by a test: mout frame rule; promotes at M11-T09 with reference joints/fork-d-hub",
  original: [
    { slug: "pawl", file: "files/src/parts.py", sha256: "be215f3ddffda8569b5db293917d5657ae1037de62becb8fae3868119cbc2a18", record: "pawl RECORD.md" },
    { slug: "pawl", file: "files/src/core.mjs", fn: "mout", lines: "17 to 43", sha256: "d1869500a5a871ff3f0bed2f55cb0a92367fc4f112d2494222aac44e03d1f9c8", record: "pawl RECORD.md" },
  ],
});
