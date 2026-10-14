// tilt-stick-8way: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origTiltStick8way = refusedArchetype({
  id: "tilt-stick-8way",
  family: "printed",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "TOGGLE originals (M06-T14, D-222); CANONS.md 11.3: eight pads with a centroid half-step decode to sixteen directions",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/toggle/files/src/src/part2b.js solo8 preset lines 224 to 246 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference sticks/toggle-solo8",
  original: [
    { slug: "toggle", file: "files/src/src/part2b.js", fn: "solo8 preset", lines: "224 to 246", sha256: "c8acaba6c3ff3acffb63b7496c8398076b1ae4fa4ebbbcecfdd0da57289d6c02", record: "toggle RECORD.md" },
  ],
});
