// packages/mesh/test/fixtures/loft-sweep-hull/chase.ts: one petg part whose
// three bodies take the loft route, the sweep route and the csg hull op
// (R1-engine-09, PLAN.md 3.3).

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "loft-sweep-hull", kind: "single", name: "LOFT SWEEP HULL", version: 1, chase: 2,
    kernels: ["geom", "mesh", "3mf"], machines: ["ffc5p"], license: "MIT",
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
  ],
  params: [
    { id: "shape", label: "SHAPE", live: "commit", fields: [
      { id: "h", type: "mm", label: "hull height", range: [2, 20], step: 0.01, default: 5.05 },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }],
  assertions: [],
});
