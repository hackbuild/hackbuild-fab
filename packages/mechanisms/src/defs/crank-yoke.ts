// crank-yoke: D-096 addition (src/added.ts).
// Registered at M06-T01; fields mirror the seed and the original is the
// CANONS.md 11.1 row (D-222).

import { refusedMechanism } from "../def.js";
import { CRANK_YOKE_PARAMS } from "../derive/additions.js";

export const crankYoke = refusedMechanism({
  id: "crank-yoke",
  family: "linkage",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "OGEE16 params.scad, kin.py (D-096)",
  status: "candidate",
  statusReason: "D-096 addition; derive golden SW 48.590 deg at R 6, stroke 9 (test/additions.test.ts); promotion milestone M07 (OGEE motion programs)",
  params: CRANK_YOKE_PARAMS,
  original: [
    { slug: "ogee16", file: "files/src/source/params.scad", lines: "151 to 152", sha256: "1c0a4b898b4977d87d435273a04857111fab5d43324bee591c2a6ad641591d6d", record: "ogee16 4.4" },
    { slug: "ogee16", file: "files/src/source/kin.py", lines: "130 to 132", sha256: "d2d5a3250c438666179a511d7e87f0c1da9630c1c672eb570382c22f822c1de2", record: "ogee16 4.4" },
  ],
});
