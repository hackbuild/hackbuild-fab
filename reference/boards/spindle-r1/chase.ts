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
  // D-249: R1 as shipped shorts 5V to GND on B.Cu, the 5V bottom trace at
  // y 20.00 (pcb.py lines 184 to 185) through the GND vias at x 9.80,
  // 16.00, 30.60 and 36.20 (lines 197 to 200). This reference keeps the
  // shipped board as the fixture that proves CHK-BRD-21 catches the short:
  // the finding passes only while the measured short set is exactly this
  // pair. reference/boards/spindle-r2 is the board without the short.
  expect: [
    { check: "CHK-BRD-21", target: "spindle-r1", verdict: "fail", set: ["5V|GND"] },
  ],
});
