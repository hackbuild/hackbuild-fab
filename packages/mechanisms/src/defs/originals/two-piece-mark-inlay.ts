// two-piece-mark-inlay: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origTwoPieceMarkInlay = refusedMechanism({
  id: "two-piece-mark-inlay",
  family: "cosmetic",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "COTTER originals (M06-T14, D-222); CANONS.md 11.3: flush multicolour inlay or mono deboss with a hair inset, ink over sun",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/cotter/files/cotter-src/src/modules.js applyArt lines 24 to 35 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference cosmetic/flush-inlay-two-piece-mark",
  original: [
    { slug: "cotter", file: "files/cotter-src/src/modules.js", fn: "applyArt", lines: "24 to 35", sha256: "3f40c1fda78fc2aa3dc305ee1db973bdf3c36088dd1a289431263501118009ad", record: "cotter RECORD.md" },
  ],
});
