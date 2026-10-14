// mask-art-pour-backed: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origMaskArtPourBacked = refusedArchetype({
  id: "mask-art-pour-backed",
  family: "board",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "TACK originals (M06-T14, D-222); CANONS.md 11.3: logo as a mask opening over a pour, gated as backed",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/tack/files/tack-rev-a.zip rev-a/pin.py lines 268 to 295 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M08 with reference boards/tack-pin",
  original: [
    { slug: "tack", file: "files/tack-rev-a.zip", fn: "rev-a/pin.py", lines: "268 to 295", sha256: "069f16b8de66b0413e4693d22fffcc43e99004bd057021de7fed9f13f75ecb90", record: "tack RECORD.md" },
  ],
});
