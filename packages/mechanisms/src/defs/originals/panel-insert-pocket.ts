// panel-insert-pocket: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origPanelInsertPocket = refusedMechanism({
  id: "panel-insert-pocket",
  family: "fit",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "KNUCKLE originals (M06-T14, D-222); CANONS.md 11.3: acrylic panel pocket insert with a laser companion part",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/knuckle/files/src/part4.js buildFlip, loopWithChannel lines 423 to 463 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T15 with reference joints/panel-insert",
  original: [
    { slug: "knuckle", file: "files/src/part4.js", fn: "buildFlip, loopWithChannel", lines: "423 to 463", sha256: "7463845cf6f7b91f116aa588f14da497da81bade341763333567a2bd6930b7ab", record: "knuckle RECORD.md" },
  ],
});
