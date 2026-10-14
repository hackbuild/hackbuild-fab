// counterbalance-band: D-096 addition (src/added.ts).
// Registered at M06-T01; fields mirror the seed and the original is the
// CANONS.md 11.1 row (D-222).

import { refusedMechanism } from "../def.js";
import { COUNTERBALANCE_PARAMS } from "../derive/additions.js";

export const counterbalanceBand = refusedMechanism({
  id: "counterbalance-band",
  family: "linkage",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "DERRICK arm_build.py (D-096)",
  status: "candidate",
  statusReason: "D-096 addition; derive golden 501.3 gf for 234 N mm at 47.6 mm (test/additions.test.ts); owner milestone unassigned",
  params: COUNTERBALANCE_PARAMS,
  original: [
    { slug: "derrick", file: "files/src/arm_build.py", lines: "139 to 163", sha256: "204cc173ccaba951a7b690cb029b2ba3a9dcf3600516098bd0e0dee0e623e467", record: "derrick 5.5" },
  ],
});
