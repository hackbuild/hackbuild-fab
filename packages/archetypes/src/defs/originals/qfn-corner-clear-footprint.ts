// qfn-corner-clear-footprint: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origQfnCornerClearFootprint = refusedArchetype({
  id: "qfn-corner-clear-footprint",
  family: "board",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "LUG originals (M06-T14, D-222); CANONS.md 11.3: QFN generator with corner clearance",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/lug/files/lug.tsx QfnFp lines from line 33 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M08 with reference boards/lug-pi-hat",
  original: [
    { slug: "lug", file: "files/lug.tsx", fn: "QfnFp", lines: "from line 33", sha256: "ff88947cb61584f220eb8d2495e882ea1c2ca785972c3de872f165fe4d7a644d", record: "lug RECORD.md" },
  ],
});
