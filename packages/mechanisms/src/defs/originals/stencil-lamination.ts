// stencil-lamination: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origStencilLamination = refusedMechanism({
  id: "stencil-lamination",
  family: "kerf",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "GUSSET originals (M06-T14, D-222); CANONS.md 11.3: a cut-through upper layer reveals the painted lower layer; the two-piece mark as applique",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/gusset/files/gusset-v16.html tableModel lines 284 to 309 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference sheet/egg-crate-table",
  original: [
    { slug: "gusset", file: "files/gusset-v16.html", fn: "tableModel", lines: "284 to 309", sha256: "a29d4f27b07376941230d21638b989f8ce5698ce0ec3ac2c04f2177e24b8ed97", record: "gusset RECORD.md" },
  ],
});
