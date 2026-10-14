// resolver-dial: seed row of seed/archetypes.seed.yaml, registered at M06-T01.
// The COFFER D1 band law is ported at M06-T09 (src/coffer/tiles.ts);
// test/coffer.parity.test.ts holds it to the original's point sets.

import { candidateArchetype } from "../def.js";
import { RESOLVER_DIAL_PARAMS } from "../coffer/index.js";

export const resolverDial = candidateArchetype({
  id: "resolver-dial",
  family: "copper",
  channels: 4,
  senses: ["absolute-angle"],
  emits: [
    "conductor",
    "conductor",
    "conductor",
    "conductor",
    "pad",
    "pad",
    "pad",
    "pad",
  ],
  read: "adc",
  limits: [
    "55 degree blind sector where the traces leave; mask it in firmware",
  ],
  provenance: "COFFER D1 2026-08",
  status: "candidate",
  statusReason: "band law ported with parity (src/coffer/tiles.ts): the four raw bands (polar_band, 300 steps), the band widths 4.14, 6.79, 6.61, 3.96 mm at 131.2 deg and the decode back to 131.2 deg equal the original within 1e-6 mm (computed); the 0.3 mm opening of each band, the escapes and the crescent keys are shapely booleans with no port that equals GEOS, so the nets are not ported; refused because no build path takes a copper archetype yet: part.build needs a host body and the tile's own under-layers (a printed guide sticker, a 3 mm ply backer cut on a laser, coffer 5.11) are no vinyl-process material in profile, and the vinyl surface path (packages/copper VinylDraft) takes only a W x H rectangle outline, not COFFER's hexagon; promotes in M06-T09 when that path exists, else M11-T09",
  params: RESOLVER_DIAL_PARAMS,
  original: [
    { slug: "coffer", file: "files/gen_coffer.py", fn: "tile_D1", lines: "168 to 208", sha256: "3c5d50fb394669e6e4d16c033cfc219493cfb37ccbdb53fe80baef23e49cae7d", record: "coffer 5.7" },
    { slug: "coffer", file: "files/hexcore.py", fn: "polar_band", lines: "114 to 123", sha256: "b1bc9905fb4c5bb8bbf25ef4ff25cf20b3f201b22299c65f6572ce053e00de23", record: "coffer 5.3" },
  ],
});
