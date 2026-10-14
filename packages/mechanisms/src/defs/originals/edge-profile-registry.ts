// edge-profile-registry: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origEdgeProfileRegistry = refusedMechanism({
  id: "edge-profile-registry",
  family: "cosmetic",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "COLLAR originals (M06-T14, D-222); CANONS.md 11.3: r(theta, z) profiles with a z-dependence flag; the reeded cutter formula",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/collar/files/collar.html EDGES lines 761 to 872 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T06 with reference cosmetic/edge-profiles",
  original: [
    { slug: "collar", file: "files/collar.html", fn: "EDGES", lines: "761 to 872", sha256: "ef0864ab66ca40e2930d12aba4cab3159aa470f743eee533d052fc99f844fd46", record: "collar RECORD.md" },
  ],
});
