// chase-param/enum-default: the enum default is none of its options, E_SCHEMA at /params/1/fields/0/default.

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "param-enum-default", kind: "single", name: "PARAM ENUM DEFAULT", version: 1, chase: 2,
    kernels: ["geom", "mesh", "3mf"], machines: ["ffc5p"], license: "CC-BY-SA-4.0",
  },
  materials: [{ slot: 1, material: "petg", role: "body", label: "body" }],
  params: [
    { id: "plate", label: "PLATE", fields: [
      { id: "w", type: "mm", label: "width", range: [1, 5], step: 1, default: 2 },
    ] },
    { id: "lead", label: "LEAD", fields: [
      { id: "pads", type: "enum", label: "leads", default: "solder",
        options: [{ value: "clip", label: "clip pads" }, { value: "cup", label: "wire cups" }] },
    ] },
  ],
  presets: [{ id: "base", label: "base", params: { w: 2 } }],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }],
  assertions: [],
});
