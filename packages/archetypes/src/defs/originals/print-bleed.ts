// print-bleed: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origPrintBleed = refusedArchetype({
  id: "print-bleed",
  family: "construction",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "PIP originals (M06-T14, D-222); CANONS.md 11.3: conductive edges drawn back by bleed/2 so printed splits match the design; lifts the HAFT-only note behind D-084",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/pip/files/haft-src/src/model.js lines 26 to 29 yet, and no number is recorded, since the original was not run headless at M06-T14; the card names it proven as an option of buried-trace-stack, default 0 (M06-T09), which the registry does not hold at this tree; promotes at M06-T09 (option; default bleed 0, D-084) with reference conductors/buried-trace-stack",
  original: [
    { slug: "pip", file: "files/haft-src/src/model.js", lines: "26 to 29", sha256: "95a996433e54d586cdaa970a844ee8f8f02196f80b23ba36983c95ed456d1f34", record: "pip RECORD.md" },
  ],
});
