// fits-table: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origFitsTable = refusedArchetype({
  id: "fits-table",
  family: "check",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "PIP, OGEE16 originals (M06-T14, D-222); CANONS.md 11.3: fits with plain-word notes feeding warnings and CHECK marks; the as-printed convex and concave model",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/pip/files/haft-src/src/model.js lines 510 to 611 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 (covers added) with reference coupons/fit-gauge",
  original: [
    { slug: "pip", file: "files/haft-src/src/model.js", lines: "510 to 611", sha256: "95a996433e54d586cdaa970a844ee8f8f02196f80b23ba36983c95ed456d1f34", record: "pip RECORD.md" },
    { slug: "ogee16", file: "files/src/source/fits.py", sha256: "b127b99ecef2d5b6b9256507c206e79975b418d91e2dce5921cefbd9595f082c", record: "ogee16 RECORD.md" },
  ],
});
