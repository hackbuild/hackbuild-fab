// peg-hook-rule: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origPegHookRule = refusedMechanism({
  id: "peg-hook-rule",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "COTTER originals (M06-T14, D-222); CANONS.md 11.3: round-rod peg hook with a closed-form bend radius rule and a configuration-space insertion proof (7 of 7 INSERTS, computed 2026-10-05); CANONS.md 8.3 row: substrate part source with the round-rod peg hook",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/cotter/files/cotter-src/src/geo.js GEO.hookRule lines 99 to 128 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference joints/hang-hook",
  original: [
    { slug: "cotter", file: "files/cotter-src/src/geo.js", fn: "GEO.hookRule", lines: "99 to 128", sha256: "55046403d5e27c2dafabdb526d36c0526237e4a667b997b30e61a7d977a7a7c4", record: "cotter RECORD.md" },
    { slug: "cotter", file: "files/cotter-src/tools/hook_fit.py", lines: "44 to 71", sha256: "adb0f875c932e268726076e5b5bd4b857fa06fec9f0d6bcf3ad883b4f31739cd", record: "cotter RECORD.md" },
  ],
});
