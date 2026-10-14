// finger-pot: seed row of seed/archetypes.seed.yaml.
// Ported at M06-T09 from the GIB original (gib.md 4.4, 4.5); the port and
// its parity live in src/gib/. Senses, emits, limits and provenance mirror
// the seed; apply() emits the bodies and the readouts as metrics.

import { provenArchetype } from "../def.js";
import { FINGER_POT_PARAMS, gibApply, gibDerive } from "../gib/gib.js";

export const fingerPot = provenArchetype({
  version: "1.0.0",
  id: "finger-pot",
  family: "printed",
  channels: 1,
  senses: ["position"],
  emits: [
    "conductor",
    "pad",
    "pad",
    "pad",
  ],
  read: "adc",
  limits: [],
  provenance: "GIB 2026-09",
  status: "proven",
  reference: ["sensors/finger-pot"],
  original: [
    { slug: "gib", file: "files/src/src/part2.js", fn: "buildFinger, physicsFinger", lines: "339 to 430", sha256: "2ca8ce4a73db2091fc56ad70cae37439288f5fc8fdcb6c970ff00214347bf2fe", record: "gib 4.4; gudgeon 5.6" },
  ],
  params: FINGER_POT_PARAMS,
  derive: (p, profile) => gibDerive(p, profile),
  apply: (input) => gibApply(input, "finger-pot"),
});
