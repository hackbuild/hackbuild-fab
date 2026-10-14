// bayonet-ramp-detent: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origBayonetRampDetent = refusedMechanism({
  id: "bayonet-ramp-detent",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "TENON, CASK originals (M06-T14, D-222); CANONS.md 11.3: bayonet with ramp preload and a detent gate; CASK keyed lugs with a lock squeeze ramp as a preset; CANONS.md 8.3 row: bayonet with ramp preload and detent gate",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/tenon/files/src/src/part2.js grooveGeom, grooveField yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T16; M11-T09 with reference joints/bayonet and cases/cask-cap",
  original: [
    { slug: "tenon", file: "files/src/src/part2.js", fn: "grooveGeom, grooveField", sha256: "ac5f68c3ac6454a3f500a2c941786090ac5fbb5436fc92b2e8155767432d8003", record: "tenon RECORD.md" },
    { slug: "cask", file: "files/cask_bench.html", fn: "lock_squeeze, sweepArc", sha256: "5e5b6f743e09197bb68ca0bd42608df77e32ef5082374a26cc40d642cd5e4b0d", record: "cask RECORD.md" },
  ],
});
