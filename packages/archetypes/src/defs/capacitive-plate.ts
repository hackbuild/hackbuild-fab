// capacitive-plate: seed row of seed/archetypes.seed.yaml.
// Registered at M06-T01. Senses, emits, limits and provenance mirror the
// seed; read and channels are the CANONS.md 4.1 working values that M06-T07
// confirms against the original named below (D-222).

import { refusedArchetype } from "../def.js";

export const capacitivePlate = refusedArchetype({
  id: "capacitive-plate",
  family: "printed-or-copper",
  channels: 1,
  senses: ["touch"],
  emits: [
    "conductor",
    "pad",
  ],
  read: "charge-release",
  limits: [
    "ON or OFF only; no velocity",
    "no aftertouch. claiming otherwise is the easiest lie in this domain",
  ],
  provenance: "VERNIER 2026-08, COFFER 2026-08",
  status: "candidate",
  statusReason: "not ported: GUDGEON's printed plates are placed by CIRC.layout from the tray state (05_part2d_circuit.js lines 19 to 52 compute placement only) and drawn into the raster deck plates of 07_part2f_build.js, so the plate has no standalone body to regenerate without porting the GUDGEON deck; the copper VERNIER plates live in reference/copper/vernier at 0.2 percent area and 0.5 percent symmetric difference (computed, M05-T15), not the 1e-6 mm outline rule, and no build path takes a copper archetype; promotes in M06-T09 when the GUDGEON deck port lands, else M11-T09",
  original: [
    { slug: "gudgeon", file: "files/extracted/05_part2d_circuit.js", lines: "19 to 52", sha256: "796b2f58884e20e86b180eaa4a9647a0f90160d09c3227a1a0c13ed0232c9a3b", record: "gudgeon 5.5" },
    { slug: "vernier", file: "files/gen_vernier.py", fn: "plates and risers", sha256: "ed2f18042496b51573e7d4e9542f6d328e980f3bebc2ea6315b7b76e70366ea7", record: "vernier 5.1, 5.2" },
  ],
});
