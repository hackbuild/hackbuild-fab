// undefined-band-verdict: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origUndefinedBandVerdict = refusedArchetype({
  id: "undefined-band-verdict",
  family: "check",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "BOSS, BLOCKS originals (M06-T14, D-222); CANONS.md 11.3: pull-up verdict in the undefined band with a vio hint",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/boss/files/boss-src/src/app2.js lines 236 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T10 (covers added to the M05 reference) with reference electrical/blocks-pullup-band",
  original: [
    { slug: "boss", file: "files/boss-src/src/app2.js", lines: "236", sha256: "698ae1233dd66e1e041532ef16573b6fcf96f398d4d8358d6ce6d253a824dce8", record: "boss RECORD.md" },
    { slug: "blocks", file: "files/src-extracted/app2.js", lines: "383", sha256: "3eeeab36a1dd9977e95cf85f43fa8b4c026c7f077f9f7bc9c2a39b42a85086bc", record: "blocks RECORD.md" },
  ],
});
