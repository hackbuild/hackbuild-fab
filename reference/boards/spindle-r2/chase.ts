// reference/boards/spindle-r2/chase.ts
// D-249: SPINDLE R2, SPINDLE R1 less the four GND vias on its 5V bottom
// trace, on the gated direct-emit route. gen.py is a copy of the R1 port
// with those vias gone and the silk revision, drill headers and zip name
// at R2; build.ts names it, and part.build runs it through uv and reads
// back the BoardRecord it writes. Nothing is written when its DRC fails.
// reference/boards/spindle-r1 keeps the shipped R1 and its short.

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "boards-spindle-r2", kind: "board", name: "SPINDLE R2", version: 1, chase: 2,
    kernels: ["board"], machines: [],
    license: "CERN-OHL-W-2.0",
  },
  materials: [],
  params: [],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "gerbers" }, { kind: "kicad" }],
  assertions: [],
});
