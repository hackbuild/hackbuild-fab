// reference/boards/spindle-r1/chase.ts
// M08-T06 (D-089): SPINDLE R1, the orderable 2-layer board, on the gated
// direct-emit route. gen.py is the port of the R1 generator and
// holds every board number with the legacy line it came from;
// build.ts names it, and part.build runs it through uv and reads back the
// BoardRecord it writes. Nothing is written when its DRC fails.

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "boards-spindle-r1", kind: "board", name: "SPINDLE R1", version: 1, chase: 2,
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
