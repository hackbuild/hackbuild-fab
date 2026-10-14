// band-kernel: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origBandKernel = refusedArchetype({
  id: "band-kernel",
  family: "kernel",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "BAFFLE-R3 originals (M06-T14, D-222); CANONS.md 11.3: CrossSections swept between layer lines with disjoint slots summing to the solid",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/baffle-r3/files/src/model.js derive, makeGeo lines from line 163 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference keys/skin-bridge-hex",
  original: [
    { slug: "baffle-r3", file: "files/src/model.js", fn: "derive, makeGeo", lines: "from line 163", sha256: "bda7af8d66f52e9dec1ba3956e2dc8e54d2dc6e62bf679b12fb5de580633636f", record: "baffle-r3 RECORD.md" },
  ],
});
