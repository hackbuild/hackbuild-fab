// blocks-touch-brick: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origBlocksTouchBrick = refusedArchetype({
  id: "blocks-touch-brick",
  family: "printed",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "BOSS originals (M06-T14, D-222); CANONS.md 11.3: touch brick from the working BOSS control key (BLOCKS renamed it and broke it); CANONS.md 8.3 row: BOSS cone button, touch brick, force brick, lamp, trimmable meander",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/boss/files/boss-src/src/parts.js lines 479 to 498 yet, and no number is recorded, since the original was not run headless at M06-T14; the card notes, not yet held by a test: the BLOCKS rename broke it; BOSS is the source; promotes at M10-T10 with reference blocks/touch",
  original: [
    { slug: "boss", file: "files/boss-src/src/parts.js", lines: "479 to 498", sha256: "e9e44eaca651fac61e248e5d066cb523ec7d71252c8a792d1ef09057f801d9e6", record: "boss RECORD.md" },
  ],
});
