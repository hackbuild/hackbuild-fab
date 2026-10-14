// graded-slider-wiper: seed row of seed/archetypes.seed.yaml.
// Registered at M06-T01. Senses, emits, limits and provenance mirror the
// seed; read and channels are the CANONS.md 4.1 working values that M06-T07
// confirms against the original named below (D-222).

import { refusedArchetype } from "../def.js";

export const gradedSliderWiper = refusedArchetype({
  id: "graded-slider-wiper",
  family: "copper",
  channels: 3,
  senses: [
    "position",
    "pressure",
  ],
  emits: [
    "conductor",
    "conductor",
    "conductor",
    "pad",
    "pad",
    "pad",
  ],
  read: "adc",
  limits: [],
  provenance: "KEYWAY 2026-08",
  status: "candidate",
  statusReason: "not ported as an archetype: the KEYWAY slider pass lives in the board port reference/copper/keyway/build.ts, which matches the original at 0.2 percent net area and 0.5 percent symmetric difference (computed, M05-T15), not the originals rule's 1e-6 mm outline Hausdorff, and no build path takes a copper archetype (a vinyl surface is one W x H board drafted by its build.ts; part.build has no vinyl host body); promotes in M06-T09 when that path exists, else M11-T09",
  original: [
    { slug: "keyway", file: "files/gen_keyway.py", fn: "slider", sha256: "d712ce489ad04cc33f670715e204ad8ac21ee3429a1123e48cfa3dfdcf715e3c", record: "keyway 5.3" },
  ],
});
