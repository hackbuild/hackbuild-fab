// reference/copper/stave/chase.surface.ts
// A surface chase (D-126), named apart from chase.ts for the reason
// reference/copper/_harness/vinyl.ts gives (M05-T14 card defects).
//
// STAVE rev A, the scale strip of the KEYWAY family (M05-T15): eight keys
// cut from one slab by chevron seams, two long sliders across the ends and
// 12 contacts in one row down the left edge, sized to cut from one pass of
// 4 inch copper tape (knowledge/designs/stave.md).
//
// Every default is the P dict of the canonical generator,
// reference/copper/stave/legacy/gen_stave.py lines 38 to 54 (lineage
// stave.generator/rev-a), one field per value; a tuple becomes one field
// per member, and the computed lane tuple (line 46, 35.0 - 2.8 i for six i)
// is its three literals. Each numeric default lands on its 0.05 step from
// the range minimum (G-09).

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "copper-stave", kind: "surface", name: "STAVE", version: 1, chase: 2,
    kernels: ["geom", "copper", "profile"], machines: ["cricut"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "copper-tape", role: "conductor", label: "copper" },
    { slot: 2, material: "chipboard-2", role: "backer", label: "backer" },
  ],
  params: [
    { id: "board", label: "BOARD", live: "commit", fields: [
      { id: "W", type: "mm", label: "width", range: [40, 300], step: 0.05, default: 96 },
      { id: "H", type: "mm", label: "height", range: [60, 400], step: 0.05, default: 250 },
      { id: "R", type: "mm", label: "corner", range: [0, 10], step: 0.05, default: 3.2 },
      { id: "edgeKeep", type: "mm", label: "edge keep", range: [0, 3], step: 0.05, default: 1, help: "copper keepout from the cut outline" },
      { id: "clr", type: "mm", label: "clearance gate", range: [0.3, 2], step: 0.05, default: 0.9, help: "least copper to copper distance between nets; also the fan margin" },
      { id: "tw", type: "mm", label: "trace", range: [0.8, 3], step: 0.05, default: 1.6 },
      { id: "smooth", type: "mm", label: "smooth", range: [0, 1], step: 0.05, default: 0.25, help: "closing then opening per net; 0.4 ate the lane gaps" },
      { id: "tapeW", type: "mm", label: "tape width", range: [20, 400], step: 0.05, default: 101.6, help: "the copper tape roll the board cuts from" },
    ] },
    { id: "rail", label: "RAIL", live: "commit", fields: [
      { id: "railN", type: "int", label: "fingers", range: [2, 30], step: 1, default: 12 },
      { id: "railH", type: "mm", label: "finger height", range: [3, 15], step: 0.05, default: 9 },
      { id: "railPitch", type: "mm", label: "pitch", range: [5, 25], step: 0.05, default: 12 },
      { id: "railX0", type: "mm", label: "rail x", range: [0, 20], step: 0.05, default: 2.5 },
      { id: "railDeep", type: "mm", label: "deep finger", range: [4, 30], step: 0.05, default: 14 },
      { id: "railShallow", type: "mm", label: "shallow finger", range: [4, 30], step: 0.05, default: 9 },
      { id: "railR", type: "mm", label: "finger corner", range: [0, 5], step: 0.05, default: 1.2 },
      { id: "laneFar", type: "mm", label: "farthest lane x", range: [0, 100], step: 0.05, default: 35, help: "vertical lanes, farthest from the rail first" },
      { id: "laneStep", type: "mm", label: "lane step", range: [1, 10], step: 0.05, default: 2.8 },
      { id: "laneCount", type: "int", label: "lanes", range: [1, 20], step: 1, default: 6 },
    ] },
    { id: "keys", label: "KEYS", live: "commit", fields: [
      { id: "keys", type: "int", label: "keys", range: [2, 16], step: 1, default: 8 },
      { id: "keyX0", type: "mm", label: "slab left", range: [0, 300], step: 0.05, default: 40 },
      { id: "keyY0", type: "mm", label: "slab bottom", range: [0, 400], step: 0.05, default: 50 },
      { id: "keyX1", type: "mm", label: "slab right", range: [0, 300], step: 0.05, default: 92 },
      { id: "keyY1", type: "mm", label: "slab top", range: [0, 400], step: 0.05, default: 200 },
      { id: "seam", type: "mm", label: "seam", range: [0.5, 5], step: 0.05, default: 1.6 },
      { id: "chev", type: "mm", label: "chevron", range: [0, 20], step: 0.05, default: 5 },
      { id: "keyRound", type: "mm", label: "rounding", range: [0, 5], step: 0.05, default: 2.2 },
    ] },
    { id: "sliders", label: "SLIDERS", live: "commit", fields: [
      { id: "lin0X0", type: "mm", label: "slider 1 left", range: [0, 300], step: 0.05, default: 40 },
      { id: "lin0Y0", type: "mm", label: "slider 1 bottom", range: [0, 400], step: 0.05, default: 8 },
      { id: "lin0X1", type: "mm", label: "slider 1 right", range: [0, 300], step: 0.05, default: 90 },
      { id: "lin0Y1", type: "mm", label: "slider 1 top", range: [0, 400], step: 0.05, default: 36 },
      { id: "lin1X0", type: "mm", label: "slider 2 left", range: [0, 300], step: 0.05, default: 40 },
      { id: "lin1Y0", type: "mm", label: "slider 2 bottom", range: [0, 400], step: 0.05, default: 214 },
      { id: "lin1X1", type: "mm", label: "slider 2 right", range: [0, 300], step: 0.05, default: 90 },
      { id: "lin1Y1", type: "mm", label: "slider 2 top", range: [0, 400], step: 0.05, default: 242 },
      { id: "linHmin", type: "mm", label: "thin end", range: [0.5, 10], step: 0.05, default: 3 },
      { id: "linGap", type: "mm", label: "diagonal gap", range: [0.5, 5], step: 0.05, default: 1.4 },
      { id: "linOff", type: "mm", label: "end offset", range: [0, 20], step: 0.05, default: 6 },
      { id: "linOuter0", type: "mm", label: "slider 1 outer run y", range: [0, 400], step: 0.05, default: 4, help: "B leaves through the outer margin" },
      { id: "linOuter1", type: "mm", label: "slider 2 outer run y", range: [0, 400], step: 0.05, default: 246 },
    ] },
    { id: "faceplate", label: "FACEPLATE", live: "commit", fields: [
      { id: "vinylOut", type: "mm", label: "overhang", range: [0, 5], step: 0.05, default: 1.4, help: "vinyl past every electrode" },
      { id: "vinylRailClr", type: "mm", label: "rail clearance", range: [0, 6], step: 0.05, default: 2.5 },
      { id: "accentInset", type: "mm", label: "accent inset", range: [0, 8], step: 0.05, default: 2.4 },
    ] },
    { id: "brand", label: "BRAND", live: "commit", fields: [
      { id: "brand", type: "bool", label: "brand in copper", default: false,
        help: "decoration in the foil; off puts the mark on the printed faceplate only" },
      { id: "markSize", type: "mm", label: "mark", range: [5, 40], step: 0.05, default: 11 },
      { id: "markX", type: "mm", label: "mark x", range: [0, 300], step: 0.05, default: 41 },
      { id: "markY", type: "mm", label: "mark y", range: [0, 400], step: 0.05, default: 201.5 },
      { id: "wmCap", type: "mm", label: "wordmark cap", range: [2, 20], step: 0.05, default: 4.4 },
      { id: "wmX", type: "mm", label: "wordmark x", range: [0, 300], step: 0.05, default: 54 },
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
export type StaveParams = ParamsOf<typeof chase>;
