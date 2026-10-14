// coffer-port: seed row of seed/archetypes.seed.yaml, registered at M06-T01.
// Ported at M06-T09 from originals/coffer/files/hexcore.py (src/coffer/port.ts);
// test/coffer.parity.test.ts holds it to the original's recorded numbers and
// outline point sets (test/legacy/coffer.json, scripts/coffer-legacy.py).

import { candidateArchetype } from "../def.js";
import { COFFER_PORT_PARAMS } from "../coffer/index.js";

export const cofferPort = candidateArchetype({
  id: "coffer-port",
  family: "copper",
  channels: null,
  senses: [],
  emits: [
    "pad",
    "pad",
    "pad",
    "pad",
    "pad",
    "pad",
    "pad",
    "pad",
    "pad",
    "conductor",
  ],
  read: "none",
  limits: [],
  provenance: "COFFER 2026-08",
  status: "candidate",
  statusReason: "ported with parity (src/coffer/port.ts): the interlock numbers, pad and tab seam gaps 3.0 and 2.2 mm, the tape gate and the outline, pad, tab and ground ring point sets (one window and two) equal the original within 1e-6 mm (computed, test/coffer.parity.test.ts); refused because no build path takes a copper archetype yet: part.build needs a host body and the tile's own under-layers (a printed guide sticker, a 3 mm ply backer cut on a laser, coffer 5.11) are no vinyl-process material in profile, and the vinyl surface path (packages/copper VinylDraft) takes only a W x H rectangle outline, not COFFER's hexagon; promotes in M06-T09 when either path takes a copper archetype, else M11-T09",
  params: COFFER_PORT_PARAMS,
  original: [
    { slug: "coffer", file: "files/hexcore.py", lines: "23 to 43, 125 to 156", sha256: "b1bc9905fb4c5bb8bbf25ef4ff25cf20b3f201b22299c65f6572ce053e00de23", record: "coffer 5.2" },
    { slug: "coffer", file: "files/gen_coffer.py", fn: "build, gates", lines: "295 to 333", sha256: "3c5d50fb394669e6e4d16c033cfc219493cfb37ccbdb53fe80baef23e49cae7d", record: "coffer 5.9, 5.10" },
  ],
});
