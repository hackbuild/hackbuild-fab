// net-check-union-find: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origNetCheckUnionFind = refusedArchetype({
  id: "net-check-union-find",
  family: "check",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "BLOCKS, PIP originals (M06-T14, D-222); CANONS.md 11.3: union-find over conductive prisms, or per-net decompose with minGap, naming OPEN and SHORT",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/blocks/files/src-extracted/kernel.js lines 366 to 394 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T13 with reference conductors/router",
  original: [
    { slug: "blocks", file: "files/src-extracted/kernel.js", lines: "366 to 394", sha256: "e514477f4a8a9f2996b8f4880fc774c07801467db9899cebcd21d03724b57188", record: "blocks RECORD.md" },
    { slug: "pip", file: "files/haft-src/src/model.js", lines: "268 to 285", sha256: "95a996433e54d586cdaa970a844ee8f8f02196f80b23ba36983c95ed456d1f34", record: "pip RECORD.md" },
  ],
});
