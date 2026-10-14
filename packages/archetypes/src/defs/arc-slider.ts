// arc-slider: seed row of seed/archetypes.seed.yaml.
// Registered at M06-T01. Senses, emits, limits and provenance mirror the
// seed; read and channels are the CANONS.md 4.1 working values that M06-T07
// confirms against the original named below (D-222).

import { refusedArchetype } from "../def.js";

export const arcSlider = refusedArchetype({
  id: "arc-slider",
  family: "copper",
  channels: 2,
  senses: ["angle"],
  emits: [
    "conductor",
    "conductor",
    "pad",
    "pad",
  ],
  read: "ratiometric",
  limits: [
    "5 degree end offset so escapes clear; a shallow big-radius arc is too wide for a channel window",
  ],
  provenance: "QUADRANT, SPLINE, TESSERA 2026-08",
  status: "candidate",
  statusReason: "not ported as an archetype: the arc wedge pair lives in the QUADRANT board port reference/copper/quadrant/build.ts (and COFFER A3, tile_A3), which matches the original at 0.2 percent net area and 0.5 percent symmetric difference (computed, M05-T15), not the originals rule's 1e-6 mm outline Hausdorff, and no build path takes a copper archetype (a vinyl surface is one W x H board drafted by its build.ts; part.build has no vinyl host body); promotes in M06-T09 when that path exists and the arc outlines are ported point for point, else M11-T09",
  original: [
    { slug: "quadrant", file: "files/gen_quadrant.py", fn: "arc wedge pair", sha256: "a6783b385d6c2e44732a072c9e9f31dd9e8aa65a2d6721ac75ddabff2efd5fcd", record: "quadrant 5.2" },
  ],
});
