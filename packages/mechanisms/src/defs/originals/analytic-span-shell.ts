// analytic-span-shell: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origAnalyticSpanShell = refusedMechanism({
  id: "analytic-span-shell",
  family: "case",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "PLINTH originals (M06-T14, D-222); CANONS.md 11.3: analytic edge spans, raster XY and exact Z, with corner pinch passes",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/plinth/files/plinth.html planCase, fixDiag, fixZDiag yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference cases/plinth-spans",
  original: [
    { slug: "plinth", file: "files/plinth.html", fn: "planCase, fixDiag, fixZDiag", sha256: "e19f9e647763baf7d62c23bba214ea36b21234e3a9a7f6015e12c69117259785", record: "plinth RECORD.md" },
  ],
});
