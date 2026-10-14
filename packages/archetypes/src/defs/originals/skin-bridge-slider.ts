// skin-bridge-slider: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origSkinBridgeSlider = refusedArchetype({
  id: "skin-bridge-slider",
  family: "printed",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "BAFFLE-R3 originals (M06-T14, D-222); CANONS.md 11.3: swapped drive pair read V1/(V1+V2) with a swing check; CANONS.md 8.3 row: BAFFLE skin bridge slider",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/baffle-r3/files/src/model.js sliderArt lines from line 344 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference sensors/skin-bridge-slider",
  original: [
    { slug: "baffle-r3", file: "files/src/model.js", fn: "sliderArt", lines: "from line 344", sha256: "bda7af8d66f52e9dec1ba3956e2dc8e54d2dc6e62bf679b12fb5de580633636f", record: "baffle-r3 RECORD.md" },
  ],
});
