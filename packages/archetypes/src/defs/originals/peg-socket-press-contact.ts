// peg-socket-press-contact: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origPegSocketPressContact = refusedArchetype({
  id: "peg-socket-press-contact",
  family: "printed",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "TANG-R6 originals (M06-T14, D-222); CANONS.md 11.3: conductive pegs into land sockets across two printed parts (neck joinery)",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/tang-r6/files/src/03_design.js lines 57 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference conductors/peg-socket",
  original: [
    { slug: "tang-r6", file: "files/src/03_design.js", lines: "57", sha256: "66212020941634972bd533944ca8e90d69b6195a18859d1a6e38589af921b9b1", record: "tang-r6 RECORD.md" },
    { slug: "tang-r6", file: "files/src/04_design.js", lines: "406", sha256: "43893788df778791f8f309ee1253addfb0248dc9f5fd42495f8809cf8d0ceef0", record: "tang-r6 RECORD.md" },
    { slug: "tang-r6", file: "files/src/05_design.js", lines: "242", sha256: "36220ca1d95cef4012ee7e4d153a1afff7357cf0047773c8caafe787fd19e1c3", record: "tang-r6 RECORD.md" },
  ],
});
