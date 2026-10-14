// keeper-rib-retainer: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origKeeperRibRetainer = refusedMechanism({
  id: "keeper-rib-retainer",
  family: "snap",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "SASH originals (M06-T14, D-222); CANONS.md 11.3: thumb tab on art-side layers runs under a cover keeper rib; the overlap prevents lift-out",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/sash/files/src/src/part2.js lines 597 to 598, 215 to 218 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference mechanisms/slider-badge",
  original: [
    { slug: "sash", file: "files/src/src/part2.js", lines: "597 to 598, 215 to 218", sha256: "536cfa371fabda52fe6fb31ff3a3c1f60969c8a9ce59f4d9f89c64e4c77f3567", record: "sash RECORD.md" },
  ],
});
