// copper-ladder-route: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origCopperLadderRoute = refusedArchetype({
  id: "copper-ladder-route",
  family: "copper",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "SPLICE originals (M06-T14, D-222); CANONS.md 11.3: every row on one 2.54 ladder, orthogonal or 45 only, single width; weedability by erosion",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/splice/files/splice-c/splicec-3d.html geo yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference copper/splice-c",
  original: [
    { slug: "splice", file: "files/splice-c/splicec-3d.html", fn: "geo", sha256: "11c95b6fa0f6b2402d25e4d3a1504e1b733f8e8985536602a814c211645db011", record: "splice RECORD.md" },
  ],
});
