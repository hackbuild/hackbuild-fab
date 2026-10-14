// blocks-lamp-series-r: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origBlocksLampSeriesR = refusedArchetype({
  id: "blocks-lamp-series-r",
  family: "printed",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "BLOCKS, BOSS originals (M06-T14, D-222); CANONS.md 11.3: LED holder whose printed path is the series resistor; CANONS.md 8.3 row: BOSS cone button, touch brick, force brick, lamp, trimmable meander",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/blocks/files/src-extracted/parts.js lines 1155 to 1188 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T10 with reference blocks/lamp",
  original: [
    { slug: "blocks", file: "files/src-extracted/parts.js", lines: "1155 to 1188", sha256: "8822104bf031a6c803218f98791346e7015448f00af774f21a0cc13a42686b1f", record: "blocks RECORD.md" },
    { slug: "boss", file: "files/boss-src/src/parts.js", lines: "604 to 628", sha256: "e9e44eaca651fac61e248e5d066cb523ec7d71252c8a792d1ef09057f801d9e6", record: "boss RECORD.md" },
  ],
});
