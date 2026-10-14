// firmware-scan-guard: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origFirmwareScanGuard = refusedArchetype({
  id: "firmware-scan-guard",
  family: "firmware",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "PIP originals (M06-T14, D-222); CANONS.md 11.3: Joystick HID scan with GUARD_US and the measured key wait; the generator emits both",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/pip/files/pip-controller/firmware/pip/pip.ino lines 63 to 81 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T13 with reference firmware/pip-scan",
  original: [
    { slug: "pip", file: "files/pip-controller/firmware/pip/pip.ino", lines: "63 to 81", sha256: "1a117eec10d86abe85021e221b09868e477a98f34589df191591fbcf0040f15d", record: "pip RECORD.md" },
    { slug: "pip", file: "files/haft-src/bench/part2.js", fn: "firmware()", lines: "206 to 339", sha256: "3cfd6521d6713b7c27a80da5561405b7ec00a758acd750b06eb449a702a4a21c", record: "pip RECORD.md" },
  ],
});
