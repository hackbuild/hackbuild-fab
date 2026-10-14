// reference/copper/quadrant/chase.surface.ts
// A surface chase (D-126), named apart from chase.ts for the reason
// reference/copper/_harness/vinyl.ts gives (M05-T14 card defects).
//
// QUADRANT rev A, VERNIER's radial sibling (M05-T15): six annular sector
// buttons around a hub, three concentric arc sliders and all 12 contacts in
// one row of alternating depth edge fingers (knowledge/designs/quadrant.md).
//
// Every default is the P dict of the canonical generator,
// reference/copper/quadrant/legacy/gen_quadrant.py lines 35 to 54 (lineage
// quadrant.generator/rev-a), one field per value; a tuple becomes one field
// per member. Each numeric default lands on its 0.05 step from the range
// minimum (G-09).

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "copper-quadrant", kind: "surface", name: "QUADRANT", version: 1, chase: 2,
    kernels: ["geom", "copper", "profile"], machines: ["cricut"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "copper-tape", role: "conductor", label: "copper" },
    { slot: 2, material: "chipboard-2", role: "backer", label: "backer" },
  ],
  params: [
    { id: "board", label: "BOARD", live: "commit", fields: [
      { id: "W", type: "mm", label: "width", range: [60, 300], step: 0.05, default: 190 },
      { id: "H", type: "mm", label: "height", range: [60, 300], step: 0.05, default: 134 },
      { id: "R", type: "mm", label: "corner", range: [0, 10], step: 0.05, default: 3.2 },
      { id: "edgeKeep", type: "mm", label: "edge keep", range: [0, 3], step: 0.05, default: 1, help: "copper keepout from the cut outline" },
      { id: "clr", type: "mm", label: "clearance gate", range: [0.3, 2], step: 0.05, default: 0.9, help: "least copper to copper distance between nets; also the fan margin" },
      { id: "tw", type: "mm", label: "trace", range: [0.8, 3], step: 0.05, default: 1.6 },
      { id: "smooth", type: "mm", label: "smooth", range: [0, 1], step: 0.05, default: 0.4, help: "closing then opening per net" },
      { id: "hubX", type: "mm", label: "hub x", range: [0, 300], step: 0.05, default: 95 },
      { id: "hubY", type: "mm", label: "hub y", range: [0, 300], step: 0.05, default: 34 },
    ] },
    { id: "sectors", label: "SECTORS", live: "commit", fields: [
      { id: "btnR0", type: "mm", label: "inner radius", range: [5, 100], step: 0.05, default: 20, help: "the hub void the fan lanes run through" },
      { id: "btnR1", type: "mm", label: "outer radius", range: [5, 150], step: 0.05, default: 42 },
      { id: "btnA0", type: "deg", label: "first angle", range: [0, 180], step: 0.05, default: 18 },
      { id: "btnA1", type: "deg", label: "last angle", range: [0, 180], step: 0.05, default: 160 },
      { id: "btnGapA", type: "deg", label: "gap", range: [0, 20], step: 0.05, default: 3.2 },
      { id: "btnRound", type: "mm", label: "rounding", range: [0, 5], step: 0.05, default: 1.6 },
    ] },
    { id: "arcs", label: "ARCS", live: "commit", fields: [
      { id: "arc0", type: "mm", label: "arc 1 inner radius", range: [10, 150], step: 0.05, default: 48 },
      { id: "arc1", type: "mm", label: "arc 2 inner radius", range: [10, 150], step: 0.05, default: 64 },
      { id: "arc2", type: "mm", label: "arc 3 inner radius", range: [10, 150], step: 0.05, default: 80 },
      { id: "arcW", type: "mm", label: "band", range: [4, 30], step: 0.05, default: 12 },
      { id: "arcA0", type: "deg", label: "a from", range: [0, 180], step: 0.05, default: 18 },
      { id: "arcA1", type: "deg", label: "a to", range: [0, 180], step: 0.05, default: 166 },
      { id: "arcB0", type: "deg", label: "b from", range: [0, 180], step: 0.05, default: 14 },
      { id: "arcB1", type: "deg", label: "b to", range: [0, 180], step: 0.05, default: 162 },
      { id: "slHmin", type: "mm", label: "thin end", range: [0.5, 10], step: 0.05, default: 2 },
      { id: "slGap", type: "mm", label: "diagonal gap", range: [0.5, 5], step: 0.05, default: 1.4 },
      { id: "escA", type: "deg", label: "a escape angle", range: [0, 180], step: 0.05, default: 165 },
      { id: "escB", type: "deg", label: "b escape angle", range: [0, 180], step: 0.05, default: 15 },
    ] },
    { id: "rail", label: "RAIL", live: "commit", fields: [
      { id: "railN", type: "int", label: "fingers", range: [2, 30], step: 1, default: 12 },
      { id: "railW", type: "mm", label: "finger width", range: [3, 15], step: 0.05, default: 9 },
      { id: "railPitch", type: "mm", label: "pitch", range: [5, 25], step: 0.05, default: 14 },
      { id: "railY0", type: "mm", label: "rail y", range: [0, 20], step: 0.05, default: 2.5 },
      { id: "railDeep", type: "mm", label: "deep finger", range: [4, 30], step: 0.05, default: 16 },
      { id: "railShallow", type: "mm", label: "shallow finger", range: [4, 30], step: 0.05, default: 11 },
      { id: "railR", type: "mm", label: "finger corner", range: [0, 5], step: 0.05, default: 1.2 },
      { id: "lane0", type: "mm", label: "lane 1 y", range: [0, 300], step: 0.05, default: 37, help: "fan lanes, farthest from the rail first" },
      { id: "lane1", type: "mm", label: "lane 2 y", range: [0, 300], step: 0.05, default: 34 },
      { id: "lane2", type: "mm", label: "lane 3 y", range: [0, 300], step: 0.05, default: 31 },
      { id: "lane3", type: "mm", label: "lane 4 y", range: [0, 300], step: 0.05, default: 28 },
      { id: "lane4", type: "mm", label: "lane 5 y", range: [0, 300], step: 0.05, default: 25 },
      { id: "lane5", type: "mm", label: "lane 6 y", range: [0, 300], step: 0.05, default: 22 },
    ] },
    { id: "faceplate", label: "FACEPLATE", live: "commit", fields: [
      { id: "vinylOut", type: "mm", label: "overhang", range: [0, 5], step: 0.05, default: 1.6, help: "vinyl past every electrode" },
      { id: "vinylRailClr", type: "mm", label: "rail clearance", range: [0, 6], step: 0.05, default: 3 },
      { id: "accentInset", type: "mm", label: "accent inset", range: [0, 8], step: 0.05, default: 2.6 },
    ] },
    { id: "brand", label: "BRAND", live: "commit", fields: [
      { id: "brand", type: "bool", label: "brand in copper", default: false,
        help: "decoration in the foil; off puts the mark on the printed faceplate only" },
      { id: "markSize", type: "mm", label: "mark", range: [5, 40], step: 0.05, default: 13 },
      { id: "markX", type: "mm", label: "mark x", range: [0, 300], step: 0.05, default: 4 },
      { id: "markY", type: "mm", label: "mark y", range: [0, 300], step: 0.05, default: 106 },
      { id: "wmCap", type: "mm", label: "wordmark cap", range: [2, 20], step: 0.05, default: 5.2 },
      { id: "wmX", type: "mm", label: "wordmark x", range: [0, 300], step: 0.05, default: 19 },
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
export type QuadrantParams = ParamsOf<typeof chase>;
