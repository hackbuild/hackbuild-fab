// teensy-socket-block: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origTeensySocketBlock = refusedArchetype({
  id: "teensy-socket-block",
  family: "printed",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "TANG-R6 originals (M06-T14, D-222); CANONS.md 11.3: Teensy 4.0 socket block with conductive collars and staircase lanes; PIN mode raised bars",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/tang-r6/files/src/04_design.js lines from line 263 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference seats/teensy-socket",
  original: [
    { slug: "tang-r6", file: "files/src/04_design.js", lines: "from line 263", sha256: "43893788df778791f8f309ee1253addfb0248dc9f5fd42495f8809cf8d0ceef0", record: "tang-r6 RECORD.md" },
  ],
});
