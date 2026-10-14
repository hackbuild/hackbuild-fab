// interval-gate: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origIntervalGate = refusedArchetype({
  id: "interval-gate",
  family: "check",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "FRET originals (M06-T14, D-222); CANONS.md 11.3: isomorphic lattice basis plus an interval-per-move gate",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/fret/files/gen_fret.py yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 (covers added) with reference surfaces/fret-hex",
  original: [
    { slug: "fret", file: "files/gen_fret.py", sha256: "301f6ffc2529d7193cc57fd7406e5c6da01340d1064288253dad7fa5a5507481", record: "fret RECORD.md" },
  ],
});
