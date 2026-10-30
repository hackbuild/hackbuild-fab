// reference/cosmetic/art-layers/chase.ts
// The reference for the layer kinds BAIL adds to the inlay kind (plan v11
// section 4.3 step a): shape in all 13 kinds, scope, circuit, logo, and text
// with letter spacing and an arc. One blank plate, 100 by 64 mm and 3.61 mm
// thick, on the ffc5p 0.24 mm preset, in a black body (slot 1) with two art
// slots, pink (2) and cream (3), the slots of cosmetic/coin-inlay. The front
// face carries the 13 shapes in three rows, then the scope trace, a seeded
// circuit and the hack.build mark, then a line of text; the back face
// carries two arcs, spaced text and an arrow. Inlay depth 1.2 mm is 5
// layers of 0.24 mm (computed). A chase declares and never computes (D-178);
// the layers and the content address are in build.ts.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "art-layers", kind: "single", name: "ART LAYERS", version: 1, chase: 2,
    kernels: ["geom", "mesh", "inlay", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "black", preview: "#1A1A1A" },
    { slot: 2, material: "petg", role: "art", label: "pink", preview: "#FE0386" },
    { slot: 3, material: "petg", role: "art", label: "cream", preview: "#F5F0E6" },
  ],
  params: [
    { id: "blank", label: "BLANK", live: "commit", fields: [
      { id: "w", type: "mm", label: "width", range: [96, 120], step: 2, default: 100,
        help: "six columns of shapes, 16 mm apart at the default" },
      { id: "h", type: "mm", label: "height", range: [60, 80], step: 2, default: 64,
        help: "three rows, 20 mm apart" },
      { id: "thk", type: "mm", label: "thickness", range: [2.41, 6.01], step: 0.24, default: 3.61,
        help: "a layer top: the 0.25 mm first layer plus whole 0.24 mm layers" },
    ] },
    { id: "inlay", label: "INLAY", live: "commit", fields: [
      { id: "depth", type: "mm", label: "colour depth", range: [0.48, 1.68], step: 0.24, default: 1.2,
        help: "a whole number of layers; light over dark needs 1.2" },
      { id: "minF", type: "mm", label: "min feature", range: [0.6, 2], step: 0.05, default: 0.6 },
      { id: "boost", type: "mm", label: "stroke boost", range: [0, 0.5], step: 0.05, default: 0.15 },
      { id: "gap", type: "mm", label: "colour gap", range: [0, 1], step: 0.05, default: 0 },
      { id: "cells", type: "int", label: "grid", range: [4, 12], step: 1, default: 8, quality: true,
        help: "cells per mm; 8 is BAIL's default" },
    ] },
    { id: "art", label: "ART", live: "commit", fields: [
      { id: "size", type: "mm", label: "shape size", range: [8, 16], step: 1, default: 14,
        help: "the extent of each shape, mm" },
      { id: "stroke", type: "mm", label: "stroke", range: [0.8, 2], step: 0.1, default: 1.2,
        help: "stroke and gap width of the shapes, mm" },
      { id: "seed", type: "int", label: "circuit seed", range: [1, 999], step: 1, default: 7,
        help: "one seed gives one board on every machine" },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }, { kind: "card" }],
  assertions: [],
});

/** The params type a build function sees. */
export type ArtLayersParams = ParamsOf<typeof chase>;
