// sdf-outline-case: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origSdfOutlineCase = refusedMechanism({
  id: "sdf-outline-case",
  family: "case",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "CRESSET originals (M06-T14, D-222); CANONS.md 11.3: traced mark as the case outline by signed distance, auto-fit, farthest point posts",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/cresset/files/cresset.html planCase, autoFit yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference cases/cresset",
  original: [
    { slug: "cresset", file: "files/cresset.html", fn: "planCase, autoFit", sha256: "270e6de44466b9ba7a13972c83c98d3f76bc842f72b9a4988c045e5922a6a321", record: "cresset RECORD.md" },
  ],
});
