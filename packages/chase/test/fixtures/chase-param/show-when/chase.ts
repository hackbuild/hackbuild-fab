// chase-param/show-when: showWhen names widht, a field nobody declares, E_REF at /params/0/fields/1/showWhen with didYouMean.

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "param-show-when", kind: "single", name: "PARAM SHOW WHEN", version: 1, chase: 2,
    kernels: ["geom", "mesh", "3mf"], machines: ["ffc5p"], license: "CC-BY-SA-4.0",
  },
  materials: [{ slot: 1, material: "petg", role: "body", label: "body" }],
  params: [
    { id: "plate", label: "PLATE", fields: [
      { id: "w", type: "mm", label: "width", range: [1, 5], step: 1, default: 2 },
      { id: "width", type: "mm", label: "rim", range: [1, 5], step: 1, default: 2, showWhen: { field: "widht", equals: 2 } },
    ] },
  ],
  presets: [{ id: "base", label: "base", params: { w: 2 } }],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }],
  assertions: [],
});
