// reference/copper/tessera/chase.surface.ts
// A surface chase (D-126), named apart from chase.ts for the reason
// reference/copper/_harness/vinyl.ts gives (M05-T14 card defects).
//
// TESSERA rev A (M05-T15): twelve irregular tile keys, Voronoi cells of a
// jittered seed grid with the column boundaries snapped to straight
// routing channels, three small sliders in a band under the keypad and 18
// contacts in one row (knowledge/designs/tessera.md).
//
// Every default is the P dict of the canonical generator,
// reference/copper/tessera/legacy/gen_tessera.py lines 36 to 54 (lineage
// tessera.generator/rev-a), one field per value; a tuple becomes one field
// per member, and the computed lane tuple (line 51, 46.0 - 3.0 i for nine
// i) is its three literals. Each numeric default lands on its 0.05 step
// from the range minimum (G-09).

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "copper-tessera", kind: "surface", name: "TESSERA", version: 1, chase: 2,
    kernels: ["geom", "copper", "profile"], machines: ["cricut"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "copper-tape", role: "conductor", label: "copper" },
    { slot: 2, material: "chipboard-2", role: "backer", label: "backer" },
  ],
  params: [
    { id: "board", label: "BOARD", live: "commit", fields: [
      { id: "W", type: "mm", label: "width", range: [60, 400], step: 0.05, default: 242 },
      { id: "H", type: "mm", label: "height", range: [60, 400], step: 0.05, default: 176 },
      { id: "R", type: "mm", label: "corner", range: [0, 10], step: 0.05, default: 3.2 },
      { id: "edgeKeep", type: "mm", label: "edge keep", range: [0, 3], step: 0.05, default: 1, help: "copper keepout from the cut outline" },
      { id: "clr", type: "mm", label: "clearance gate", range: [0.3, 2], step: 0.05, default: 0.9, help: "least copper to copper distance between nets; also the fan margin" },
      { id: "tw", type: "mm", label: "trace", range: [0.8, 3], step: 0.05, default: 1.6 },
      { id: "smooth", type: "mm", label: "smooth", range: [0, 1], step: 0.05, default: 0.25, help: "closing then opening per net; 0.4 ate the lane gaps" },
    ] },
    { id: "tiles", label: "TILES", live: "commit", fields: [
      { id: "seed", type: "int", label: "seed", range: [0, 1000000], step: 1, default: 11, help: "the jitter draws reproduce Python's random.Random(seed)" },
      { id: "jitterX", type: "mm", label: "jitter x", range: [0, 20], step: 0.05, default: 6 },
      { id: "jitterY", type: "mm", label: "jitter y", range: [0, 20], step: 0.05, default: 5.5 },
      { id: "cols", type: "int", label: "columns", range: [1, 10], step: 1, default: 4 },
      { id: "rows", type: "int", label: "rows", range: [1, 10], step: 1, default: 3 },
      { id: "fieldX0", type: "mm", label: "field left", range: [0, 400], step: 0.05, default: 10 },
      { id: "fieldY0", type: "mm", label: "field bottom", range: [0, 400], step: 0.05, default: 76 },
      { id: "fieldX1", type: "mm", label: "field right", range: [0, 400], step: 0.05, default: 232 },
      { id: "fieldY1", type: "mm", label: "field top", range: [0, 400], step: 0.05, default: 170 },
      { id: "chanW", type: "mm", label: "channel width", range: [2, 30], step: 0.05, default: 10, help: "each channel carries one trace per row" },
      { id: "subGap", type: "mm", label: "sub-lane pitch", range: [1, 10], step: 0.05, default: 3 },
      { id: "tileSeam", type: "mm", label: "seam", range: [0, 5], step: 0.05, default: 0.55 },
      { id: "tileRound", type: "mm", label: "rounding", range: [0, 10], step: 0.05, default: 1.6 },
    ] },
    { id: "sliders", label: "SLIDERS", live: "commit", fields: [
      { id: "slidY0", type: "mm", label: "band bottom", range: [0, 400], step: 0.05, default: 51 },
      { id: "slidY1", type: "mm", label: "band top", range: [0, 400], step: 0.05, default: 71 },
      { id: "lin0X0", type: "mm", label: "slider 1 left", range: [0, 400], step: 0.05, default: 22 },
      { id: "lin0X1", type: "mm", label: "slider 1 right", range: [0, 400], step: 0.05, default: 61 },
      { id: "lin1X0", type: "mm", label: "slider 2 left", range: [0, 400], step: 0.05, default: 128 },
      { id: "lin1X1", type: "mm", label: "slider 2 right", range: [0, 400], step: 0.05, default: 167 },
      { id: "linHmin", type: "mm", label: "thin end", range: [0.5, 10], step: 0.05, default: 2.4 },
      { id: "linGap", type: "mm", label: "diagonal gap", range: [0.5, 5], step: 0.05, default: 1.4 },
      { id: "linOff", type: "mm", label: "end offset", range: [0, 20], step: 0.05, default: 5 },
      { id: "arcCX", type: "mm", label: "arc centre x", range: [0, 400], step: 0.05, default: 205.5 },
      { id: "arcCY", type: "mm", label: "arc centre y", range: [0, 400], step: 0.05, default: 24.5 },
      { id: "arcR0", type: "mm", label: "arc inner radius", range: [5, 200], step: 0.05, default: 32 },
      { id: "arcR1", type: "mm", label: "arc outer radius", range: [5, 200], step: 0.05, default: 44 },
      { id: "arcA0", type: "deg", label: "arc from", range: [0, 180], step: 0.05, default: 60 },
      { id: "arcA1", type: "deg", label: "arc to", range: [0, 180], step: 0.05, default: 120 },
      { id: "arcHmin", type: "mm", label: "arc thin end", range: [0.5, 10], step: 0.05, default: 2.2 },
      { id: "arcGap", type: "mm", label: "arc diagonal gap", range: [0.5, 5], step: 0.05, default: 1.4 },
      { id: "arcOff", type: "deg", label: "arc end offset", range: [0, 20], step: 0.05, default: 4 },
      { id: "arcEsc", type: "deg", label: "arc escape inset", range: [0, 20], step: 0.05, default: 3 },
    ] },
    { id: "rail", label: "RAIL", live: "commit", fields: [
      { id: "railN", type: "int", label: "fingers", range: [2, 30], step: 1, default: 18 },
      { id: "railW", type: "mm", label: "finger width", range: [3, 15], step: 0.05, default: 9 },
      { id: "railPitch", type: "mm", label: "pitch", range: [5, 25], step: 0.05, default: 13 },
      { id: "railY0", type: "mm", label: "rail y", range: [0, 20], step: 0.05, default: 2.5 },
      { id: "railDeep", type: "mm", label: "deep finger", range: [4, 30], step: 0.05, default: 16 },
      { id: "railShallow", type: "mm", label: "shallow finger", range: [4, 30], step: 0.05, default: 11 },
      { id: "railR", type: "mm", label: "finger corner", range: [0, 5], step: 0.05, default: 1.2 },
      { id: "laneFar", type: "mm", label: "farthest lane y", range: [0, 400], step: 0.05, default: 46, help: "fan lanes, farthest from the rail first" },
      { id: "laneStep", type: "mm", label: "lane step", range: [1, 10], step: 0.05, default: 3 },
      { id: "laneCount", type: "int", label: "lanes", range: [1, 20], step: 1, default: 9 },
    ] },
    { id: "faceplate", label: "FACEPLATE", live: "commit", fields: [
      { id: "vinylOut", type: "mm", label: "overhang", range: [0, 5], step: 0.05, default: 1.4, help: "vinyl past every electrode" },
      { id: "vinylRailClr", type: "mm", label: "rail clearance", range: [0, 6], step: 0.05, default: 3 },
      { id: "accentInset", type: "mm", label: "accent inset", range: [0, 8], step: 0.05, default: 2.4 },
    ] },
    { id: "brand", label: "BRAND", live: "commit", fields: [
      { id: "brand", type: "bool", label: "brand in copper", default: false,
        help: "decoration in the foil; off puts the mark on the printed faceplate only" },
      { id: "markSize", type: "mm", label: "mark", range: [5, 40], step: 0.05, default: 13 },
      { id: "markX", type: "mm", label: "mark x", range: [0, 400], step: 0.05, default: 74 },
      { id: "markY", type: "mm", label: "mark y", range: [0, 400], step: 0.05, default: 53 },
      { id: "wmCap", type: "mm", label: "wordmark cap", range: [2, 20], step: 0.05, default: 5.4 },
      { id: "wmX", type: "mm", label: "wordmark x", range: [0, 400], step: 0.05, default: 89 },
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
export type TesseraParams = ParamsOf<typeof chase>;
