// barrel-hinge-d-pin: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origBarrelHingeDPin = refusedMechanism({
  id: "barrel-hinge-d-pin",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "SLATE originals (M06-T14, D-222); CANONS.md 11.3: three knuckle barrel hinge with a printed D pin printed on its flat, barbs into recesses; CANONS.md 8.3 row: barrel hinge with printed D pin",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/slate/files/slate-r6.html ST.hinge, knuckleHalves, tearUp yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference joints/barrel-hinge",
  original: [
    { slug: "slate", file: "files/slate-r6.html", fn: "ST.hinge, knuckleHalves, tearUp", sha256: "0d34c2e15886c0b94084821847e23e3b2d3f7b6cbed101ca58fed8425932d92a", record: "slate RECORD.md" },
  ],
});
