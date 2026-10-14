// cascade-slop-budget: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origCascadeSlopBudget = refusedMechanism({
  id: "cascade-slop-budget",
  family: "constraint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "TUMBLER originals (M06-T14, D-222); CANONS.md 11.3: stacked slop, depth x (kerf + fit), and the input stroke budget; carries the linear-against-doubling disagreement of mech/cascade-slop (section 3.2)",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/tumbler/files/tumbler.html evalBench yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 (covers added to the M06-T06 reference) with reference mechanisms/coincidence-and",
  original: [
    { slug: "tumbler", file: "files/tumbler.html", fn: "evalBench", sha256: "fe14c0cd07d8b10f8852317942fb86aa6ae3e30d12b60af344890e68cbc47178", record: "tumbler RECORD.md" },
  ],
});
