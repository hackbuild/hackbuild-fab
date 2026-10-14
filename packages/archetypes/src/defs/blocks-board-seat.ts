// blocks-board-seat: seed row of seed/archetypes.seed.yaml.
// Registered at M06-T01. Senses, emits, limits and provenance mirror the
// seed; read and channels are the CANONS.md 4.1 working values that M06-T07
// confirms against the original named below (D-222).

import { refusedArchetype } from "../def.js";

export const blocksBoardSeat = refusedArchetype({
  id: "blocks-board-seat",
  family: "printed",
  channels: null,
  senses: [],
  emits: [
    "pocket",
    "contact",
    "port",
  ],
  read: "none",
  limits: [],
  provenance: "BLOCKS 2026-09",
  status: "candidate",
  statusReason: "not ported: the seat routes every selected pin to its column with the BLOCKS two layer rip up router (blocks.js lines 261 to 379, parts.js lines 323 to 328), and the one router (D-092) lives in packages/copper, a tier 1 package archetypes may not import (tools/tiers.json); its numbers also need pinSocket and bore (blocks.js lines 144 to 249) and the snap frame, lid and hinge (parts.js lines 349 to 427); promotes in M10-T10 when the BLOCKS port hands the seat a routed net set, or in M06-T09 if core registers a router for archetypes (D-044)",
  original: [
    { slug: "blocks", file: "files/src-extracted/parts.js", lines: "222 to 344", sha256: "8822104bf031a6c803218f98791346e7015448f00af774f21a0cc13a42686b1f", record: "blocks 5.8; baffle-r3 4.5" },
  ],
});
