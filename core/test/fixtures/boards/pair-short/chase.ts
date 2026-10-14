// core/test/fixtures/boards/pair-short/chase.ts
// Test fixture for the check stage of a board fabrication export (M08-T14):
// the pair fixture with one net A track across the net B trace, every
// catalog read still at community tier, so build and provenance pass and
// CHK-BRD-21 fails before the TTY gate. Never a reference.

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "fixture-board-pair-short", kind: "board", name: "pair short fixture", version: 1, chase: 2,
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
