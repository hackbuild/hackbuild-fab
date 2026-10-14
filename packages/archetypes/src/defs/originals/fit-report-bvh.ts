// fit-report-bvh: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origFitReportBvh = refusedArchetype({
  id: "fit-report-bvh",
  family: "check",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "CASK originals (M06-T14, D-222); CANONS.md 11.3: BVH contact pass over the assembly with named rows",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/cask/files/cask_bench.html fitReport, meshContacts yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference cases/cask-cap",
  original: [
    { slug: "cask", file: "files/cask_bench.html", fn: "fitReport, meshContacts", sha256: "5e5b6f743e09197bb68ca0bd42608df77e32ef5082374a26cc40d642cd5e4b0d", record: "cask RECORD.md" },
  ],
});
