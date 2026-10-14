// membrane-slider-wall: D-096 split of seed row printed-membrane-slider (src/added.ts).
// Proven at M06-T09: the port lives in src/tang/neck.ts and regenerates
// D.buildNeck's per-slot solids and bounding boxes and its readouts
// (test/tang.parity.test.ts against test/legacy/tang.json); its reference is
// reference/sensors/membrane-slider. Senses and provenance mirror the seed;
// the limit carries the D-098 correction of src/corrections.ts, its numbers
// read back from neckDerive on the shipped rows by the test.

import { provenArchetype } from "../def.js";
import { NECK_PARAMS, neckApply, neckDerive } from "../tang/neck.js";

export const membraneSliderWall = provenArchetype({
  version: "1.0.0",
  id: "membrane-slider-wall",
  family: "printed",
  channels: 1,
  senses: ["position"],
  emits: [
    "conductor",
    "conductor",
    "contact",
    "port",
    "port",
    "port",
  ],
  read: "adc",
  limits: [
    "at the shipped rows contact takes about 0.68 N on tpu95 9.2 MPa (computed, row vendor) and the slide track is 95k on ctpu.pip.bulk 400 ohm cm (computed, row inferred); the seed's 2.2 N and 358k swinging 74 percent were computed at TPU 30 MPa and cTPU 1500 ohm cm (TANG 03_design.js line 27)",
  ],
  provenance: "TANG R6 2026-09",
  status: "proven",
  reference: ["sensors/membrane-slider"],
  original: [
    { slug: "tang-r6", file: "files/src/05_design.js", fn: "D.buildNeck", lines: "38 to 94", sha256: "36220ca1d95cef4012ee7e4d153a1afff7357cf0047773c8caafe787fd19e1c3", record: "tang-r6 4.5" },
    { slug: "tang-r6", file: "files/src/02_kernel.js", fn: "circle, arcBand, rect, rotate, stroke, union on the micron grid", lines: "10 to 76", sha256: "e4012a32c15fe0ba2b10ce95844e3e40dc461d2d1c4bec8b8c6951cde0e955a7", record: "tang-r6 4.1" },
  ],
  // The track and the deck wiper at the defaults (05_design.js lines 329 to 332): 210 mm of cTPU 11 x 0.8, 223 mm of cPLA 6 x 1.2.
  sections: [
    { id: "track", material: "ctpu", direction: "bulk", widthMm: 11, thicknessMm: 0.8, lengthMm: 210, source: "originals/tang-r6/files/src/05_design.js line 329: trackLen (xm1 - 2) - (xm0 + 2) of the condW x condT strip" },
    { id: "wiper", material: "cpla-protopasta", direction: "along", widthMm: 6, thicknessMm: 1.2, lengthMm: 223, source: "originals/tang-r6/files/src/05_design.js line 332: xm1 - 14 of the zw1 - zw0 x trackT deck strip" },
  ],
  params: NECK_PARAMS,
  derive: (p, profile) => neckDerive(p, profile),
  apply: (input) => neckApply(input, "membrane-slider-wall"),
});
