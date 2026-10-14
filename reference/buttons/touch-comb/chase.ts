// reference/buttons/touch-comb/chase.ts
// M06-T09: the touch-comb-key archetype at PIP defaults (pip.md 5.3), placed by build.ts through Author.arch on a minimal PETG body
// with PIP's buried stack (skin 0.72, trace 0.72, iso 0.96, pad 0.72,
// profile stack rows) and two buried nets to edge clip pads. The key's
// own params are the archetype's defaults; the chase declares only the
// body and the leads. The read is charge-release with a 1500 us wait (pip.ino line 21,
// layout.js line 46), carried by the firmware stub, not by a hookup row.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "buttons-touch-comb", kind: "single", name: "TOUCH COMB", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  // PIP's four slots (layout.js lines 47 to 52).
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
    { slot: 2, material: "cpla", role: "conductor", label: "traces", preview: "#1A1A1A" },
    { slot: 3, material: "tpu95", role: "flex", label: "keys", preview: "#FE0386" },
    { slot: 4, material: "ctpu", role: "flex-conductor", label: "contacts", preview: "#6E6E6E" },
  ],
  params: [
    { id: "body", label: "BODY", live: "commit", fields: [
      { id: "W", type: "mm", label: "width", range: [24, 60], step: 1, default: 30 },
      { id: "H", type: "mm", label: "depth", range: [24, 60], step: 1, default: 30 },
      { id: "r", type: "mm", label: "corner", range: [0, 8], step: 0.5, default: 3 },
    ] },
  ],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }],
  // No hookup: circuit's pressed path (path1d.ts line 299) needs a contact
  // feature, and skin across the comb gap is no contact kind; the touch
  // read stays the archetype's readout until a touch contact lands.
  assertions: [],
});

export type ButtonsTouchCombParams = ParamsOf<typeof chase>;
