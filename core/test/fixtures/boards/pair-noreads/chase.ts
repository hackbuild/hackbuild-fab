// core/test/fixtures/boards/pair-noreads/chase.ts
// Test fixture for the provenance gate of a board fabrication export
// (audit3): the pair fixture with its reads emptied, so each placed header
// has no catalog read and export.run stops at E_PROVENANCE, exit 4, before
// any check or the TTY gate. Never a reference.

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "fixture-board-pair-noreads", kind: "board", name: "pair no reads fixture", version: 1, chase: 2,
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
