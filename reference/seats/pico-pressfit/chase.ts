// reference/seats/pico-pressfit/chase.ts
// The pico-seat archetype (D-667): PIP's press seat with bump contacts
// (pip.md 5.7) holding a Raspberry Pi Pico, placed by build.ts through
// Author.arch on a PETG body with PIP's buried stack (profile stack rows),
// the body's +y edge on the seat's cable edge. Pins are the archetype's
// default map: GND, 3V3 and four keys on GPIO2 to GPIO5. A body top of 0
// leaves the top to the seat, its pocket need snapped up a layer.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "seats-pico-pressfit", kind: "single", name: "PICO PRESS SEAT", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  // PIP's first two slots (layout.js lines 47 to 52); the seat uses PETG and cPLA.
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
    { slot: 2, material: "cpla", role: "conductor", label: "traces", preview: "#1A1A1A" },
  ],
  params: [
    { id: "body", label: "BODY", live: "commit", fields: [
      { id: "W", type: "mm", label: "width", range: [28, 80], step: 1, default: 32 },
      { id: "H", type: "mm", label: "depth", range: [58, 100], step: 1, default: 62 },
      { id: "top", type: "mm", label: "body top", range: [0, 20], step: 0.24, default: 0,
        help: "0 takes the seat's pocket need snapped up a layer" },
    ] },
  ],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }],
  assertions: [],
});

export type PicoSeatRefParams = ParamsOf<typeof chase>;
