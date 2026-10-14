// stud-rail-anti-stud: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origStudRailAntiStud = refusedMechanism({
  id: "stud-rail-anti-stud",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "NACELLE originals (M06-T14, D-222); CANONS.md 11.3: LEGO stud rail with a fit coupon and anti-stud adapters at stud plus clearance",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/nacelle/files/scad/params.scad lego_island yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference joints/stud-rail",
  original: [
    { slug: "nacelle", file: "files/scad/params.scad", fn: "lego_island", sha256: "0e8a3e89f3f901b24f4b8c596f8b4a7a8f171c9fad5fe2affdf89cc9ab07ead6", record: "nacelle RECORD.md" },
  ],
});
