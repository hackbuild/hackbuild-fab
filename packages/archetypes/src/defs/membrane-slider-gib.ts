// membrane-slider-gib: D-096 split of seed row printed-membrane-slider (src/added.ts).
// Ported at M06-T09 from the GIB original (gib.md 4.4, 4.5); the port and
// its parity live in src/gib/. Senses, emits, limits and provenance mirror
// the seed; apply() emits the bodies and the readouts as metrics.

import { provenArchetype } from "../def.js";
import { MEMBRANE_GIB_PARAMS, gibApply, gibDerive } from "../gib/gib.js";

export const membraneSliderGib = provenArchetype({
  version: "1.0.0",
  id: "membrane-slider-gib",
  family: "printed",
  channels: 1,
  senses: ["position"],
  emits: [
    "conductor",
    "conductor",
    "contact",
    "port",
    "port",
    "port",
  ],
  read: "adc",
  limits: [],
  provenance: "GIB 2026-09",
  status: "proven",
  reference: ["sensors/membrane-slider-gib"],
  original: [
    { slug: "gib", file: "files/src/src/part2.js", fn: "buildMembrane, physicsMembrane", lines: "245 to 337, 517 to 550", sha256: "2ca8ce4a73db2091fc56ad70cae37439288f5fc8fdcb6c970ff00214347bf2fe", record: "gib 4.5" },
  ],
  params: MEMBRANE_GIB_PARAMS,
  derive: (p, profile) => gibDerive(p, profile),
  apply: (input) => gibApply(input, "membrane-slider-gib"),
});
