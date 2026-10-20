// chase-param/field-id-unique: field w is declared in two groups, E_SCHEMA at /params/1/fields/0/id.

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "param-field-id-unique", kind: "single", name: "PARAM FIELD ID UNIQUE", version: 1, chase: 2,
    kernels: ["geom", "mesh", "3mf"], machines: ["ffc5p"], license: "CC-BY-SA-4.0",
  },
  materials: [{ slot: 1, material: "petg", role: "body", label: "body" }],
  params: [
    { id: "plate", label: "PLATE", fields: [
      { id: "w", type: "mm", label: "width", range: [1, 5], step: 1, default: 2 },
    ] },
    { id: "edge", label: "EDGE", fields: [
      { id: "w", type: "mm", label: "edge width", range: [1, 5], step: 1, default: 2 },
    ] },
  ],
  presets: [{ id: "base", label: "base", params: { w: 2 } }],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }],
  assertions: [],
});
