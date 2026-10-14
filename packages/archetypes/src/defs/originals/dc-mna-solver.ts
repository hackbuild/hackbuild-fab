// dc-mna-solver: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origDcMnaSolver = refusedArchetype({
  id: "dc-mna-solver",
  family: "system",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "BLOCKS originals (M06-T14, D-222); CANONS.md 11.3: DC solver with switch, trim, force, pot, LED, touch and pin modes (add the rotary and pass branches)",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/blocks/files/src-extracted/sim.js lines 66 to 157 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T10 with reference blocks/scene",
  original: [
    { slug: "blocks", file: "files/src-extracted/sim.js", lines: "66 to 157", sha256: "8b3435df11e5adcd38d435089aee3ac98b6fcaa466ff3f599beb8431ffca898d", record: "blocks RECORD.md" },
  ],
});
