// device-drive-safety: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origDeviceDriveSafety = refusedMechanism({
  id: "device-drive-safety",
  family: "device",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "SPROCKET originals (M06-T14, D-222); CANONS.md 11.3: arcade and tank mixes, dead-man with heartbeat, disarmed at boot, stop on disconnect",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/sprocket/files/sprocket_fw/sprocket_fw.ino lines 51 to 115, 330 to 378 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference devices/sprocket-drive",
  original: [
    { slug: "sprocket", file: "files/sprocket_fw/sprocket_fw.ino", lines: "51 to 115, 330 to 378", sha256: "a6e63caf887af18ffe8639dad3776d62b5461dce4c925a99c2486d82f187317e", record: "sprocket RECORD.md" },
  ],
});
