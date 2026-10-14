// click-spring-key: seed row of seed/archetypes.seed.yaml, proven at M06-T08. The
// port and its parity live in src/pip/; senses, emits and provenance mirror
// the seed, limits carry the D-096 corrections (src/corrections.ts).

import { provenArchetype } from "../def.js";
import { CLICK_PARAMS, clickDerive, clickApply } from "../pip/click.js";
import { clickSections } from "../pip/sections.js";

export const clickSpringKey = provenArchetype({
  version: "1.0.0",
  id: "click-spring-key",
  family: "printed",
  channels: 1,
  senses: ["press-tactile"],
  emits: [
    "pocket",
    "contact",
    "conductor",
    "conductor",
    "pad",
    "pad",
  ],
  read: "charge-release",
  limits: [
    "PETG strain limit 2.5 percent for beams bent in the layer plane, 1.5 percent default across layers until a coupon (inferred, from HAFT failures at 2.7 to 3.3)",
    "FE window Q 1.72 to 2.19 at PIP defaults (CHK-KEY-04); snaps from Q 1.2, bistable from Q 2.32 (computed, M01-T07)",
    "face pitch 16 so four spring slots find directions that do not collide",
  ],
  provenance: "HAFT 2026-09-18",
  status: "proven",
  reference: ["buttons/click-spring"],
  original: [
    { slug: "pip", file: "files/haft-src/src/layout.js", fn: "clickerDims", lines: "81 to 113", sha256: "2d1c6c10554b5c7d8dc333496529abee82e937d2d3fe85c41a8d7ee22bb2468c", record: "pip 5.2" },
    { slug: "pip", file: "files/haft-src/src/model.js", lines: "89 to 112, 366 to 390, 530 to 542", sha256: "95a996433e54d586cdaa970a844ee8f8f02196f80b23ba36983c95ed456d1f34", record: "pip 5.2" },
    { slug: "pip", file: "files/haft-src/src/snapfe.js", lines: "7 to 99", sha256: "c6eea76f6456049675aec53ff08d8bdd901819e8c4f1106efafcbb23e536c3ae", record: "pip 5.2" },
  ],
  sections: clickSections(),
  params: CLICK_PARAMS,
  derive: (p, profile) => clickDerive(p, profile),
  apply: (input) => clickApply(input, "click-spring-key"),
});
