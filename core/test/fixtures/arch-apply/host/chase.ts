// core/test/fixtures/arch-apply/host/chase.ts: a plain PETG prism with one declared face and nothing applied.

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "arch-apply-host", kind: "single", name: "HOST", version: 1, chase: 2,
    kernels: ["geom", "mesh", "3mf"], machines: ["ffc5p"], license: "MIT",
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
  ],
  params: [
    { id: "body", label: "BODY", live: "commit", fields: [
      { id: "W", type: "mm", label: "width", range: [24, 60], step: 1, default: 30 },
      { id: "H", type: "mm", label: "height", range: [6, 20], step: 0.1, default: 9.6 },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }],
  assertions: [],
});
