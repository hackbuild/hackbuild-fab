// snap-c-socket-lip: D-096 addition (src/added.ts).
// Registered at M06-T01; fields mirror the seed and the original is the
// CANONS.md 11.1 row (D-222).

import { refusedMechanism } from "../def.js";

export const snapCSocketLip = refusedMechanism({
  id: "snap-c-socket-lip",
  family: "snap",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "SLATE build of 2026-09-04, slate-src.zip (D-096)",
  status: "candidate",
  statusReason: "D-096 addition; derive() golden at M06-T05; promotion waits for a snap kind reference (D-058)",
  original: [
    { slug: "slate", file: "files/precursor-sep04/slate-src.zip", sha256: "4a00f919e89b0819e52d656e98183d4bbbadbf9eafa4ef0c54dcba9e7bc0cd3e", record: "slate 5.7" },
  ],
});
