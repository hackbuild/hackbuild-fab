// slide-detent-in-plane: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origSlideDetentInPlane = refusedMechanism({
  id: "slide-detent-in-plane",
  family: "memory",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "SASH originals (M06-T14, D-222); CANONS.md 11.3: slotted cantilever bump into rail notches, pushed through a 45 deg flank; SASH's 3 percent strain ceiling is recorded against D-073's 2.5 (section 10)",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/sash/files/src/src/part2.js composeSlide lines 571 to 640 yet, and no number is recorded, since the original was not run headless at M06-T14; the card notes, not yet held by a test: SASH strain ceiling 3 percent against D-073 2.5 percent: the profile limit governs, SASH kept as a legacy preset; promotes at M11-T09 with reference mechanisms/slider-badge",
  original: [
    { slug: "sash", file: "files/src/src/part2.js", fn: "composeSlide", lines: "571 to 640", sha256: "536cfa371fabda52fe6fb31ff3a3c1f60969c8a9ce59f4d9f89c64e4c77f3567", record: "sash RECORD.md" },
  ],
});
