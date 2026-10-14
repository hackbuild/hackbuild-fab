// snap-finger-collar: D-096 addition (src/added.ts).
// Registered at M06-T01; fields mirror the seed and the original is the
// CANONS.md 11.1 row (D-222).

import { refusedMechanism } from "../def.js";

export const snapFingerCollar = refusedMechanism({
  id: "snap-finger-collar",
  family: "snap",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "LOCKET R2 build.py build_faceplate (D-096)",
  status: "candidate",
  statusReason: "D-096 addition; derive() golden at M06-T05; promotion waits for a snap kind reference (D-058)",
  original: [
    { slug: "locket", file: "files/src/build.py", fn: "build_faceplate", sha256: "20ad46eead8132a69f69ec3d9142d1ded7ef1e5e3255acc7b61d4e8de96eb90b", record: "locket 5.4" },
  ],
});
