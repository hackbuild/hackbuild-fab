// board-table-seat: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origBoardTableSeat = refusedArchetype({
  id: "board-table-seat",
  family: "printed",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "BAFFLE-R3 originals (M06-T14, D-222); CANONS.md 11.3: seat driven by a board table (pad maps, sense kinds, standoff, back clearance)",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/baffle-r3/files/src/model.js BOARDS, applyBoard lines from line 27 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference seats/board-table",
  original: [
    { slug: "baffle-r3", file: "files/src/model.js", fn: "BOARDS, applyBoard", lines: "from line 27", sha256: "bda7af8d66f52e9dec1ba3956e2dc8e54d2dc6e62bf679b12fb5de580633636f", record: "baffle-r3 RECORD.md" },
  ],
});
