// count-wheel-detent: seed row of seed/mechanisms.seed.yaml.
// Registered at M06-T01; derive() ported at M06-T03 to M06-T05 in src/derive
// and held candidate by the originals rule (statusReason). Fields mirror the
// seed and the original is the
// CANONS.md 11.1 row (D-222).

import { refusedMechanism } from "../def.js";
import { DETENT_PARAMS } from "../derive/detent.js";

export const countWheelDetent = refusedMechanism({
  id: "count-wheel-detent",
  family: "memory",
  dof: null,
  governs: [
    "detent is a SEPARATE flat strip; an integral beam fused along its length is ~10x too stiff",
  ],
  failureModes: [],
  processes: ["fdm"],
  provenance: "KNURL 2026-09 (printed, ~0.97 N at 0.63% strain)",
  status: "candidate",
  statusReason: "KNURL's pawl numbers regenerate with the D-096 corrections (test/knurl.parity.test.ts), but the canonical strip, block and count wheel bodies do not port under the originals rule: K.buildParts draws them with browser canvas booleans and K.buildMeshes traces each slab at 12 px per mm with Douglas-Peucker 0.03 mm (the pawl slab traces to 28 vertices, the wheel skin to 2266 with its numerals), and a traced circle sits up to 0.011 mm off its exact radius in headless Chrome (measured 2026-10-09, fab-knowledge/evidence/m06-cmds/knurl/trace-measure.json) against the 1e-6 mm outline rule; the repo has no headless canvas and the raster tolerance is set by the first green run of M10-T08; promotes at M10-T08 with reference mechanisms/detent-strip",
  params: DETENT_PARAMS,
  original: [
    { slug: "knurl", file: "files/knurl.html", fn: "K.layout", lines: "638 to 649", sha256: "90a7f98e708e3fa850e11ce3e58f3ab5fa612b8446f15b5f8a7efbde575e9af1", record: "knurl 5.3" },
    { slug: "knurl", file: "files/knurl.html", fn: "K.pawlDeflection", lines: "1101 to 1110", sha256: "90a7f98e708e3fa850e11ce3e58f3ab5fa612b8446f15b5f8a7efbde575e9af1", record: "knurl 5.4" },
  ],
});
