// c3-supermini-carrier-copper: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origC3SuperminiCarrierCopper = refusedArchetype({
  id: "c3-supermini-carrier-copper",
  family: "copper",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "COFFER, SPINDLE originals (M06-T14, D-222); CANONS.md 11.3: nested-L fans with a channel trunk; under-module channel lane ordering; strapping pin guard; the copper half of c3-carrier",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/coffer/files/gen_coffer.py tile_M1 lines 210 to 290 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M08 with reference seats/c3-supermini and copper/spindle-v5",
  original: [
    { slug: "coffer", file: "files/gen_coffer.py", fn: "tile_M1", lines: "210 to 290", sha256: "3c5d50fb394669e6e4d16c033cfc219493cfb37ccbdb53fe80baef23e49cae7d", record: "coffer RECORD.md" },
    { slug: "spindle", file: "files/gen_board.py", sha256: "e973bfc1266cd5633a1baddeb0cb0927fa199f8b3bec5709fc21c7a2b0156901", record: "spindle RECORD.md" },
  ],
});
