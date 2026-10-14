// peristaltic-three-roller: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origPeristalticThreeRoller = refusedMechanism({
  id: "peristaltic-three-roller",
  family: "fluid",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "SPARGER-W originals (M06-T14, D-222); CANONS.md 11.3: printed track on bought bearings, gap on the tube, wrap angle and volume per rev computed; the backlog peristaltic kind with a source; CANONS.md 8.3 row: peristaltic three-roller",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/sparger-w/files/source/sparger_w.py part_cup, part_lid, part_rotor lines 139 to 178 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference mechanisms/peristaltic-3-roller",
  original: [
    { slug: "sparger-w", file: "files/source/sparger_w.py", fn: "part_cup, part_lid, part_rotor", lines: "139 to 178", sha256: "29f6956f1ae802f05cf78d02e2dd9da9848ab8a2be8f56b754d106f7e085a893", record: "sparger-w RECORD.md" },
  ],
});
