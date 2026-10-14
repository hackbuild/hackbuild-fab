// reference/copper/vernier/chase.surface.ts
// A surface chase (D-126), named apart from chase.ts for the reason
// reference/copper/_harness/vinyl.ts gives (M05-T14 card defects).
//
// VERNIER rev A, the second board of the KEYWAY family (M05-T15): six
// capacitive button plates and three wedge sliders, 12 channels, cut from
// adhesive copper under a vinyl faceplate and a printed sticker, no
// Velostat and no components (knowledge/designs/vernier.md).
//
// Every default is the P dict of the canonical generator,
// reference/copper/vernier/legacy/gen_vernier.py lines 38 to 60 (lineage
// vernier.generator/rev-a), one field per value; a tuple becomes one field
// per member. Each numeric default lands on its 0.05 mm step from the
// range minimum (G-09).

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "copper-vernier", kind: "surface", name: "VERNIER", version: 1, chase: 2,
    kernels: ["geom", "copper", "profile"], machines: ["cricut"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "copper-tape", role: "conductor", label: "copper" },
    { slot: 2, material: "chipboard-2", role: "backer", label: "backer" },
  ],
  params: [
    { id: "board", label: "BOARD", live: "commit", fields: [
      { id: "W", type: "mm", label: "width", range: [60, 300], step: 0.05, default: 110 },
      { id: "H", type: "mm", label: "height", range: [100, 300], step: 0.05, default: 214 },
      { id: "R", type: "mm", label: "corner", range: [0, 10], step: 0.05, default: 3.2 },
      { id: "edgeKeep", type: "mm", label: "edge keep", range: [0, 3], step: 0.05, default: 1, help: "copper keepout from the cut outline" },
      { id: "clr", type: "mm", label: "clearance gate", range: [0.3, 2], step: 0.05, default: 0.9, help: "least copper to copper distance between nets" },
      { id: "tw", type: "mm", label: "trace", range: [0.8, 3], step: 0.05, default: 1.6 },
      { id: "smooth", type: "mm", label: "smooth", range: [0, 1], step: 0.05, default: 0.4, help: "closing then opening per net" },
    ] },
    { id: "buttons", label: "BUTTONS", live: "commit", fields: [
      { id: "col0X0", type: "mm", label: "column 1 left", range: [0, 300], step: 0.05, default: 9 },
      { id: "col0X1", type: "mm", label: "column 1 right", range: [0, 300], step: 0.05, default: 35 },
      { id: "col1X0", type: "mm", label: "column 2 left", range: [0, 300], step: 0.05, default: 42 },
      { id: "col1X1", type: "mm", label: "column 2 right", range: [0, 300], step: 0.05, default: 68 },
      { id: "col2X0", type: "mm", label: "column 3 left", range: [0, 300], step: 0.05, default: 75 },
      { id: "col2X1", type: "mm", label: "column 3 right", range: [0, 300], step: 0.05, default: 101 },
      { id: "rowLoY0", type: "mm", label: "lower row bottom", range: [0, 300], step: 0.05, default: 122 },
      { id: "rowLoY1", type: "mm", label: "lower row top", range: [0, 300], step: 0.05, default: 148 },
      { id: "rowHiY0", type: "mm", label: "upper row bottom", range: [0, 300], step: 0.05, default: 153 },
      { id: "rowHiY1", type: "mm", label: "upper row top", range: [0, 300], step: 0.05, default: 179 },
      { id: "padR", type: "mm", label: "plate corner", range: [0, 10], step: 0.05, default: 2.4 },
      { id: "laneG1", type: "mm", label: "lane gap 1 x", range: [0, 300], step: 0.05, default: 38.5, help: "escape lane between columns 1 and 2" },
      { id: "laneG2", type: "mm", label: "lane gap 2 x", range: [0, 300], step: 0.05, default: 71.5, help: "escape lane between columns 2 and 3" },
      { id: "laneRm", type: "mm", label: "right margin lane x", range: [0, 300], step: 0.05, default: 103 },
    ] },
    { id: "sliders", label: "SLIDERS", live: "commit", fields: [
      { id: "band1Y0", type: "mm", label: "slider 1 bottom", range: [0, 300], step: 0.05, default: 82 },
      { id: "band1Y1", type: "mm", label: "slider 1 top", range: [0, 300], step: 0.05, default: 100 },
      { id: "band2Y0", type: "mm", label: "slider 2 bottom", range: [0, 300], step: 0.05, default: 60 },
      { id: "band2Y1", type: "mm", label: "slider 2 top", range: [0, 300], step: 0.05, default: 78 },
      { id: "band3Y0", type: "mm", label: "slider 3 bottom", range: [0, 300], step: 0.05, default: 38 },
      { id: "band3Y1", type: "mm", label: "slider 3 top", range: [0, 300], step: 0.05, default: 56 },
      { id: "wedgeA0", type: "mm", label: "wedge a left", range: [0, 300], step: 0.05, default: 18 },
      { id: "wedgeA1", type: "mm", label: "wedge a right", range: [0, 300], step: 0.05, default: 88 },
      { id: "wedgeB0", type: "mm", label: "wedge b left", range: [0, 300], step: 0.05, default: 22 },
      { id: "wedgeB1", type: "mm", label: "wedge b right", range: [0, 300], step: 0.05, default: 92 },
      { id: "slGap", type: "mm", label: "diagonal gap", range: [0.5, 5], step: 0.05, default: 1.4 },
      { id: "slHmin", type: "mm", label: "thin end", range: [1, 10], step: 0.05, default: 3.1 },
      { id: "corL1", type: "mm", label: "slider 1 left corridor", range: [0, 300], step: 0.05, default: 11 },
      { id: "corL2", type: "mm", label: "slider 2 left corridor", range: [0, 300], step: 0.05, default: 15 },
      { id: "corR1", type: "mm", label: "slider 1 right corridor", range: [0, 300], step: 0.05, default: 99 },
      { id: "corR2", type: "mm", label: "slider 2 right corridor", range: [0, 300], step: 0.05, default: 95 },
    ] },
    { id: "clips", label: "CLIPS", live: "commit", fields: [
      { id: "termSz", type: "mm", label: "pad", range: [4, 14], step: 0.05, default: 10 },
      { id: "termR", type: "mm", label: "pad corner", range: [0, 5], step: 0.05, default: 1.2 },
      { id: "topRow0", type: "mm", label: "top row 1 y", range: [0, 300], step: 0.05, default: 186 },
      { id: "topRow1", type: "mm", label: "top row 2 y", range: [0, 300], step: 0.05, default: 199 },
      { id: "botRow0", type: "mm", label: "bottom row 1 y", range: [0, 300], step: 0.05, default: 16 },
      { id: "botRow1", type: "mm", label: "bottom row 2 y", range: [0, 300], step: 0.05, default: 3 },
      { id: "botX0", type: "mm", label: "bottom pad 1 x", range: [0, 300], step: 0.05, default: 20 },
      { id: "botX1", type: "mm", label: "bottom pad 2 x", range: [0, 300], step: 0.05, default: 32 },
      { id: "botX2", type: "mm", label: "bottom pad 3 x", range: [0, 300], step: 0.05, default: 44 },
      { id: "botX3", type: "mm", label: "bottom pad 4 x", range: [0, 300], step: 0.05, default: 66 },
      { id: "botX4", type: "mm", label: "bottom pad 5 x", range: [0, 300], step: 0.05, default: 78 },
      { id: "botX5", type: "mm", label: "bottom pad 6 x", range: [0, 300], step: 0.05, default: 90 },
      { id: "botLane0", type: "mm", label: "bottom lane 1 y", range: [0, 300], step: 0.05, default: 29 },
      { id: "botLane1", type: "mm", label: "bottom lane 2 y", range: [0, 300], step: 0.05, default: 32 },
      { id: "botLane2", type: "mm", label: "bottom lane 3 y", range: [0, 300], step: 0.05, default: 35 },
      { id: "topBand", type: "mm", label: "top gather y", range: [0, 300], step: 0.05, default: 183 },
    ] },
    { id: "faceplate", label: "FACEPLATE", live: "commit", fields: [
      { id: "vinylOut", type: "mm", label: "overhang", range: [0, 5], step: 0.05, default: 1.6, help: "vinyl past every electrode" },
      { id: "vinylTermClr", type: "mm", label: "clip clearance", range: [0, 6], step: 0.05, default: 2.5 },
      { id: "faceWin", type: "mm", label: "clip window margin", range: [0, 6], step: 0.05, default: 1.8 },
      { id: "accentInset", type: "mm", label: "accent inset", range: [0, 8], step: 0.05, default: 3 },
    ] },
    { id: "brand", label: "BRAND", live: "commit", fields: [
      { id: "brand", type: "bool", label: "brand in copper", default: false,
        help: "decoration in the foil; off puts the mark on the printed faceplate only" },
      { id: "brandY0", type: "mm", label: "brand strip bottom", range: [0, 300], step: 0.05, default: 104, help: "recorded with the board; no geometry reads it" },
      { id: "brandY1", type: "mm", label: "brand strip top", range: [0, 300], step: 0.05, default: 120 },
      { id: "markSize", type: "mm", label: "mark", range: [5, 40], step: 0.05, default: 14 },
      { id: "markX", type: "mm", label: "mark x", range: [0, 300], step: 0.05, default: 10 },
      { id: "markY", type: "mm", label: "mark y", range: [0, 300], step: 0.05, default: 104 },
      { id: "wmCap", type: "mm", label: "wordmark cap", range: [2, 20], step: 0.05, default: 5.6 },
      { id: "wmX", type: "mm", label: "wordmark x", range: [0, 300], step: 0.05, default: 27 },
    ] },
  ],
  presets: [
    { id: "brand", label: "brand in copper", params: { brand: true } },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "svg", machine: "cricut" }],
  assertions: [],
});

/** The params type a build function sees. */
export type VernierParams = ParamsOf<typeof chase>;
