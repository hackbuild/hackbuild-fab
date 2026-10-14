// scan-six-pads: seed row of seed/archetypes.seed.yaml.
// Registered at M06-T01. Senses, emits, limits and provenance mirror the
// seed; read and channels are the CANONS.md 4.1 working values that M06-T07
// confirms against the original named below (D-222).

import { refusedArchetype } from "../def.js";

export const scanSixPads = refusedArchetype({
  id: "scan-six-pads",
  family: "printed-or-copper",
  channels: 7,
  senses: ["force x6"],
  emits: [
    "conductor",
    "conductor",
    "conductor",
    "conductor",
    "conductor",
    "conductor",
    "conductor",
    "port",
    "port",
    "port",
    "port",
    "port",
    "port",
    "port",
  ],
  read: "column-scan",
  limits: [
    "a row/column matrix does not work here because sense groups by row but COM cannot group by column single-layer",
  ],
  provenance: "TANG R5.26 2026-08",
  status: "candidate",
  statusReason: "not ported: the R5 comb art (tang_r5_13_core.js comb(), lines 352 to 422) is built as THREE.Shape paths inside buildParts(THREE) and the scan read lives in DIMENSIONS.txt and the sim Wiring text; no headless record of the original exists yet and the copper art has no port; promotes in M11-T09 with reference/sensors/scan-six-pads (M06-T09 build notes)",
  original: [
    { slug: "tang-r5", file: "files/src/tang_r5_13_core.js", lines: "from 352", sha256: "f9f9175822238448164e7a173266c0a9c82f6c5a6faef70f29a3783212f2b39c", record: "tang-r5 4.4" },
    { slug: "tang-r5", file: "files/src/tang_r5_circuit_data.js", sha256: "9062dec42dedb6cc311238a71627c8da1deee8c57af481b1dd76b1eda9308e76", record: "tang-r5 4.4" },
  ],
});
