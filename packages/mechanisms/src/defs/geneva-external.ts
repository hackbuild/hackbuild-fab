// geneva-external: seed row of seed/mechanisms.seed.yaml.
// Registered at M06-T01; derive() ported at M06-T03 to M06-T05 in src/derive
// and held candidate by the originals rule (statusReason). Fields mirror the
// seed and the original is the
// CANONS.md 11.1 row (D-222).

import { refusedMechanism } from "../def.js";
import { GENEVA_PARAMS } from "../derive/geneva.js";

export const genevaExternal = refusedMechanism({
  id: "geneva-external",
  family: "intermittent",
  dof: 1,
  governs: [
    "slots open to the rim",
    "locking disc scallops clear the crank at every angle",
  ],
  failureModes: [
    "pin shears at entry without lead-in",
    "hub severed by bore plus pin hole",
  ],
  processes: [
    "laser",
    "fdm",
  ],
  provenance: "TUMBLER 2026-08, KNURL 2026-09 (3-slot, shipped and printed)",
  status: "candidate",
  statusReason: "KNURL's Geneva numbers regenerate (test/knurl.parity.test.ts) and TUMBLER's gen module regenerates its cut parts (test/tumbler.parity.test.ts), but the canonical bodies do not port under the originals rule: K.buildParts draws the star and wheel slabs with browser canvas booleans (the wheel lock ring is 69 swept star cuts, lines 1041 to 1051) and K.buildMeshes traces each slab at 12 px per mm with Douglas-Peucker 0.03 mm, so the star hub circle r 3.0 traces to r 2.9918 to 3.0108 mm in headless Chrome (measured 2026-10-09, fab-knowledge/evidence/m06-cmds/knurl/trace-measure.json) against the 1e-6 mm outline rule; the repo has no headless canvas and the raster tolerance is set by the first green run of M10-T08; promotes at M10-T08 with reference mechanisms/geneva-3",
  params: GENEVA_PARAMS,
  original: [
    { slug: "knurl", file: "files/knurl.html", fn: "K.layout", lines: "588 to 599", sha256: "90a7f98e708e3fa850e11ce3e58f3ab5fa612b8446f15b5f8a7efbde575e9af1", record: "knurl 5.2" },
    { slug: "knurl", file: "files/knurl.html", fn: "K.geneva, K.sim", lines: "674 to 685", sha256: "90a7f98e708e3fa850e11ce3e58f3ab5fa612b8446f15b5f8a7efbde575e9af1", record: "knurl 5.2" },
    { slug: "tumbler", file: "files/tumbler.html", fn: "module", lines: "from 1217", sha256: "fe14c0cd07d8b10f8852317942fb86aa6ae3e30d12b60af344890e68cbc47178", record: "tumbler 4.5" },
  ],
});
