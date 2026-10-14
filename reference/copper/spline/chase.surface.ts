// reference/copper/spline/chase.surface.ts
// A surface chase (D-126), named apart from chase.ts for the reason
// reference/copper/_harness/vinyl.ts gives (M05-T14 card defects).
//
// SPLINE rev A, QUADRANT's 18 channel sibling (M05-T15): twelve radial
// blade keys around a hub, a small arc slider nested outside them, two
// straight sliders flanking the fan and 18 contacts in one row
// (knowledge/designs/spline.md).
//
// Every default is the P dict of the canonical generator,
// reference/copper/spline/legacy/gen_spline.py lines 38 to 57 (lineage
// spline.generator/rev-a), one field per value; a tuple becomes one field
// per member. Each numeric default lands on its 0.05 step from the range
// minimum (G-09).

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "copper-spline", kind: "surface", name: "SPLINE", version: 1, chase: 2,
    kernels: ["geom", "copper", "profile"], machines: ["cricut"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "copper-tape", role: "conductor", label: "copper" },
    { slot: 2, material: "chipboard-2", role: "backer", label: "backer" },
  ],
  params: [
    { id: "board", label: "BOARD", live: "commit", fields: [
      { id: "W", type: "mm", label: "width", range: [60, 300], step: 0.05, default: 242 },
      { id: "H", type: "mm", label: "height", range: [60, 300], step: 0.05, default: 146 },
      { id: "R", type: "mm", label: "corner", range: [0, 10], step: 0.05, default: 3.2 },
      { id: "edgeKeep", type: "mm", label: "edge keep", range: [0, 3], step: 0.05, default: 1, help: "copper keepout from the cut outline" },
      { id: "clr", type: "mm", label: "clearance gate", range: [0.3, 2], step: 0.05, default: 0.9, help: "least copper to copper distance between nets; also the fan margin" },
      { id: "tw", type: "mm", label: "trace", range: [0.8, 3], step: 0.05, default: 1.6 },
      { id: "smooth", type: "mm", label: "smooth", range: [0, 1], step: 0.05, default: 0.4, help: "closing then opening per net" },
      { id: "hubX", type: "mm", label: "hub x", range: [0, 300], step: 0.05, default: 121 },
      { id: "hubY", type: "mm", label: "hub y", range: [0, 300], step: 0.05, default: 62 },
    ] },
    { id: "keys", label: "KEYS", live: "commit", fields: [
      { id: "keyN", type: "int", label: "keys", range: [2, 24], step: 1, default: 12 },
      { id: "keyR0", type: "mm", label: "inner radius", range: [5, 150], step: 0.05, default: 26 },
      { id: "keyR1", type: "mm", label: "outer radius", range: [5, 150], step: 0.05, default: 60 },
      { id: "keyA0", type: "deg", label: "first angle", range: [0, 180], step: 0.05, default: 30 },
      { id: "keyA1", type: "deg", label: "last angle", range: [0, 180], step: 0.05, default: 150 },
      { id: "keyGapA", type: "deg", label: "gap", range: [0, 20], step: 0.05, default: 2.4 },
      { id: "keyRound", type: "mm", label: "rounding", range: [0, 5], step: 0.05, default: 1 },
      { id: "keyTap0", type: "mm", label: "stub start radius", range: [0, 150], step: 0.05, default: 30, help: "the radial stub leaves the blade inside the hub void" },
      { id: "keyTap1", type: "mm", label: "stub end radius", range: [0, 150], step: 0.05, default: 24 },
    ] },
    { id: "arc", label: "ARC", live: "commit", fields: [
      { id: "arcR0", type: "mm", label: "inner radius", range: [5, 150], step: 0.05, default: 64 },
      { id: "arcR1", type: "mm", label: "outer radius", range: [5, 150], step: 0.05, default: 76 },
      { id: "arcA0", type: "deg", label: "from", range: [0, 180], step: 0.05, default: 60 },
      { id: "arcA1", type: "deg", label: "to", range: [0, 180], step: 0.05, default: 120 },
      { id: "arcDetour", type: "mm", label: "detour radius", range: [5, 200], step: 0.05, default: 88, help: "both ends step out to this radius and run past the fan" },
      { id: "arcExit0", type: "deg", label: "b exit angle", range: [0, 180], step: 0.05, default: 28 },
      { id: "arcExit1", type: "deg", label: "a exit angle", range: [0, 180], step: 0.05, default: 152 },
      { id: "arcHmin", type: "mm", label: "thin end", range: [0.5, 10], step: 0.05, default: 2.4 },
      { id: "arcGap", type: "mm", label: "diagonal gap", range: [0.5, 5], step: 0.05, default: 1.4 },
      { id: "arcOff", type: "deg", label: "end offset", range: [0, 20], step: 0.05, default: 5, help: "each electrode reaches past the other so the escapes clear" },
    ] },
    { id: "straight", label: "STRAIGHT", live: "commit", fields: [
      { id: "lin0X0", type: "mm", label: "slider 1 left", range: [0, 300], step: 0.05, default: 10 },
      { id: "lin0X1", type: "mm", label: "slider 1 right", range: [0, 300], step: 0.05, default: 24 },
      { id: "lin1X0", type: "mm", label: "slider 2 left", range: [0, 300], step: 0.05, default: 218 },
      { id: "lin1X1", type: "mm", label: "slider 2 right", range: [0, 300], step: 0.05, default: 232 },
      { id: "linY0", type: "mm", label: "bottom", range: [0, 300], step: 0.05, default: 66 },
      { id: "linY1", type: "mm", label: "top", range: [0, 300], step: 0.05, default: 108 },
      { id: "linHmin", type: "mm", label: "thin end", range: [0.5, 10], step: 0.05, default: 2.4 },
      { id: "linGap", type: "mm", label: "diagonal gap", range: [0.5, 5], step: 0.05, default: 1.4 },
      { id: "linOff", type: "mm", label: "end offset", range: [0, 10], step: 0.05, default: 3 },
      { id: "linCor0", type: "mm", label: "slider 1 corridor x", range: [0, 300], step: 0.05, default: 6 },
      { id: "linCor1", type: "mm", label: "slider 2 corridor x", range: [0, 300], step: 0.05, default: 236 },
    ] },
    { id: "rail", label: "RAIL", live: "commit", fields: [
      { id: "railN", type: "int", label: "fingers", range: [2, 30], step: 1, default: 18 },
      { id: "railW", type: "mm", label: "finger width", range: [3, 15], step: 0.05, default: 9 },
      { id: "railPitch", type: "mm", label: "pitch", range: [5, 25], step: 0.05, default: 13 },
      { id: "railY0", type: "mm", label: "rail y", range: [0, 20], step: 0.05, default: 2.5 },
      { id: "railDeep", type: "mm", label: "deep finger", range: [4, 30], step: 0.05, default: 16 },
      { id: "railShallow", type: "mm", label: "shallow finger", range: [4, 30], step: 0.05, default: 11 },
      { id: "railR", type: "mm", label: "finger corner", range: [0, 5], step: 0.05, default: 1.2 },
      { id: "lane0", type: "mm", label: "lane 1 y", range: [0, 300], step: 0.05, default: 43, help: "fan lanes, farthest from the rail first" },
      { id: "lane1", type: "mm", label: "lane 2 y", range: [0, 300], step: 0.05, default: 40 },
      { id: "lane2", type: "mm", label: "lane 3 y", range: [0, 300], step: 0.05, default: 37 },
      { id: "lane3", type: "mm", label: "lane 4 y", range: [0, 300], step: 0.05, default: 34 },
      { id: "lane4", type: "mm", label: "lane 5 y", range: [0, 300], step: 0.05, default: 31 },
      { id: "lane5", type: "mm", label: "lane 6 y", range: [0, 300], step: 0.05, default: 28 },
      { id: "lane6", type: "mm", label: "lane 7 y", range: [0, 300], step: 0.05, default: 25 },
      { id: "lane7", type: "mm", label: "lane 8 y", range: [0, 300], step: 0.05, default: 22 },
    ] },
    { id: "faceplate", label: "FACEPLATE", live: "commit", fields: [
      { id: "vinylOut", type: "mm", label: "overhang", range: [0, 5], step: 0.05, default: 1.4, help: "vinyl past every electrode" },
      { id: "vinylRailClr", type: "mm", label: "rail clearance", range: [0, 6], step: 0.05, default: 3 },
      { id: "accentInset", type: "mm", label: "accent inset", range: [0, 8], step: 0.05, default: 1.6 },
    ] },
    { id: "brand", label: "BRAND", live: "commit", fields: [
      { id: "brand", type: "bool", label: "brand in copper", default: false,
        help: "decoration in the foil; off puts the mark on the printed faceplate only" },
      { id: "markSize", type: "mm", label: "mark", range: [5, 40], step: 0.05, default: 13 },
      { id: "markX", type: "mm", label: "mark x", range: [0, 300], step: 0.05, default: 6 },
      { id: "markY", type: "mm", label: "mark y", range: [0, 300], step: 0.05, default: 124 },
      { id: "wmCap", type: "mm", label: "wordmark cap", range: [2, 20], step: 0.05, default: 5.2 },
      { id: "wmX", type: "mm", label: "wordmark x", range: [0, 300], step: 0.05, default: 21 },
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
export type SplineParams = ParamsOf<typeof chase>;
