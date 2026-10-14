// barbed-snap-tab-groove: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origBarbedSnapTabGroove = refusedMechanism({
  id: "barbed-snap-tab-groove",
  family: "snap",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "KNURL originals (M06-T14, D-222); CANONS.md 11.3: lid barbed snap tabs into a wall groove",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/knurl/files/knurl.html lines 650 to 654, 1022 to 1029 yet, and the original's own numbers are recorded in test/legacy/barbed-snap-tab-groove.json; promotes at M10-T08 with reference snaps/barbed-tab",
  original: [
    { slug: "knurl", file: "files/knurl.html", lines: "650 to 654, 1022 to 1029", sha256: "90a7f98e708e3fa850e11ce3e58f3ab5fa612b8446f15b5f8a7efbde575e9af1", record: "knurl RECORD.md" },
  ],
});
