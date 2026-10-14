// flex-cone-key: seed row of seed/archetypes.seed.yaml, proven at M06-T08. The
// port and its parity live in src/pip/; senses, emits and provenance mirror
// the seed, limits carry the D-096 corrections (src/corrections.ts).

import { provenArchetype } from "../def.js";
import { shippedProfile } from "../resistance.js";
import { FLEX_PARAMS, flexDerive, flexApply } from "../pip/flex.js";
import { flexSections } from "../pip/sections.js";

export const flexConeKey = provenArchetype({
  version: "1.0.0",
  id: "flex-cone-key",
  family: "printed",
  channels: 1,
  senses: ["press"],
  emits: [
    "pocket",
    "contact",
    "conductor",
    "conductor",
  ],
  read: "charge-release",
  limits: [
    "a vertex of the cone must not sit exactly on a cavity face; inset the kink points into the key well; flex each key a few times after printing to free the cone",
  ],
  provenance: "HAFT 2026-09-18, STYLUS 2026-08",
  status: "proven",
  reference: ["buttons/flex-cone"],
  original: [
    { slug: "pip", file: "files/haft-src/src/model.js", lines: "63 to 88", sha256: "95a996433e54d586cdaa970a844ee8f8f02196f80b23ba36983c95ed456d1f34", record: "pip 5.1; thinpot 4.4" },
    { slug: "pip", file: "files/haft-src/src/layout.js", fn: "flexDims", lines: "149 to 160", sha256: "2d1c6c10554b5c7d8dc333496529abee82e937d2d3fe85c41a8d7ee22bb2468c", record: "pip 5.1" },
  ],
  sections: flexSections(shippedProfile()),
  params: FLEX_PARAMS,
  derive: (p, profile) => flexDerive(p, profile),
  apply: (input) => flexApply(input, "flex-cone-key"),
});
