// hex-key: seed row of seed/archetypes.seed.yaml, registered at M06-T01.
// The COFFER K6 hexlets are ported at M06-T09 (src/coffer/tiles.ts);
// test/coffer.parity.test.ts holds them to the original's point sets.

import { candidateArchetype } from "../def.js";
import { HEX_KEY_PARAMS } from "../coffer/index.js";

export const hexKey = candidateArchetype({
  id: "hex-key",
  family: "copper",
  channels: 1,
  senses: ["touch"],
  emits: [
    "conductor",
    "pad",
  ],
  read: "charge-release",
  limits: [
    "across flats 18.53 (README 18.5), about 297 mm2 (computed)",
  ],
  provenance: "COFFER K6, FRET 2026-08",
  status: "candidate",
  statusReason: "K6 hexlets ported with parity (src/coffer/tiles.ts): the six centres, 18.53 mm across the flats and every key outline equal the original within 1e-6 mm (computed); the key nets after the original's shapely union and 0.95 mm opening (smallest 298.5 mm2, narrowest 18.37 mm, computed by the original) and the FRET lattice preset are not ported; refused because no build path takes a copper archetype yet: part.build needs a host body and the tile's own under-layers (a printed guide sticker, a 3 mm ply backer cut on a laser, coffer 5.11) are no vinyl-process material in profile, and the vinyl surface path (packages/copper VinylDraft) takes only a W x H rectangle outline, not COFFER's hexagon; promotes in M06-T09 when that path exists, else M11-T09",
  params: HEX_KEY_PARAMS,
  original: [
    { slug: "coffer", file: "files/gen_coffer.py", fn: "tile_K6", lines: "40 to 99", sha256: "3c5d50fb394669e6e4d16c033cfc219493cfb37ccbdb53fe80baef23e49cae7d", record: "coffer 5.4" },
    { slug: "fret", file: "files/gen_fret.py", fn: "lattice", sha256: "301f6ffc2529d7193cc57fd7406e5c6da01340d1064288253dad7fa5a5507481", record: "fret 5.1" },
  ],
});
