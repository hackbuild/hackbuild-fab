// copper-clip-field: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origCopperClipField = refusedArchetype({
  id: "copper-clip-field",
  family: "copper",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "KEYWAY, QUADRANT originals (M06-T14, D-222); CANONS.md 11.3: staggered two-row clip field and the single-row alternating-depth rail",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/keyway/files/gen_keyway.py yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M05-T14 (covers added at M11-T09) with reference copper/keyway",
  original: [
    { slug: "keyway", file: "files/gen_keyway.py", sha256: "d712ce489ad04cc33f670715e204ad8ac21ee3429a1123e48cfa3dfdcf715e3c", record: "keyway RECORD.md" },
    { slug: "quadrant", file: "files/gen_quadrant.py", sha256: "a6783b385d6c2e44732a072c9e9f31dd9e8aa65a2d6721ac75ddabff2efd5fcd", record: "quadrant RECORD.md" },
  ],
});
