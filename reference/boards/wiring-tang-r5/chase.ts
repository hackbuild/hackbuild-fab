// reference/boards/wiring-tang-r5/chase.ts
// M08-T13 wiring parity (the owner picked TANG R5): the TANG R5 wiring of
// a Teensy 4.0 (knowledge/designs/tang-r5.md section 4.9a; original
// tang_r5_wiring.html, 2026-08-21). build.ts declares the pin map the
// original's net list states; core draws it from the teensy40-pjrc
// catalog row (PJRC pinout card and dimension drawing, vendor).

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "boards-wiring-tang-r5", kind: "board", name: "TANG R5 WIRING", version: 1, chase: 2,
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
