// core/test/fixtures/arch-apply/stud-blocks-html/chase.ts: the fresh prism of
// reference/conductors/blocks-stud-applied with the chase.applied entry, the
// slots and the kernel arch.apply returns for blocks-stud at standard blocks-html
// on body.top.

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "arch-apply-stud-blocks-html", kind: "single", name: "PRISM", version: 1, chase: 2,
    kernels: ["geom", "mesh", "3mf", "circuit"], machines: ["ffc5p"], license: "MIT",
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
    { slot: 2, material: "cpla", role: "conductor", label: "traces", preview: "#1A1A1A" },
    { slot: 3, material: "ctpu", role: "flex-conductor", label: "contacts", preview: "#6E6E6E" },
  ],
  params: [
    { id: "body", label: "PRISM", live: "commit", fields: [
      { id: "W", type: "mm", label: "width", range: [8, 64], step: 8, default: 32 },
      { id: "D", type: "mm", label: "depth", range: [8, 64], step: 8, default: 24 },
      { id: "H", type: "mm", label: "height", range: [3.2, 19.2], step: 0.1, default: 9.6 },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  applied: [
    { archetype: "blocks-stud", part: "body", face: { ref: "body.top", uv: [0, 0], rotDeg: 0 }, params: { standard: "blocks-html" } },
  ],
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }],
  assertions: [],
});
