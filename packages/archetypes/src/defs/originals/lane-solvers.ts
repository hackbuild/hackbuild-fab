// lane-solvers: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origLaneSolvers = refusedArchetype({
  id: "lane-solvers",
  family: "copper",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "TESSERA, QUADRANT, VERNIER, FRET originals (M06-T14, D-222); CANONS.md 11.3: constraint-ranked lane solver, greedy two-condition fan, travel-ranked fan, parked terminals, corridor escapes, zigzag ribbon",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/tessera/files/gen_tessera.py yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference surfaces/tessera-voronoi",
  original: [
    { slug: "tessera", file: "files/gen_tessera.py", sha256: "9eba22a9b6f862cf9fca24db15ffb4a2c1adec93eb2ce7745cf0957156f68f92", record: "tessera RECORD.md" },
    { slug: "quadrant", file: "files/gen_quadrant.py", sha256: "a6783b385d6c2e44732a072c9e9f31dd9e8aa65a2d6721ac75ddabff2efd5fcd", record: "quadrant RECORD.md" },
    { slug: "vernier", file: "files/gen_vernier.py", sha256: "ed2f18042496b51573e7d4e9542f6d328e980f3bebc2ea6315b7b76e70366ea7", record: "vernier RECORD.md" },
    { slug: "fret", file: "files/gen_fret.py", sha256: "301f6ffc2529d7193cc57fd7406e5c6da01340d1064288253dad7fa5a5507481", record: "fret RECORD.md" },
  ],
});
