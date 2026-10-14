// two-mirror-scanner: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origTwoMirrorScanner = refusedMechanism({
  id: "two-mirror-scanner",
  family: "machine",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "DETENT originals (M06-T14, D-222); CANONS.md 11.3: 28BYJ-48 two-mirror layout with a through-wall front-driven mount, mirror hub notch press, firmware queue",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/detent/files/revD/detent_parts.py lines 93 to 179 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M07, else M11-T09 with reference machines/two-mirror-scanner",
  original: [
    { slug: "detent", file: "files/revD/detent_parts.py", lines: "93 to 179", sha256: "e72c2e26019f62122436ae1802fdce6c8ca08de74fd979e5327b0dbece3943d7", record: "detent RECORD.md" },
    { slug: "detent", file: "files/beam/detent_firmware.ino", sha256: "4de1e3105c4f45f258cfd5d05fe01126d5e901d33633f54a5beeb820315cd4c2", record: "detent RECORD.md" },
  ],
});
