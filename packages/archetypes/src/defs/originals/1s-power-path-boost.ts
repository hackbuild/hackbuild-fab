// 1s-power-path-boost: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const orig1sPowerPathBoost = refusedArchetype({
  id: "1s-power-path-boost",
  family: "board",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "LUG, GROMMET originals (M06-T14, D-222); CANONS.md 11.3: USB-C to charger plus boost with a fuel gauge",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/lug/files/lug.tsx lines 149 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M08 with reference boards/lug-pi-hat",
  original: [
    { slug: "lug", file: "files/lug.tsx", lines: "149", sha256: "ff88947cb61584f220eb8d2495e882ea1c2ca785972c3de872f165fe4d7a644d", record: "lug RECORD.md" },
    { slug: "grommet", file: "files/grommet.tsx", sha256: "102ca22261bb8a749f799f8e270977891318c17eac58ca9355ebb1599f3a6ec4", record: "grommet RECORD.md" },
  ],
});
