// magnet-pocket: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origMagnetPocket = refusedMechanism({
  id: "magnet-pocket",
  family: "fit",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "SASH, KNUCKLE originals (M06-T14, D-222); CANONS.md 11.3: disc magnet pockets, glued open-back or sealed with skins and a pause layer",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/sash/files/src/src/part2.js magnetPositions lines 246 to 254 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T15 with reference joints/magnet-pocket",
  original: [
    { slug: "sash", file: "files/src/src/part2.js", fn: "magnetPositions", lines: "246 to 254", sha256: "536cfa371fabda52fe6fb31ff3a3c1f60969c8a9ce59f4d9f89c64e4c77f3567", record: "sash RECORD.md" },
    { slug: "knuckle", file: "files/src/part4.js", fn: "buildBezel, buildFlip", sha256: "7463845cf6f7b91f116aa588f14da497da81bade341763333567a2bd6930b7ab", record: "knuckle RECORD.md" },
  ],
});
