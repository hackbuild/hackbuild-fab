// touch-comb-key: seed row of seed/archetypes.seed.yaml, proven at M06-T08. The
// port and its parity live in src/pip/; senses, emits and provenance mirror
// the seed, limits carry the D-096 corrections (src/corrections.ts).

import { provenArchetype } from "../def.js";
import { shippedProfile } from "../resistance.js";
import { TOUCH_PARAMS, touchDerive, touchApply } from "../pip/touch.js";
import { touchSections } from "../pip/sections.js";

export const touchCombKey = provenArchetype({
  version: "1.0.0",
  id: "touch-comb-key",
  family: "printed",
  channels: 1,
  senses: ["touch"],
  emits: [
    "conductor",
    "conductor",
    "port",
    "port",
  ],
  read: "charge-release",
  limits: [],
  provenance: "HAFT 2026-09-18, GUDGEON 2026-09",
  status: "proven",
  reference: ["buttons/touch-comb"],
  original: [
    { slug: "pip", file: "files/haft-src/src/model.js", lines: "113 to 136", sha256: "95a996433e54d586cdaa970a844ee8f8f02196f80b23ba36983c95ed456d1f34", record: "pip 5.3" },
  ],
  sections: touchSections(shippedProfile()),
  params: TOUCH_PARAMS,
  derive: (p, profile) => touchDerive(p, profile),
  apply: (input) => touchApply(input, "touch-comb-key"),
});
