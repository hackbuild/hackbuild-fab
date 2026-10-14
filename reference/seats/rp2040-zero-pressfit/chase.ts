// reference/seats/rp2040-zero-pressfit/chase.ts
// M06-T09: the rp2040-zero-seat archetype in press mode with bump contacts
// at PIP defaults (pip.md 5.7), placed by build.ts through Author.arch on a
// PETG body with PIP's buried stack (profile stack rows) whose cable edge
// sits usbOver past the board's USB end, as PIP places the board. The body
// top is PIP's default 13.68 mm (computed by PIP's layout from its click
// spring need, layout.js lines 223 to 231), so the USB opening and every
// pocket depth equal the original's at its defaults. Pins are PIP's
// default map (layout.js line 44) with GND and 3V3.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "seats-rp2040-zero-pressfit", kind: "single", name: "RP2040-ZERO PRESS SEAT", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  // PIP's four slots (layout.js lines 47 to 52); the seat uses PETG and cPLA.
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
    { slot: 2, material: "cpla", role: "conductor", label: "traces", preview: "#1A1A1A" },
  ],
  params: [
    { id: "body", label: "BODY", live: "commit", fields: [
      { id: "W", type: "mm", label: "width", range: [24, 60], step: 1, default: 30 },
      { id: "H", type: "mm", label: "depth", range: [30, 60], step: 1, default: 34 },
      { id: "top", type: "mm", label: "body top", range: [9.84, 20], step: 0.24, default: 13.68 },
    ] },
  ],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }],
  assertions: [],
});

export type SeatParams = ParamsOf<typeof chase>;
