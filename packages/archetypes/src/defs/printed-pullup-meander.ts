// printed-pullup-meander: seed row of seed/archetypes.seed.yaml.
// Registered at M06-T01. Senses, emits, limits and provenance mirror the
// seed; read and channels are the CANONS.md 4.1 working values that M06-T07
// confirms against the original named below (D-222).

import { refusedArchetype } from "../def.js";

export const printedPullupMeander = refusedArchetype({
  id: "printed-pullup-meander",
  family: "printed",
  channels: 1,
  senses: [],
  emits: [
    "conductor",
    "port",
    "port",
  ],
  read: "pullup",
  limits: [],
  provenance: "TANG R6 2026-09",
  status: "candidate",
  statusReason: "TANG r6_0 only; its author removed the meander at r6_1, so no current original proves it; unblocks when the owner restores it in TANG or M10 promotes the STYLUS meander candidate",
  original: [
    { slug: "tang-r6", file: "files/src/r6_0_04_design.js", lines: "345 to 356", sha256: "28211d4041e8eb81bd7c460abbc6aed32581a054c1a1f7a9574542f3378f7b27", record: "tang-r6 1.1, 1.2" },
  ],
});
