// buried-trace-stack: seed row of seed/archetypes.seed.yaml.
// Registered at M06-T01. Senses, emits, limits and provenance mirror the
// seed; read and channels are the CANONS.md 4.1 working values that M06-T07
// confirms against the original named below (D-222).

import { refusedArchetype } from "../def.js";

export const buriedTraceStack = refusedArchetype({
  id: "buried-trace-stack",
  family: "printed",
  channels: 0,
  senses: [],
  emits: [
    "conductor",
    "pocket",
  ],
  read: "none",
  limits: [
    "a single buried layer cannot fan a header row to a key grid; two layers with printed vias route cleanly; the router must not add margin beyond the real gap check or 2.54 mm pads read as conflicts; unfinished routing and tight spots must surface as WARNINGS never silence",
  ],
  provenance: "HAFT 2026-09-18, GUDGEON 2026-09, BLOCKS 2026-09",
  status: "candidate",
  // The stack's trace regions are emitted by packages/copper emitTraceLayers,
  // the one port of model.js lines 30 to 51 and GEO.stroke, which this
  // package may not import (tiers.json); test/legacy/pip-seat.json records
  // the original's conductive slot below the pad layer.
  statusReason: "the one port of its geometry (packages/copper emitTraceLayers, model.js lines 30 to 51) gives 869.836 mm3 of cPLA below the pad layer on PIP's default route against the original's 869.688 at bleed 0 (computed, test/legacy/pip-seat.json stack; haft and pip-controller agree), outside the 1e-3 mm3 originals rule; promotes in M06-T09 when copper's stroke regenerates the original's regions or the rule states a tolerance for snapped regions",
  original: [
    { slug: "pip", file: "files/haft-src/src/model.js", lines: "26 to 51", sha256: "95a996433e54d586cdaa970a844ee8f8f02196f80b23ba36983c95ed456d1f34", record: "pip 4.2, 5.5" },
    { slug: "pip", file: "files/haft-src/src/geom.js", fn: "GEO.stroke", lines: "102 to 115", sha256: "43992b7d0617b6006729547db6909dba3b28ec3fea8d16ac23052e459d625305", record: "pip 5.5; gudgeon 5.8" },
  ],
});
