// tray-planar-walls: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origTrayPlanarWalls = refusedMechanism({
  id: "tray-planar-walls",
  family: "case",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "KNUCKLE originals (M06-T14, D-222); CANONS.md 11.3: walls as planar bars with apertures and notches",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/knuckle/files/src/part4.js buildTray lines 237 to 316 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T15 with reference cases/flip",
  original: [
    { slug: "knuckle", file: "files/src/part4.js", fn: "buildTray", lines: "237 to 316", sha256: "7463845cf6f7b91f116aa588f14da497da81bade341763333567a2bd6930b7ab", record: "knuckle RECORD.md" },
  ],
});
