// reference/sensors/membrane-slider-gib/chase.ts
// M06-T09: the membrane-slider-gib archetype at the GIB original's blank state with sense membrane (gib.md 4.5): a 60 x 14 mm pressed pot, conductive TPU track, return and collector post in a TPU body, the TPU membrane with its conductive wiper strip flipped and laid beside the body as the export lays it. Read: A to 3V3, B to ground, W to an ADC with a pull down of at least 1 Mohm and 100 nF.
// build.ts places it through Author.arch on the bed; the slider is the
// whole part. GIB's slots (part2.js slots(), lines 147 to 154) at its
// default flex body: TPU body, conductive TPU conductor.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "sensors-membrane-slider-gib", kind: "single", name: "GIB MEMBRANE", version: 1, chase: 2,
    kernels: ["geom", "mesh", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "tpu95", role: "body", label: "body", preview: "#1A1A1A" },
    { slot: 2, material: "ctpu", role: "flex-conductor", label: "conductor", preview: "#4A4A4A" },
  ],
  params: [
    { id: "slider", label: "SLIDER", live: "commit", fields: [
      { id: "L", type: "mm", label: "length", range: [20, 200], step: 0.5, default: 60 },
    ] },
  ],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }],
  assertions: [],
});

export type SliderParams = ParamsOf<typeof chase>;
