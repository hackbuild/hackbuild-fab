// dielectric-faceplate: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origDielectricFaceplate = refusedArchetype({
  id: "dielectric-faceplate",
  family: "copper",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "VERNIER originals (M06-T14, D-222); CANONS.md 11.3: vinyl dielectric faceplate with windows and overhang (CHK-NET-09 faceplate mode)",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/vernier/files/gen_vernier.py face_win yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference surfaces/vernier-pad",
  original: [
    { slug: "vernier", file: "files/gen_vernier.py", fn: "face_win", sha256: "ed2f18042496b51573e7d4e9542f6d328e980f3bebc2ea6315b7b76e70366ea7", record: "vernier RECORD.md" },
  ],
});
