// blocks-wire: seed row of seed/archetypes.seed.yaml, ported at M06-T09
// from the BLOCKS wire (parts.js lines 565 to 710); the port lives in
// src/blocks/wire.ts. Senses, emits and provenance mirror the seed.

import { provenArchetype } from "../def.js";
import { WIRE_DEFAULTS, WIRE_PARAMS, wireApply, wireDerive, wirePath } from "../blocks/wire.js";

export const blocksWire = provenArchetype({
  version: "1.0.0",
  id: "blocks-wire",
  family: "printed",
  channels: 0,
  senses: [],
  emits: [
    "conductor",
    "port",
    "port",
  ],
  read: "none",
  limits: ["about 1 Mohm per 80 mm"],
  provenance: "BLOCKS 2026-09",
  status: "proven",
  reference: ["conductors/blocks-wire"],
  original: [
    { slug: "blocks", file: "files/src-extracted/parts.js", fn: "wirePath, trimPath, wire", lines: "565 to 710", sha256: "8822104bf031a6c803218f98791346e7015448f00af774f21a0cc13a42686b1f", record: "blocks 5.10, 5.21" },
  ],
  // The default core, parts.js line 692: path length through coreW x the 0.6 core band.
  sections: [
    { id: "core", material: "ctpu", direction: "bulk", widthMm: WIRE_DEFAULTS.coreW, thicknessMm: 0.6, lengthMm: wirePath(WIRE_DEFAULTS).len, source: "originals/blocks/files/src-extracted/parts.js line 692: the core at the defaults" },
  ],
  params: WIRE_PARAMS,
  derive: (p, profile) => wireDerive(p, profile),
  apply: (input) => wireApply(input, "blocks-wire"),
});
