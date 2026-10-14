// reference/sensors/membrane-slider-thinpot/chase.ts
// M06-T09: the membrane-slider-thinpot archetype at the THINPOT original's
// defaults (thinpot.md 4.5): a 100 x 12 mm printed membrane potentiometer,
// cPLA track on a PETG base and rails, three wire-hole pads at the near
// end, the TPU membrane with its cTPU collector strip printed flat beside
// the base. build.ts places it through Author.arch on the bed. Read: T1 to
// ground, T3 to 3V3, T2 to an ADC with a 100 kohm pull down (line 4201).

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "sensors-membrane-slider-thinpot", kind: "single", name: "THINPOT", version: 1, chase: 2,
    kernels: ["geom", "mesh", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "base", preview: "#F4F1EA" },
    { slot: 2, material: "cpla", role: "conductor", label: "track", preview: "#1A1A1A" },
    { slot: 3, material: "tpu95", role: "flex", label: "membrane", preview: "#FE0386" },
    { slot: 4, material: "ctpu", role: "flex-conductor", label: "collector strip", preview: "#6E6E6E" },
  ],
  params: [
    { id: "track", label: "TRACK", live: "commit", fields: [
      { id: "len", type: "mm", label: "active length", range: [20, 300], step: 1, default: 100 },
    ] },
  ],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }],
  assertions: [],
});

export type ThinpotRefParams = ParamsOf<typeof chase>;
