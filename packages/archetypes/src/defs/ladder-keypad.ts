// ladder-keypad: seed row of seed/archetypes.seed.yaml, ported at M06-T09
// from the THINPOT original (thinpot.md 4.6). The port and its parity live
// in src/thinpot/ (thinpot.parity.test.ts: readouts, fits, link
// resistances, per-part volumes and posed bounding boxes equal the
// original at its defaults, in place and at the 0.24 layer). It stays
// refused: its reference builds and fails CHK-PRT-13 (statusReason).

import { candidateArchetype } from "../def.js";
import { LADDER_PARAMS } from "../thinpot/ladder.js";

export const ladderKeypad = candidateArchetype({
  id: "ladder-keypad",
  family: "printed",
  channels: 1,
  senses: ["key"],
  emits: ["conductor", "contact", "port", "port"],
  read: "ladder",
  limits: [
    "equal SERIES resistors give equal steps; equal-step PARALLEL ladders need N-squared ratios and cannot be printed",
  ],
  provenance: "STYLUS 2026-08",
  status: "candidate",
  statusReason: "ported with parity (src/thinpot/ladder.ts): readouts, fits, links and per-part volumes within 1e-3 mm3 equal the original; its reference buttons/ladder-key builds since each page part is one csg union body, as the page hands a part's slabs to the slicer as one object, and the D-055 union flips the caps its 0.01 mm laps leave (packages/mesh union.ts); check.run then fails CHK-PRT-13 on the flip bowls, 62.664 deg against 45 over 359.44 mm2 (computed 2026-10-10), the overhang the dome-button reference fails in the original's own print pose; promotes in M06-T09 or M10 STYLUS when the owner answers the TPU bowl overhang question (CHK-PRT-13 row or the profile overhang.maxDeg for TPU, inferred 45 deg in force)",
  original: [
    { slug: "thinpot", file: "files/feeler_thinpot.html", fn: "ladder, domeCap", lines: "4213 to 4562, 1352 to 1418", sha256: "35467f4b022178334c6aba422985854b6bc298927f5f552bc38e79465219b222", record: "thinpot 4.3, 4.6" },
  ],
  params: LADDER_PARAMS,
});
