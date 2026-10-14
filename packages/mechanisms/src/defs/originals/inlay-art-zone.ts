// inlay-art-zone: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origInlayArtZone = refusedMechanism({
  id: "inlay-art-zone",
  family: "kind",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "COLLAR originals (M06-T14, D-222); CANONS.md 11.3: raster art zones with hygiene (boost, open, despeckle, colour gap) and face-down mirroring; the M03 inlay kind",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/collar/files/collar.html renderLayer, buildFace lines 990 to 1117 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M03-T08 (re-recorded from the original at M11-T09) with reference cosmetic/coin-inlay",
  original: [
    { slug: "collar", file: "files/collar.html", fn: "renderLayer, buildFace", lines: "990 to 1117", sha256: "ef0864ab66ca40e2930d12aba4cab3159aa470f743eee533d052fc99f844fd46", record: "collar RECORD.md" },
  ],
});
