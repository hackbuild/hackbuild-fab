// bringup-probe: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origBringupProbe = refusedArchetype({
  id: "bringup-probe",
  family: "tool",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "PIP originals (M06-T14, D-222); CANONS.md 11.3: FLOAT, CAP and DRIFT modes separate key-not-pressed from pad-never-joined",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/pip/files/pip-controller/firmware/pip_probe/pip_probe.ino yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T13 with reference firmware/pip-probe",
  original: [
    { slug: "pip", file: "files/pip-controller/firmware/pip_probe/pip_probe.ino", sha256: "1716b325cbbf1d32cbe8f9be131acbe54d3e8c7c2f72de213cc0d9655893dbe3", record: "pip RECORD.md" },
  ],
});
