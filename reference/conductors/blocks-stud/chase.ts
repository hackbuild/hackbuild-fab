// reference/conductors/blocks-stud/chase.ts
// M06-T09: the blocks-stud archetype, blocks-html preset (blocks.md 5.4),
// peg both, placed by build.ts through Author.arch on a one stud BLOCKS
// brick (8 x 8 mm, corner 0.6, the brickBody of parts.js line 52). The
// standard is named in build.ts because it has no default (D-087); the
// boss-v1 preset is held to its original in
// packages/archetypes/test/blocks.parity.test.ts.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "conductors-blocks-stud", kind: "single", name: "BLOCKS STUD", version: 1, chase: 2,
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
    { id: "brick", label: "BRICK", live: "commit", fields: [
      { id: "H", type: "mm", label: "height", range: [3.2, 12.8], step: 3.2, default: 9.6 },
    ] },
  ],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }],
  assertions: [],
});

export type BlocksStudParams = ParamsOf<typeof chase>;
