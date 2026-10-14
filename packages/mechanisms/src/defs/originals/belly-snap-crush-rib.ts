// belly-snap-crush-rib: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origBellySnapCrushRib = refusedMechanism({
  id: "belly-snap-crush-rib",
  family: "snap",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "PINTLE originals (M06-T14, D-222); CANONS.md 11.3: ramped ledges on flex strips plus a crush rib clamp a servo on its shelf",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/pintle/files/src/pintle_parts.py lines 171 to 174, 371 to 376, 479 to 502 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference snaps/belly-snap",
  original: [
    { slug: "pintle", file: "files/src/pintle_parts.py", lines: "171 to 174, 371 to 376, 479 to 502", sha256: "5280a22350a488e721d411504a562dec2007f421129e5f7462e055cb2b45a6b1", record: "pintle RECORD.md" },
  ],
});
