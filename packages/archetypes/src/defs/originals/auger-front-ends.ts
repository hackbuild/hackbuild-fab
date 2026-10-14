// auger-front-ends: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origAugerFrontEnds = refusedArchetype({
  id: "auger-front-ends",
  family: "board",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "AUGER originals (M06-T14, D-222); CANONS.md 11.3: PCB meander antenna, NTC isolation tab, gated boost heater switch, two-stage coil EMF, E-field follower, half-rail bias",
  status: "candidate",
  statusReason: "not for port yet: registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/auger/files/src/footprints.tsx yet, and no number is recorded, since the original was not run headless at M06-T14; the card notes, not yet held by a test: unrouted board, lineage tier; promotion waits: not before AUGER is routed",
  original: [
    { slug: "auger", file: "files/src/footprints.tsx", sha256: "4cb5399a0ba5ed4a45032ee2b9afbdcaf8269cc82a78fa637e31c5cbb6b5cc9e", record: "auger RECORD.md" },
    { slug: "auger", file: "files/src/auger.board.tsx", sha256: "7319c3e1d2490ea53d8c25d2f5174dd13ed32490b8a2ec1e4f83c31d37a586ef", record: "auger RECORD.md" },
  ],
});
