// board-face-convention: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origBoardFaceConvention = refusedArchetype({
  id: "board-face-convention",
  family: "check",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "SHUNT originals (M06-T14, D-222); CANONS.md 11.3: position mirror against glyph mirror, mirror-distinguishable silk, inverted expected-violation gate",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/shunt/files/gen_fab.py yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M08, else M11-T09 with reference boards/shunt-art",
  original: [
    { slug: "shunt", file: "files/gen_fab.py", sha256: "eeffed1bc78e44dfc06acc09e04b4f6dd1cb3a62834a6fd6da09e0b979374013", record: "shunt RECORD.md" },
    { slug: "shunt", file: "files/check_fab.py", sha256: "cb9902bfc157afd390b89405369f271c79e81030192f39447c5b341214942f14", record: "shunt RECORD.md" },
  ],
});
