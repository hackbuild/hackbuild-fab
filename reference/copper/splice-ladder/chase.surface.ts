// reference/copper/splice-ladder/chase.surface.ts
// A surface chase (D-126): read as data by readChaseSource like any
// chase.ts and built by core's surface path (core/src/commands/surface.ts,
// hbf parity), and named apart because every reference/<area>/<id>/chase.ts
// is enumerated as a part.build reference (M05-T14 card defects).
//
// The SPLICE rev C copper tape breakout read as a ladder board (M05-T14,
// D-092): its shipped cut file, reference/copper/splice-ladder/legacy/
// splice-copper.svg (lineage splice.copper/rev-c), is the design; no
// generator for it was harvested (knowledge/designs/splice.md 1). The
// params are the ladder the README states: every row on one 2.54 mm grid,
// one 1.6 mm trace width, so the gap is pitch less width, 0.94 mm. The net
// names are the key order of the bench's splice3d.json, which carries the
// same seven nets in the SVG's path order.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "copper-splice-ladder", kind: "surface", name: "SPLICE REV C", version: 1, chase: 2,
    kernels: ["geom", "copper", "profile"], machines: ["cricut"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "copper-tape", role: "conductor", label: "copper" },
  ],
  params: [
    { id: "ladder", label: "LADDER", live: "commit", fields: [
      { id: "pitch", type: "mm", label: "pitch", range: [1.27, 5.08], step: 0.01, default: 2.54, help: "one grid every row sits on" },
      { id: "width", type: "mm", label: "trace", range: [0.8, 2.4], step: 0.05, default: 1.6, help: "one trace width everywhere" },
      { id: "nets", type: "text", label: "nets", default: "SIGA 5V GND SIGB BASE1 BASE2 COL", max: 64, help: "net names in the cut file's path order" },
    ] },
  ],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "svg", machine: "cricut" }],
  assertions: [],
});

export type SpliceParams = ParamsOf<typeof chase>;
