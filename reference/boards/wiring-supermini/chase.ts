// reference/boards/wiring-supermini/chase.ts
// M08-T13: the wiring drawing of the SPINDLE R1 module, an ESP32-C3
// SuperMini with its 14 used pads (SPINDLE README pin map). build.ts names
// the catalog row and the pin use; core reads every pad position from the
// row through catalog.pins and draws it with packages/wiring. The only
// export is the drawing, which asks no person (fabrication false).

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "boards-wiring-supermini", kind: "board", name: "SUPERMINI WIRING", version: 1, chase: 2,
    kernels: ["board"], machines: [],
    license: "CERN-OHL-W-2.0",
  },
  materials: [],
  params: [],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "wiring" }],
  assertions: [],
});
