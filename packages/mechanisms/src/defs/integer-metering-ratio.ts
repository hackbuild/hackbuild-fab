// integer-metering-ratio: D-096 addition (src/added.ts).
// Registered at M06-T01; fields mirror the seed and the original is the
// CANONS.md 11.1 row (D-222).

import { refusedMechanism } from "../def.js";
import { METERING_PARAMS } from "../derive/additions.js";

export const integerMeteringRatio = refusedMechanism({
  id: "integer-metering-ratio",
  family: "metering",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "SLUG 2026-08 slug.scad (D-096)",
  status: "candidate",
  statusReason: "D-096 addition; derive golden 76/19 = 4 and 4075.7728 half steps per vend (test/additions.test.ts); promotion milestone M07 (SLUG vend program)",
  params: METERING_PARAMS,
  original: [
    { slug: "slug", file: "files/slug.scad", lines: "35 to 36", sha256: "a5990b866b0829282ec7dc9b6f090c64c447c8f1a3432164b279ebc8dcf3fef6", record: "slug 6" },
  ],
});
