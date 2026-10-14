// plug-sleeve-cap: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origPlugSleeveCap = refusedMechanism({
  id: "plug-sleeve-cap",
  family: "case",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "SCABBARD originals (M06-T14, D-222); CANONS.md 11.3: one piece pocket with a plug sleeve cap sized by the scale rule",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/scabbard/files/scabbard.html buildParts, capClear yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference cases/scabbard-shell",
  original: [
    { slug: "scabbard", file: "files/scabbard.html", fn: "buildParts, capClear", sha256: "e43210b00c3812511fea2f8d7c6727bf07bff3d4fb0dfbe1e6e8a35408eaa0a1", record: "scabbard RECORD.md" },
  ],
});
