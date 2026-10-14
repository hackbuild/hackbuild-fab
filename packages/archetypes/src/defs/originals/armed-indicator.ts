// armed-indicator: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origArmedIndicator = refusedArchetype({
  id: "armed-indicator",
  family: "board",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "TRUNNION, SPLICE originals (M06-T14, D-222); CANONS.md 11.3: armed LED across the laser gate",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/trunnion/files/trunnion.kicad_pcb yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M08 with reference boards/trunnion",
  original: [
    { slug: "trunnion", file: "files/trunnion.kicad_pcb", sha256: "632e04b1be088d632c75fb861603f52caa163639762a0a9221af19f7325e8ac9", record: "trunnion RECORD.md" },
    { slug: "splice", file: "files/splice-c/splicec-3d.html", sha256: "11c95b6fa0f6b2402d25e4d3a1504e1b733f8e8985536602a814c211645db011", record: "splice RECORD.md" },
  ],
});
