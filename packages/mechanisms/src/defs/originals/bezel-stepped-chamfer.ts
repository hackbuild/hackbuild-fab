// bezel-stepped-chamfer: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origBezelSteppedChamfer = refusedMechanism({
  id: "bezel-stepped-chamfer",
  family: "case",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "KNUCKLE, PIP originals (M06-T14, D-222); CANONS.md 11.3: Z bands with a one-layer-per-step window chamfer",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/knuckle/files/src/part4.js buildBezel lines 319 to 420 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T15 with reference cases/flip",
  original: [
    { slug: "knuckle", file: "files/src/part4.js", fn: "buildBezel", lines: "319 to 420", sha256: "7463845cf6f7b91f116aa588f14da497da81bade341763333567a2bd6930b7ab", record: "knuckle RECORD.md" },
    { slug: "pip", file: "files/haft-src/src/model.js", fn: "chamferTop", lines: "624 to 635", sha256: "95a996433e54d586cdaa970a844ee8f8f02196f80b23ba36983c95ed456d1f34", record: "pip RECORD.md" },
  ],
});
