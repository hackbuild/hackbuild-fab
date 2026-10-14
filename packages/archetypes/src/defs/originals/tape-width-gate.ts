// tape-width-gate: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origTapeWidthGate = refusedArchetype({
  id: "tape-width-gate",
  family: "check",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "STAVE originals (M06-T14, D-222); CANONS.md 11.3: material width fits stock, run first",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/stave/files/gen_stave.py yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference surfaces/stave-strip",
  original: [
    { slug: "stave", file: "files/gen_stave.py", sha256: "0d7a79321b8069a518ce57e362665b2a719368525838a729eb27db1fcda12100", record: "stave RECORD.md" },
  ],
});
