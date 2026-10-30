// A fixture chase with one `art` param that takes layers, for the art board
// smoke (tools/smoke/art-board.spec.ts). It declares no geometry build: the
// bake carries the rail, undo and the BENCH hook, and the state holds the art
// value whose uri the smoke reads. A plate 100 by 64 mm, three slots as in
// reference/cosmetic/art-layers.

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "art-board", kind: "single", name: "ART BOARD", version: 1, chase: 2,
    kernels: ["geom", "mesh", "inlay", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "black", preview: "#1A1A1A" },
    { slot: 2, material: "petg", role: "art", label: "pink", preview: "#FE0386" },
    { slot: 3, material: "petg", role: "art", label: "cream", preview: "#F5F0E6" },
  ],
  params: [
    { id: "plate", label: "PLATE", live: "commit", fields: [
      { id: "thk", type: "mm", label: "thickness", range: [2.41, 6.01], step: 0.24, default: 3.61 },
    ] },
    { id: "face", label: "FACE ART", live: "commit", fields: [
      { id: "art", type: "art", label: "layers", accepts: ["layers", "svg"], frame: [100, 64],
        help: "text, shapes, marks, scope traces, circuits and dropped svg paths on both faces" },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "json" }],
  assertions: [],
});
