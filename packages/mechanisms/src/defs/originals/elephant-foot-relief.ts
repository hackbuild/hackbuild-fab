// elephant-foot-relief: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origElephantFootRelief = refusedMechanism({
  id: "elephant-foot-relief",
  family: "construction",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "KNURL originals (M06-T14, D-222); CANONS.md 11.3: relief on bed-side skins",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/knurl/files/knurl.html lines 981, 1014 to 1015, 1032 to 1036, 1057 to 1058 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T08 with reference fits/first-layer-relief",
  original: [
    { slug: "knurl", file: "files/knurl.html", lines: "981, 1014 to 1015, 1032 to 1036, 1057 to 1058", sha256: "90a7f98e708e3fa850e11ce3e58f3ab5fa612b8446f15b5f8a7efbde575e9af1", record: "knurl RECORD.md" },
  ],
});
