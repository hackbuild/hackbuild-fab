// reference/conductors/blocks-wire/chase.ts
// M06-T09: the blocks-wire archetype at the BLOCKS defaults (blocks.md
// 5.10, parts.js lines 565 to 577): straight, 80 mm, cTPU core 1.2 in a
// 3.2 mm TPU sheath, a peg cap with socket and stud at each end. The wire
// is a part of its own, placed by build.ts through Author.arch on the bed.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "conductors-blocks-wire", kind: "single", name: "BLOCKS WIRE", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  // The BLOCKS slots (blocks.js lines 54 to 59).
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
    { slot: 2, material: "cpla", role: "conductor", label: "conductor", preview: "#1A1A1A" },
    { slot: 3, material: "tpu95", role: "flex", label: "flex", preview: "#FE0386" },
    { slot: 4, material: "ctpu", role: "flex-conductor", label: "flex conductor", preview: "#6E6E6E" },
  ],
  params: [
    { id: "wire", label: "WIRE", live: "commit", fields: [
      { id: "len", type: "mm", label: "length", range: [10, 400], step: 1, default: 80 },
    ] },
  ],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }],
  assertions: [],
});

export type BlocksWireParams = ParamsOf<typeof chase>;
