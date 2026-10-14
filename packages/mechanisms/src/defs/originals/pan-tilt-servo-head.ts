// pan-tilt-servo-head: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origPanTiltServoHead = refusedMechanism({
  id: "pan-tilt-servo-head",
  family: "machine",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "WASHER originals (M06-T14, D-222); CANONS.md 11.3: printed pan and tilt yoke head on a LEGO-footprint servo base",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/washer/files/rig/laser-rig.html lines 2519 to 2708 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M07, else M11-T09 with reference machines/pan-tilt-head",
  original: [
    { slug: "washer", file: "files/rig/laser-rig.html", lines: "2519 to 2708", sha256: "38a2c04770ba85a9afea7aa8ff4b988174d2246bb7ce8657851c5aefce411f9c", record: "washer RECORD.md" },
  ],
});
