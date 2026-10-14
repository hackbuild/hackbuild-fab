// core/test/fixtures/sandbox/tty-flip/chase.ts: a one-body plate chase for the sandbox tests.

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "sandbox-tty-flip", kind: "single", name: "SANDBOX PLATE", version: 1, chase: 2,
    kernels: ["mesh", "3mf"], machines: ["ffc5p"], license: "MIT",
  },
  materials: [{ slot: 1, material: "petg", role: "body", label: "plate", preview: "#1A1A1A" }],
  params: [
    { id: "plate", label: "PLATE", live: "commit", fields: [
      { id: "w", type: "mm", label: "width", range: [10, 40], step: 1, default: 20 },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }],
  assertions: [],
});
