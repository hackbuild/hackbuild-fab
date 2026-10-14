// sealed-pocket-pause: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origSealedPocketPause = refusedMechanism({
  id: "sealed-pocket-pause",
  family: "kind",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "COLLAR, SASH originals (M06-T14, D-222); CANONS.md 11.3: sealed insert pocket snapped to layers with a computed pause layer; the SASH and COLLAR pause conventions differ (section 10)",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/collar/files/collar.html lines 746 to 751, 1208 yet, and no number is recorded, since the original was not run headless at M06-T14; the card notes, not yet held by a test: pause convention mismatch recorded; promotes at M11-T06 with reference kinds/sealed-pocket",
  original: [
    { slug: "collar", file: "files/collar.html", lines: "746 to 751, 1208", sha256: "ef0864ab66ca40e2930d12aba4cab3159aa470f743eee533d052fc99f844fd46", record: "collar RECORD.md" },
    { slug: "sash", file: "files/src/src/part2.js", lines: "854", sha256: "536cfa371fabda52fe6fb31ff3a3c1f60969c8a9ce59f4d9f89c64e4c77f3567", record: "sash RECORD.md" },
  ],
});
