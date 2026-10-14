// board-to-enclosure: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origBoardToEnclosure = refusedMechanism({
  id: "board-to-enclosure",
  family: "case",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "AUGER originals (M06-T14, D-222); CANONS.md 11.3: case derived from the board outline by offsets and bands",
  status: "candidate",
  statusReason: "not for port yet: registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/auger/files/case/auger-geom.scad GEO yet, and no number is recorded, since the original was not run headless at M06-T14; the card notes, not yet held by a test: lineage tier; promotion waits: not before AUGER is routed",
  original: [
    { slug: "auger", file: "files/case/auger-geom.scad", fn: "GEO", sha256: "e3e728f6f0cc05980b8bb2333854fe693c1b599f6bb637a9c8c911477a579f44", record: "auger RECORD.md" },
  ],
});
