// reference/sensors/rotary-pot/chase.ts
// M06-T09: the printed-rotary-pot archetype at TANG R6 defaults (tang-r6.md
// 4.4), placed by build.ts through Author.arch on the underside of a PLA
// face plate one TANG face thick (13 layers, D.faceStack), printed pad side
// down as the original prints its face (05_design.js line 158), so the
// tracks lie in the top three layers and the stop block stands on top. The
// rotor prints flat beside the plate. Clip pads sit at the three ends the
// archetype reports: the 3V3 and GND stub ends and the wiper lead end.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "sensors-rotary-pot", kind: "single", name: "ROTARY POT", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  // TANG R6's four slots (03_design.js lines 7 to 13; cPLA is Proto-pasta, line 30).
  materials: [
    { slot: 1, material: "pla", role: "body", label: "PLA", preview: "#F5F0E6" },
    { slot: 2, material: "cpla-protopasta", role: "conductor", label: "conductive PLA", preview: "#1A1A1A" },
    { slot: 3, material: "tpu95", role: "flex", label: "TPU 95A", preview: "#FE0386" },
    { slot: 4, material: "ctpu", role: "flex-conductor", label: "conductive TPU", preview: "#3A3A3A" },
  ],
  params: [
    { id: "plate", label: "PLATE", live: "commit", fields: [
      { id: "W", type: "mm", label: "width", range: [34, 60], step: 1, default: 36 },
      { id: "H", type: "mm", label: "depth", range: [36, 60], step: 1, default: 40 },
    ] },
  ],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }],
  assertions: [],
});

export type RotaryPotParams = ParamsOf<typeof chase>;
