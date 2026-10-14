// read-rc-charge-time: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origReadRcChargeTime = refusedArchetype({
  id: "read-rc-charge-time",
  family: "read-model",
  channels: null,
  senses: [],
  emits: [],
  read: "rc-time",
  limits: [],
  provenance: "TANG-R6 originals (M06-T14, D-222); CANONS.md 11.3: RC charge time with ARM_DWT cycles against a baseline; folds into charge-release or registers beside it",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/tang-r6/files/src/04_design.js padTime lines 137 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 (covers added) with reference electrical/charge-release",
  original: [
    { slug: "tang-r6", file: "files/src/04_design.js", fn: "padTime", lines: "137", sha256: "43893788df778791f8f309ee1253addfb0248dc9f5fd42495f8809cf8d0ceef0", record: "tang-r6 RECORD.md" },
  ],
});
