// touch-segment-slider: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origTouchSegmentSlider = refusedArchetype({
  id: "touch-segment-slider",
  family: "printed",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "GIB originals (M06-T14, D-222); CANONS.md 11.3: toothed interdigitated touch segments with a finger-disc linearity sweep and a dead-spot check",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/gib/files/src/src/part2.js buildTouch lines from line 176 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference sensors/touch-segment-slider",
  original: [
    { slug: "gib", file: "files/src/src/part2.js", fn: "buildTouch", lines: "from line 176", sha256: "2ca8ce4a73db2091fc56ad70cae37439288f5fc8fdcb6c970ff00214347bf2fe", record: "gib RECORD.md" },
  ],
});
