// snap-tongue-relief: D-096 addition (src/added.ts).
// Registered at M06-T01; fields mirror the seed and the original is the
// CANONS.md 11.1 row (D-222).

import { refusedMechanism } from "../def.js";
import { SNAP_TONGUE_PARAMS } from "../derive/additions.js";

export const snapTongueRelief = refusedMechanism({
  id: "snap-tongue-relief",
  family: "snap",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "PLINTH plinth.html DEF.snap (D-096)",
  status: "candidate",
  statusReason: "D-096 addition; PLINTH's strain regenerates, 2.152 percent at lipW 1.5, d 0.3, free 5.6 (test/additions.test.ts); promotion waits for a snap kind reference (D-058)",
  params: SNAP_TONGUE_PARAMS,
  original: [
    { slug: "plinth", file: "files/plinth.html", fn: "DEF.snap", lines: "2928 to 2929", sha256: "e19f9e647763baf7d62c23bba214ea36b21234e3a9a7f6015e12c69117259785", record: "plinth 5.3" },
  ],
});
