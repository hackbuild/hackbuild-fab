// chase-param/default-range: default 9 lies outside range 1 to 5; it compiles under tsc (spec/fixtures/negative.ts outOfRange) and fails only at runtime.

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "param-default-range", kind: "single", name: "PARAM DEFAULT RANGE", version: 1, chase: 2,
    kernels: ["geom", "mesh", "3mf"], machines: ["ffc5p"], license: "CC-BY-SA-4.0",
  },
  materials: [{ slot: 1, material: "petg", role: "body", label: "body" }],
  params: [
    { id: "plate", label: "PLATE", fields: [
      { id: "w", type: "mm", label: "width", range: [1, 5], step: 1, default: 9 },
    ] },
  ],
  presets: [{ id: "base", label: "base", params: { w: 2 } }],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }],
  assertions: [],
});
