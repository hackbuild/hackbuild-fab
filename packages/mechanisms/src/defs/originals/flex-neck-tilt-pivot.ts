// flex-neck-tilt-pivot: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origFlexNeckTiltPivot = refusedMechanism({
  id: "flex-neck-tilt-pivot",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "TOGGLE originals (M06-T14, D-222); CANONS.md 11.3: TPU neck as spring and pivot with a solved gate stop per azimuth and the contact patch model; the mechanism side of tilt-stick, with a stem stress check added",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/toggle/files/src/src/part2d.js lines 394 to 414 yet, and no number is recorded, since the original was not run headless at M06-T14; the card names it typed with the TOGGLE preset of tilt-stick (M06-T09), which the registry does not hold at this tree; the card notes, not yet held by a test: adds a stem stress check: 54.8 MPa computed at the TOGGLE defaults, against no check today; promotes at M06-T09 with reference sticks/tilt-stick-4",
  original: [
    { slug: "toggle", file: "files/src/src/part2d.js", lines: "394 to 414", sha256: "1da486e757df5334a0a920dd40cb54ef1d9780a39ffec7c4c919b3635f951523", record: "toggle RECORD.md" },
    { slug: "toggle", file: "files/src/src/part2b.js", lines: "10 to 255", sha256: "c8acaba6c3ff3acffb63b7496c8398076b1ae4fa4ebbbcecfdd0da57289d6c02", record: "toggle RECORD.md" },
  ],
});
