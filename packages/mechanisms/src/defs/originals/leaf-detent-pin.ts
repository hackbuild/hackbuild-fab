// leaf-detent-pin: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origLeafDetentPin = refusedMechanism({
  id: "leaf-detent-pin",
  family: "memory",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "TAPPET originals (M06-T14, D-222); CANONS.md 11.3: printed leaf-spring detent riding a grooved pin with a computed detent curve and axial breakaway; CANONS.md 8.3 row: pivot-averaging coincidence display",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/tappet/files/tappet-r3.html LEAF_L, LEAF_T, LEAF_W, LAND, RAMP yet, and no number is recorded, since the original was not run headless at M06-T14; the card notes, not yet held by a test: lineage tier; promotes at M11-T09 with reference mechanisms/leaf-detent-pin",
  original: [
    { slug: "tappet", file: "files/tappet-r3.html", fn: "LEAF_L, LEAF_T, LEAF_W, LAND, RAMP", sha256: "f321a1772ee597bb71abc53258fbb4bb5c9d99afa97c9b70b82ded0ad6e84a06", record: "tappet RECORD.md" },
  ],
});
