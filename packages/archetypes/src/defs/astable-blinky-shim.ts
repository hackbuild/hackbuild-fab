// astable-blinky-shim: D-096 split of seed row astable-blinky (src/added.ts).
// Registered at M06-T01. Senses, emits, limits and provenance mirror the
// seed; read and channels are the CANONS.md 4.1 working values that M06-T07
// confirms against the original named below (D-222).

import { refusedArchetype } from "../def.js";

export const astableBlinkyShim = refusedArchetype({
  id: "astable-blinky-shim",
  family: "copper",
  channels: 0,
  senses: [],
  emits: [
    "pad",
    "conductor",
  ],
  read: "none",
  limits: [
    "NE555 will not oscillate on a 3 V coin cell; pink LED Vf marginal at 3 V",
    "33k, 22 uF, about 1 Hz (0.6 to 1.6), one 220R per LED (design value, plan-deltas R47)",
  ],
  provenance: "SHIM 2026-08",
  status: "candidate",
  statusReason: "SHIM's card is a vinyl copper board (files/gen_board.py) and copper archetypes have no part.build path yet (packages/copper VinylDraft takes a W x H rectangle only, M06-T09 finding); its reference boards/shim-card is written in M08 with the board backends (D-089), not present on 2026-10-09",
  original: [
    { slug: "shim", file: "files/gen_board.py", sha256: "55ae3afd3cfd86a894a3101f15e226abf5fd5063061cf819afe2c777da094588", record: "shim 4.1" },
  ],
});
