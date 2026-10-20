// A chase that computes (identifier); chase.validate refuses it
// with E_SCHEMA at the line marked "computes" (M10-T02 declares.test.ts).

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: { id: "computes-identifier", kind: "single", name: "COMPUTES", version: 1, chase: 2, kernels: ["geom"], machines: ["ffc5p"], license: "CC-BY-SA-4.0" },
  materials: [{ slot: 1, material: "petg", role: "body" }],
  params: [
    { id: "main", label: "MAIN", fields: [
      { id: "d", type: "mm", label: "size", range: [20, 80], step: 1, default: Infinity }, // computes
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf" }],
  assertions: [],
});
