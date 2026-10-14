// rocker-summer: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origRockerSummer = refusedMechanism({
  id: "rocker-summer",
  family: "linkage",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "OGEE originals (M06-T14, D-222); CANONS.md 11.3: dogleg rocker averaging two bars on the diagonal",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/ogee/files/ogee-source.zip ogee.scad rocker() lines 17 yet, and no number is recorded, since the original was not run headless at M06-T14; the card notes, not yet held by a test: also in ogee-source.zip; lineage tier; promotes at M11-T09 with reference mechanisms/rocker-summer",
  original: [
    { slug: "ogee", file: "files/ogee-source.zip", fn: "ogee.scad rocker()", lines: "17", sha256: "700e8cb9b21b785e34e000e0e83d9e0605062979543fddccc798054cb10cc2ee", record: "ogee RECORD.md" },
  ],
});
