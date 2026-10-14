// dovetail-rail-keyhole: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origDovetailRailKeyhole = refusedMechanism({
  id: "dovetail-rail-keyhole",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "COTTER, DERRICK, PINTLE originals (M06-T14, D-222); CANONS.md 11.3: dovetail slot cutter with a keyhole entry pocket and ramp; CANONS.md 8.3 row: dovetail rail with keyhole entry",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/cotter/files/cotter-src/src/geo.js lines 134 to 144 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference joints/dovetail-keyhole",
  original: [
    { slug: "cotter", file: "files/cotter-src/src/geo.js", lines: "134 to 144", sha256: "55046403d5e27c2dafabdb526d36c0526237e4a667b997b30e61a7d977a7a7c4", record: "cotter RECORD.md" },
    { slug: "cotter", file: "files/cotter-src/src/modules.js", lines: "36 to 42", sha256: "3f40c1fda78fc2aa3dc305ee1db973bdf3c36088dd1a289431263501118009ad", record: "cotter RECORD.md" },
    { slug: "derrick", file: "files/src/arm_parts.py", lines: "53 to 73", sha256: "ab2e4acd8283f43b78d64a9bc653afe4b79fd1de5c993a5cf3ff2a7d30821fc3", record: "derrick RECORD.md" },
    { slug: "pintle", file: "files/src/pintle_parts.py", lines: "137 to 150", sha256: "5280a22350a488e721d411504a562dec2007f421129e5f7462e055cb2b45a6b1", record: "pintle RECORD.md" },
  ],
});
