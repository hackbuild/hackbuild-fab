// switch-as-bridge: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origSwitchAsBridge = refusedArchetype({
  id: "switch-as-bridge",
  family: "copper",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "SHIM originals (M06-T14, D-222); CANONS.md 11.3: part body declared as the single crossing bridge, with a theta-graph non-planarity proof and teardrops",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/shim/files/gen_board.py yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M08, else M11-T09 with reference boards/shim-card",
  original: [
    { slug: "shim", file: "files/gen_board.py", sha256: "55ae3afd3cfd86a894a3101f15e226abf5fd5063061cf819afe2c777da094588", record: "shim RECORD.md" },
  ],
});
