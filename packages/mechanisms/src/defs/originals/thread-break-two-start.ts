// thread-break-two-start: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origThreadBreakTwoStart = refusedMechanism({
  id: "thread-break-two-start",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "TENON originals (M06-T14, D-222); CANONS.md 11.3: two-start thread breaks, spigot below and ring above, sized at the break with ring and neck checks; CANONS.md 8.3 row: two-start thread break",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/tenon/files/src/src/part2.js extThread, intThread yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T16 with reference joints/thread-break",
  original: [
    { slug: "tenon", file: "files/src/src/part2.js", fn: "extThread, intThread", sha256: "ac5f68c3ac6454a3f500a2c941786090ac5fbb5436fc92b2e8155767432d8003", record: "tenon RECORD.md" },
  ],
});
