// jacquard-griffe-select: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origJacquardGriffeSelect = refusedMechanism({
  id: "jacquard-griffe-select",
  family: "intermittent",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "TAPPET originals (M06-T14, D-222); CANONS.md 11.3: row and column slit plates push unselected hooks aside and the knife lifts the one left; CANONS.md 8.3 row: pivot-averaging coincidence display",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/tappet/files/tappet-r3.html physStep yet, and no number is recorded, since the original was not run headless at M06-T14; the card notes, not yet held by a test: lineage tier; promotes at M11-T09 with reference mechanisms/leaf-detent-pin",
  original: [
    { slug: "tappet", file: "files/tappet-r3.html", fn: "physStep", sha256: "f321a1772ee597bb71abc53258fbb4bb5c9d99afa97c9b70b82ded0ad6e84a06", record: "tappet RECORD.md" },
  ],
});
