// aileron-differential: seed row of seed/mechanisms.seed.yaml.
// Registered at M06-T01; derive() ported at M06-T03 to M06-T05 in src/derive
// and held candidate by the originals rule (statusReason). Fields mirror the
// seed and the original is the
// CANONS.md 11.1 row (D-222).

import { refusedMechanism } from "../def.js";
import { AILERON_PARAMS } from "../derive/aileron.js";

export const aileronDifferential = refusedMechanism({
  id: "aileron-differential",
  family: "joint",
  dof: null,
  governs: [
    "horn sum is tilt",
    "difference is roll",
    "reach is set by the horn not the plate",
  ],
  failureModes: [],
  processes: [],
  provenance: "STANCHION 2026-08",
  status: "candidate",
  statusReason: "solveHorns regenerates the page's horn angles at its printed precision over 35 poses, tilt 10 and roll 10 giving 46.1 and 0.6 deg (test/derive.test.ts), and cad.py lines 217 to 282 run headless and regenerate the shipped yaw plate, cross, carrier and pushrod exports (test/aileron.body.test.ts), but the port cannot build those bodies: the pushrod's ball ends are trimesh icospheres, which no kernel route makes, and every route snaps to the 1/1024 mm grid that cad.py's dimensions do not sit on, so a port misses the 1e-3 mm3 volume tolerance (originals rule); promotes at M11-T09 with reference joints/aileron-differential once the kernel has a sphere route and a tolerance for snapped CSG bodies",
  params: AILERON_PARAMS,
  original: [
    { slug: "stanchion", file: "files/stanchion.html", fn: "solveHorns", lines: "291 to 331", sha256: "a955b326fd5cfeaf5f49d92a614054e5d0e050a953bd289cbac3b358c3f1ece0", record: "stanchion 5.3" },
    { slug: "stanchion", file: "files/src/cad.py", lines: "217 to 282", sha256: "4fe0bf820f885dd229901f8608cf9e4ac11a1def46bfb08afbcad212e4cefec8", record: "stanchion 5.3" },
  ],
});
