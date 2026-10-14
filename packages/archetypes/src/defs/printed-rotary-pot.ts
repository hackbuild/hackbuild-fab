// printed-rotary-pot: seed row of seed/archetypes.seed.yaml.
// Proven at M06-T09 on its TANG R6 preset: the port lives in src/tang/pot.ts
// and regenerates one pot's L1 tracks, stop block, rotor and cap, per slot
// solid and bounding box, and the readouts (test/tang.parity.test.ts against
// test/legacy/tang.json); its reference is reference/sensors/rotary-pot. The
// FEELER wiper preset (feeler-wiper) stays a candidate until its own legacy
// record exists. Senses, emits and provenance mirror the seed; the first
// limit carries the D-098 arc correction of src/corrections.ts, its
// numbers read back from potDerive on the shipped rows by the test.

import { provenArchetype } from "../def.js";
import { POT_PARAMS, potApply, potDerive } from "../tang/pot.js";

export const printedRotaryPot = provenArchetype({
  version: "1.0.0",
  id: "printed-rotary-pot",
  family: "printed",
  channels: 1,
  senses: ["angle"],
  emits: [
    "conductor",
    "conductor",
    "conductor",
    "contact",
    "pocket",
    "port",
    "port",
    "port",
  ],
  read: "adc",
  limits: [
    "at the shipped rows the cTPU arc is 189k on ctpu.pip.bulk 400 ohm cm (computed, row inferred) and a cPLA arc 14k on cpla-protopasta.xy 30 ohm cm (computed, row vendor); the seed's cPLA 14k swinging 10 percent against 40k of printed leads and cTPU 709k swinging 73 were computed at Protopasta 30 and cTPU 1500 ohm cm (TANG 03_design.js line 27); a rigid wiper scratches the track",
    "the arm must be a leaf spring; wear not drift is the lifetime limit; all three terminals out of one end is impossible single-layer for a LINEAR pot",
  ],
  provenance: "TANG R6 2026-09, STYLUS 2026-08",
  status: "proven",
  reference: ["sensors/rotary-pot"],
  // The seed's arc on the section the seed assumed: arc_r 6.5 over 300 deg,
  // 1.0 x 0.72 (seed row params, M06-T07 load golden). The seed's 14k and
  // 709k were this section at Protopasta 30 and cTPU 1500 (seed, computed);
  // the resistance is computed at load from the rows in force.
  sections: [
    { id: "arc", material: "ctpu", direction: "along", widthMm: 1.0, thicknessMm: 0.72, lengthMm: (6.5 * 300 * Math.PI) / 180, source: "seed/archetypes.seed.yaml printed-rotary-pot params arc_r 6.5, sweep 300 deg; section 1.0 x 0.72 as the seed assumed" },
  ],
  original: [
    { slug: "tang-r6", file: "files/src/04_design.js", fn: "pot tracks, stop blocks", lines: "194 to 231, 369 to 374, 413 to 420, 443", sha256: "43893788df778791f8f309ee1253addfb0248dc9f5fd42495f8809cf8d0ceef0", record: "tang-r6 4.4" },
    { slug: "tang-r6", file: "files/src/05_design.js", fn: "D.buildRotor, D.buildCap, rotor checks", lines: "97 to 135, 258 to 267, 299 to 301", sha256: "36220ca1d95cef4012ee7e4d153a1afff7357cf0047773c8caafe787fd19e1c3", record: "tang-r6 4.4" },
    { slug: "tang-r6", file: "files/src/02_kernel.js", fn: "circle, arcBand, rect, rotate, stroke, union on the micron grid", lines: "10 to 76", sha256: "e4012a32c15fe0ba2b10ce95844e3e40dc461d2d1c4bec8b8c6951cde0e955a7", record: "tang-r6 4.1" },
  ],
  params: POT_PARAMS,
  derive: (p, profile) => potDerive(p, profile),
  apply: (input) => potApply(input, "printed-rotary-pot"),
});
