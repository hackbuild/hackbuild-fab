// knuckle-hinge-continuous-rod: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origKnuckleHingeContinuousRod = refusedMechanism({
  id: "knuckle-hinge-continuous-rod",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "KNUCKLE, GUDGEON, LOCKET originals (M06-T14, D-222); CANONS.md 11.3: print-in-place knuckle hinge: alternating knuckles with a parity swap, one flatted rod anchored in every lid knuckle through base bores, with the rod-bridge warning; CANONS.md 8.3 row: print-in-place knuckle hinge with continuous rod",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/knuckle/files/src/part4.js buildHinge lines 189 to 219 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T15 with reference joints/knuckle-hinge",
  original: [
    { slug: "knuckle", file: "files/src/part4.js", fn: "buildHinge", lines: "189 to 219", sha256: "7463845cf6f7b91f116aa588f14da497da81bade341763333567a2bd6930b7ab", record: "knuckle RECORD.md" },
    { slug: "gudgeon", file: "files/extracted/03_part2b_kernel.js", fn: "K.knuckle", lines: "153", sha256: "f8b55433db56cf8d3f607e42bcee8935232d4bdfc6158984cda178a1d797bb3d", record: "gudgeon RECORD.md" },
    { slug: "locket", file: "files/src/build.py", fn: "knuck", sha256: "20ad46eead8132a69f69ec3d9142d1ded7ef1e5e3255acc7b61d4e8de96eb90b", record: "locket RECORD.md" },
  ],
});
