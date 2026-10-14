// retainer-bayonet-hard-stop: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origRetainerBayonetHardStop = refusedMechanism({
  id: "retainer-bayonet-hard-stop",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "PINTLE originals (M06-T14, D-222); CANONS.md 11.3: three drop slots, twist channel as the hard stop, printed detent bump into a ledge dimple, no screw; CANONS.md 8.3 row: bayonet with ramp preload and detent gate",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/pintle/files/src/pintle_parts.py lines 154 to 164, 359 to 370, 449 to 475 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference joints/retainer-bayonet",
  original: [
    { slug: "pintle", file: "files/src/pintle_parts.py", lines: "154 to 164, 359 to 370, 449 to 475", sha256: "5280a22350a488e721d411504a562dec2007f421129e5f7462e055cb2b45a6b1", record: "pintle RECORD.md" },
  ],
});
