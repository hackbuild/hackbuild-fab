// screen-bay-round: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origScreenBayRound = refusedMechanism({
  id: "screen-bay-round",
  family: "case",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "GUDGEON originals (M06-T14, D-222); CANONS.md 11.3: GC9A01 module collar, M2 bosses, lid window, wire passes over the hinge",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/gudgeon/files/extracted/07_part2f_build.js yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference cases/gudgeon-clamshell",
  original: [
    { slug: "gudgeon", file: "files/extracted/07_part2f_build.js", sha256: "f8afd1dd19741d04897f20a6717ed68e329c33a19f536a81634a3db3e4a7c46a", record: "gudgeon RECORD.md" },
    { slug: "gudgeon", file: "files/extracted/04_part2c_state.js", fn: "geom()", sha256: "ef7045d6a556594f205a51c3b50eae985e810ca40731fddd5e5a4306a26a89fd", record: "gudgeon RECORD.md" },
  ],
});
