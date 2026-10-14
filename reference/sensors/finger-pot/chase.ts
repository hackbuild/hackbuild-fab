// reference/sensors/finger-pot/chase.ts
// M06-T09: the finger-pot archetype at the GIB original's blank state with sense finger (gib.md 4.4): a 60 x 14 mm bare printed pot, conductive TPU track and collector bus flush in a TPU body, three wire-hole pads at the near end; the fingertip is the wiper. Read: A to 3V3, B to ground, W to an ADC with the settling cap (part3.js hookup).
// build.ts places it through Author.arch on the bed; the slider is the
// whole part. GIB's slots (part2.js slots(), lines 147 to 154) at its
// default flex body: TPU body, conductive TPU conductor.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "sensors-finger-pot", kind: "single", name: "FINGER POT", version: 1, chase: 2,
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
