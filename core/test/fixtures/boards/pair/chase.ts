// core/test/fixtures/boards/pair/chase.ts
// Test fixture for the export.run board gate path (M08-T14): two headers on
// two traces, every catalog read at community tier, so build, provenance and
// checks pass and the run reaches the TTY gate. Never a reference.

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "fixture-board-pair", kind: "board", name: "pair fixture", version: 1, chase: 2,
    kernels: ["board"], machines: [],
    license: "MIT",
  },
  materials: [],
  params: [],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "gerbers" }, { kind: "bom" }, { kind: "cpl" }],
  assertions: [],
});
