// blocks-deck: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origBlocksDeck = refusedArchetype({
  id: "blocks-deck",
  family: "printed",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "BLOCKS originals (M06-T14, D-222); CANONS.md 11.3: deck base: blank, painted nets through the router, or breadboard topology (fix the topo and mode key mismatch)",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/blocks/files/src-extracted/parts.js lines 430 to 562 yet, and no number is recorded, since the original was not run headless at M06-T14; the card notes, not yet held by a test: fix the topo and mode key mismatch; promotes at M10-T10 with reference blocks/deck",
  original: [
    { slug: "blocks", file: "files/src-extracted/parts.js", lines: "430 to 562", sha256: "8822104bf031a6c803218f98791346e7015448f00af774f21a0cc13a42686b1f", record: "blocks RECORD.md" },
  ],
});
