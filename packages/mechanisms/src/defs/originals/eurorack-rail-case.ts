// eurorack-rail-case: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origEurorackRailCase = refusedMechanism({
  id: "eurorack-rail-case",
  family: "sheet",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "EURORACK-SKIFF originals (M06-T14, D-222); CANONS.md 11.3: HP pitch and the 3U hole rule kept at any tilt; wedge cheek",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/eurorack-skiff/files/eurorack-skiff-r7.html genRail, genCheek yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference sheet/eurorack-skiff",
  original: [
    { slug: "eurorack-skiff", file: "files/eurorack-skiff-r7.html", fn: "genRail, genCheek", sha256: "ae30bd558c13e57990013cb3d34aa8bcc03d05df5aee928390b576fe63970dde", record: "eurorack-skiff RECORD.md" },
  ],
});
