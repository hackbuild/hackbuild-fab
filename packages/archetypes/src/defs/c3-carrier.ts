// c3-carrier: seed row of seed/archetypes.seed.yaml.
// Registered at M06-T01. Senses, emits, limits and provenance mirror the
// seed; read and channels are the CANONS.md 4.1 working values that M06-T07
// confirms against the original named below (D-222).

import { refusedArchetype } from "../def.js";

export const c3Carrier = refusedArchetype({
  id: "c3-carrier",
  family: "board",
  channels: null,
  senses: [],
  emits: [
    "pad",
    "conductor",
    "port",
  ],
  read: "none",
  limits: [
    "GPIO21 strobes the boot log",
    "laser on GPIO20; GPIO2 needs its strap held at reset; USB must be at a board edge",
    "dual-supply jumper default normally open (SPINDLE; TRUNNION normally closed); pad map tier vendor until calipers",
  ],
  provenance: "SPINDLE v5 and R1, TRUNNION 2026-08",
  status: "candidate",
  statusReason: "waits for the M08 board backend and its reference",
  original: [
    { slug: "coffer", file: "files/gen_coffer.py", fn: "tile_M1", lines: "210 to 290", sha256: "3c5d50fb394669e6e4d16c033cfc219493cfb37ccbdb53fe80baef23e49cae7d", record: "coffer 5.8" },
    { slug: "spindle", file: "files/gen_board.py", sha256: "e973bfc1266cd5633a1baddeb0cb0927fa199f8b3bec5709fc21c7a2b0156901", record: "spindle 4.2, 4.3" },
  ],
});
