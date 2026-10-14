// vinyl-substrate-module: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origVinylSubstrateModule = refusedArchetype({
  id: "vinyl-substrate-module",
  family: "copper",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "KERF-EURORACK originals (M06-T14, D-222); CANONS.md 11.3: panel plus vinyl copper substrate stack with routing rules; the DRC must catch collinear overlaps",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/kerf-eurorack/files/kerf-eurorack.html yet, and no number is recorded, since the original was not run headless at M06-T14; the card notes, not yet held by a test: DRC must catch collinear overlaps; promotes at M11-T09 with reference copper/kerf-eurorack",
  original: [
    { slug: "kerf-eurorack", file: "files/kerf-eurorack.html", sha256: "ede53b3a115717dada829a85570591b3cfe69f2598cace4d8f879f6a36d01f15", record: "kerf-eurorack RECORD.md" },
  ],
});
