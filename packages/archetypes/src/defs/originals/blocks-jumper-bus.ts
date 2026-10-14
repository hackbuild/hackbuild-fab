// blocks-jumper-bus: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origBlocksJumperBus = refusedArchetype({
  id: "blocks-jumper-bus",
  family: "printed",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "BLOCKS originals (M06-T14, D-222); CANONS.md 11.3: jumper and bus bar raised to the deck",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/blocks/files/src-extracted/parts.js lines 713 to 745 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T10 with reference blocks/jumper-bus",
  original: [
    { slug: "blocks", file: "files/src-extracted/parts.js", lines: "713 to 745", sha256: "8822104bf031a6c803218f98791346e7015448f00af774f21a0cc13a42686b1f", record: "blocks RECORD.md" },
  ],
});
