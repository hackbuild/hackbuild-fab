// bowtie-clamshell-pipe-clamp: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origBowtieClamshellPipeClamp = refusedMechanism({
  id: "bowtie-clamshell-pipe-clamp",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "JIB originals (M06-T14, D-222); CANONS.md 11.3: rotate-extruded half shells with parting gaps, crush ribs and bowtie keys",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/jib/files/jib_mount.scad yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference joints/bowtie-pipe-clamp",
  original: [
    { slug: "jib", file: "files/jib_mount.scad", sha256: "8bd722f8ecc6af0db6e88da6bd4a6c79a30e60ec2ecd588508b8118c1529daf8", record: "jib RECORD.md" },
  ],
});
