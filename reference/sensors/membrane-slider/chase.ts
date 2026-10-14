// reference/sensors/membrane-slider/chase.ts
// M06-T09: the membrane-slider-wall archetype at TANG R6 defaults (tang-r6.md
// 4.5), placed by build.ts through Author.arch on the bed: the whole neck,
// printed on its side as the original prints it (05_design.js line 159),
// in TANG's four slots. The neck's params are the archetype's defaults
// except its length, which the chase carries so an edit moves the neck.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "sensors-membrane-slider", kind: "single", name: "MEMBRANE SLIDER", version: 1, chase: 2,
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
    { id: "neck", label: "NECK", live: "commit", fields: [
      { id: "L", type: "mm", label: "length", range: [120, 250], step: 1, default: 240 },
    ] },
  ],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }],
  assertions: [],
});

export type MembraneSliderParams = ParamsOf<typeof chase>;
