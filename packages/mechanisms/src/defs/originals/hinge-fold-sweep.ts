// hinge-fold-sweep: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origHingeFoldSweep = refusedMechanism({
  id: "hinge-fold-sweep",
  family: "constraint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "KNUCKLE, GUDGEON originals (M06-T14, D-222); CANONS.md 11.3: 2D swept-point test of the closing lid section against the body wall and knuckle profile; the first hit names the angle (closes the CHECKS 9.9 wait); CANONS.md 8.3 row: print-in-place knuckle hinge with continuous rod",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/knuckle/files/src/part4.js sweepCheck lines 221 to 234 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T15 with reference joints/knuckle-hinge",
  original: [
    { slug: "knuckle", file: "files/src/part4.js", fn: "sweepCheck", lines: "221 to 234", sha256: "7463845cf6f7b91f116aa588f14da497da81bade341763333567a2bd6930b7ab", record: "knuckle RECORD.md" },
    { slug: "gudgeon", file: "files/extracted/07_part2f_build.js", fn: "sweepCheck", lines: "from line 121", sha256: "f8afd1dd19741d04897f20a6717ed68e329c33a19f536a81634a3db3e4a7c46a", record: "gudgeon RECORD.md" },
  ],
});
