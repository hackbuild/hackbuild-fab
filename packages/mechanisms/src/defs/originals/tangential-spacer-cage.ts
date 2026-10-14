// tangential-spacer-cage: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origTangentialSpacerCage = refusedMechanism({
  id: "tangential-spacer-cage",
  family: "kerf",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "SLUG originals (M06-T14, D-222); CANONS.md 11.3: cage drum on staggered tangential tenon-shoulder-tenon spacers; only the equator ring locates",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/slug/files/slug.scad rotor_ring, rotor_top, spacer yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 (covers added to the M06-T06 reference) with reference sheet/capsule-rotor-cage",
  original: [
    { slug: "slug", file: "files/slug.scad", fn: "rotor_ring, rotor_top, spacer", sha256: "a5990b866b0829282ec7dc9b6f090c64c447c8f1a3432164b279ebc8dcf3fef6", record: "slug RECORD.md" },
  ],
});
