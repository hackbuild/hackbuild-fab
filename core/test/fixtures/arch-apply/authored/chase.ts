// core/test/fixtures/arch-apply/authored/chase.ts: the host prism and the four slots; build.ts places flex-cone-key itself.

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "arch-apply-authored", kind: "single", name: "HOST", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "3mf"], machines: ["ffc5p"], license: "MIT",
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
    { slot: 2, material: "cpla", role: "conductor", label: "traces", preview: "#1A1A1A" },
    { slot: 3, material: "tpu95", role: "flex", label: "keys", preview: "#FE0386" },
    { slot: 4, material: "ctpu", role: "flex-conductor", label: "contacts", preview: "#6E6E6E" },
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
