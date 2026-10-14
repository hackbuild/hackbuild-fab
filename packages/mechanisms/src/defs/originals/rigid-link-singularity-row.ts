// rigid-link-singularity-row: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origRigidLinkSingularityRow = refusedMechanism({
  id: "rigid-link-singularity-row",
  family: "metamaterial",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "PHASELOCK originals (M06-T14, D-222); CANONS.md 11.3: phase-programmed zig-zag rows with singularity strain sec a minus 1 and staged stiffening; the first metamaterials entry",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/phaselock/files/phaselock_sheet_v1.html lines 51 to 87 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference mechanisms/zigzag-metasheet",
  original: [
    { slug: "phaselock", file: "files/phaselock_sheet_v1.html", lines: "51 to 87", sha256: "342147d41b665ceab352020ff9a6754c15d4723152a8f51f3cd8b5b70bd1392f", record: "phaselock RECORD.md" },
  ],
});
