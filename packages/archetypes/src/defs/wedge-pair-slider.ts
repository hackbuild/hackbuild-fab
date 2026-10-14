// wedge-pair-slider: seed row of seed/archetypes.seed.yaml.
// Registered at M06-T01. Senses, emits, limits and provenance mirror the
// seed; read and channels are the CANONS.md 4.1 working values that M06-T07
// confirms against the original named below (D-222).

import { refusedArchetype } from "../def.js";

export const wedgePairSlider = refusedArchetype({
  id: "wedge-pair-slider",
  family: "printed-or-copper",
  channels: 2,
  senses: [
    "position",
    "presence",
  ],
  emits: [
    "conductor",
    "conductor",
    "pad",
    "pad",
  ],
  read: "ratiometric",
  limits: [
    "trapezoids not triangles or the ratio pins to 1.0/0.0; each wedge widened at its thick end so its escape clears the other",
  ],
  provenance: "KEYWAY, VERNIER, STAVE 2026-08",
  status: "candidate",
  statusReason: "not ported as an archetype: the wedge pair lives in the VERNIER board port reference/copper/vernier/build.ts (and COFFER S3, tile_S3), which matches the original at 0.2 percent net area and 0.5 percent symmetric difference (computed, M05-T15), not the originals rule's 1e-6 mm outline Hausdorff, and no build path takes a copper archetype (a vinyl surface is one W x H board drafted by its build.ts; part.build has no vinyl host body); promotes in M06-T09 when that path exists and the wedge outlines are ported point for point, else M11-T09",
  original: [
    { slug: "vernier", file: "files/gen_vernier.py", fn: "wedges()", sha256: "ed2f18042496b51573e7d4e9542f6d328e980f3bebc2ea6315b7b76e70366ea7", record: "vernier 5.4" },
  ],
});
