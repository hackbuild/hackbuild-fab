// typed-mount-interface: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origTypedMountInterface = refusedMechanism({
  id: "typed-mount-interface",
  family: "interface",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "SPOOL, DERRICK, STANCHION originals (M06-T14, D-222); CANONS.md 11.3: mount kinds with quarter-turn symmetry and handedness; landing plate under the bolt circles check",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/spool/files/src/spool_parts.py lines 46, 75 to 84 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T06 (covers added) with reference joints/saddle-yoke",
  original: [
    { slug: "spool", file: "files/src/spool_parts.py", lines: "46, 75 to 84", sha256: "56176ce99411e75b2ca9e87132c208ec8e86b06b65c05cc3c75bd8fab54fd95f", record: "spool RECORD.md" },
    { slug: "derrick", file: "files/src/arm_build.py", sha256: "204cc173ccaba951a7b690cb029b2ba3a9dcf3600516098bd0e0dee0e623e467", record: "derrick RECORD.md" },
    { slug: "stanchion", file: "files/src/cad.py", lines: "93 to 110", sha256: "4fe0bf820f885dd229901f8608cf9e4ac11a1def46bfb08afbcad212e4cefec8", record: "stanchion RECORD.md" },
  ],
});
