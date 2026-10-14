// blocks-knob: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origBlocksKnob = refusedArchetype({
  id: "blocks-knob",
  family: "printed",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "BLOCKS originals (M06-T14, D-222); CANONS.md 11.3: printed rotary pot or electrical sector selector with a snap-in knob; detent mode has no mechanical detent, so a printed click ports from count-wheel-detent or flexure-finger-spinner",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/blocks/files/src-extracted/parts.js lines 1044 to 1153 yet, and no number is recorded, since the original was not run headless at M06-T14; the card notes, not yet held by a test: detent mode has no mechanical detent; recorded; promotes at M10-T10 with reference blocks/knob",
  original: [
    { slug: "blocks", file: "files/src-extracted/parts.js", lines: "1044 to 1153", sha256: "8822104bf031a6c803218f98791346e7015448f00af774f21a0cc13a42686b1f", record: "blocks RECORD.md" },
  ],
});
