// reference/conductors/blocks-stud-applied/chase.ts
// The fresh prism of M06-T12: one PETG body that never knew BLOCKS, a
// 32 x 24 mm rectangle (4 x 3 studs at BOSS's 8.0 mm pitch) extruded to
// BOSS's brick height 9.6 mm on the prism route (BOSS boss.js line 12,
// P 8.0 and brickH 9.6, inferred design values). No features and no
// applied entries: arch.apply returns the placement and the slots a stud
// needs, and part.build merges whatever chase.applied holds.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "blocks-stud-applied", kind: "single", name: "PRISM", version: 1, chase: 2,
    kernels: ["geom", "mesh", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
  ],
  params: [
    { id: "body", label: "PRISM", live: "commit", fields: [
      { id: "W", type: "mm", label: "width", range: [8, 64], step: 8, default: 32, help: "4 studs at the boss pitch of 8.0 mm" },
      { id: "D", type: "mm", label: "depth", range: [8, 64], step: 8, default: 24, help: "3 studs at the boss pitch of 8.0 mm" },
      { id: "H", type: "mm", label: "height", range: [3.2, 19.2], step: 0.1, default: 9.6, help: "boss brickH, boss.js line 12" },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }],
  assertions: [],
});

export type Params = ParamsOf<typeof chase>;
