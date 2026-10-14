// core/test/fixtures/sandbox/derive/chase.ts: a plate whose thickness is a derived field, for the Author.derive tests.

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "sandbox-derive", kind: "single", name: "SANDBOX DERIVE", version: 1, chase: 2,
    kernels: ["mesh", "3mf"], machines: ["ffc5p"], license: "MIT",
  },
  materials: [{ slot: 1, material: "petg", role: "body", label: "plate", preview: "#1A1A1A" }],
  params: [
    { id: "plate", label: "PLATE", live: "commit", fields: [
      { id: "w", type: "mm", label: "width", range: [10, 40], step: 1, default: 20 },
      { id: "T", type: "derived", label: "thickness", fn: "plateThickness", unit: "mm" },
      { id: "mode", type: "enum", label: "derive call", default: "declared", options: [
        { value: "declared", label: "declared" },
        { value: "undeclared", label: "undeclared" },
        { value: "fit", label: "dropped fit" },
      ] },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }],
  assertions: [],
});
