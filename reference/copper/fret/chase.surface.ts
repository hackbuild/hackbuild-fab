// reference/copper/fret/chase.surface.ts
// A surface chase (D-126), named apart from chase.ts for the reason
// reference/copper/_harness/vinyl.ts gives (M05-T14 card defects).
//
// FRET rev A, the playable board of the KEYWAY family (M05-T15): fifteen
// flat-top hex keys in a Wicki-Hayden lattice (up a column +2, up-right +7,
// down-right +5) routed down zigzag grout ribbons, two flank sliders, one
// arc across the top and 21 contacts in one row (knowledge/designs/fret.md).
// The generator's docstring says 16 keys and 22 contacts; its P dict draws
// 15 and 21, and the P dict is what this chase carries.
//
// Every default is the P dict of the canonical generator,
// reference/copper/fret/legacy/gen_fret.py lines 39 to 63 (lineage
// fret.generator/rev-a), one field per value; a tuple becomes one field
// per member, and the computed lane tuple (line 60, 54.0 - 3.0 i for
// twelve i) is its three literals. Each numeric default lands on its 0.05
// step from the range minimum (G-09).

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "copper-fret", kind: "surface", name: "FRET", version: 1, chase: 2,
    kernels: ["geom", "copper", "profile"], machines: ["cricut"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "copper-tape", role: "conductor", label: "copper" },
    { slot: 2, material: "chipboard-2", role: "backer", label: "backer" },
  ],
  params: [
    { id: "board", label: "BOARD", live: "commit", fields: [
      { id: "W", type: "mm", label: "width", range: [60, 400], step: 0.05, default: 248 },
      { id: "H", type: "mm", label: "height", range: [60, 400], step: 0.05, default: 244 },
      { id: "R", type: "mm", label: "corner", range: [0, 10], step: 0.05, default: 3.2 },
      { id: "edgeKeep", type: "mm", label: "edge keep", range: [0, 3], step: 0.05, default: 1, help: "copper keepout from the cut outline" },
      { id: "clr", type: "mm", label: "clearance gate", range: [0.3, 2], step: 0.05, default: 0.9, help: "least copper to copper distance between nets; also the fan margin" },
      { id: "tw", type: "mm", label: "trace", range: [0.8, 3], step: 0.05, default: 1.6 },
      { id: "smooth", type: "mm", label: "smooth", range: [0, 1], step: 0.05, default: 0.25, help: "closing then opening per net" },
    ] },
    { id: "lattice", label: "LATTICE", live: "commit", fields: [
      { id: "cols", type: "int", label: "columns", range: [1, 10], step: 1, default: 5 },
      { id: "rows", type: "int", label: "rows", range: [1, 10], step: 1, default: 3 },
      { id: "hexS", type: "mm", label: "hex side", range: [5, 50], step: 0.05, default: 21, help: "columns sit on 1.5 sides so they interlock" },
      { id: "hexSeam", type: "mm", label: "seam", range: [1, 15], step: 0.05, default: 6 },
      { id: "hexRound", type: "mm", label: "rounding", range: [0, 10], step: 0.05, default: 2.6 },
      { id: "keyX0", type: "mm", label: "first column x", range: [0, 400], step: 0.05, default: 64 },
      { id: "keyY0", type: "mm", label: "lattice bottom", range: [0, 400], step: 0.05, default: 58 },
      { id: "subGap", type: "mm", label: "ribbon shift", range: [1, 10], step: 0.05, default: 3.2, help: "a sideways shift of the zigzag; spacing is shift x sin 60" },
      { id: "lchan", type: "mm", label: "left channel x", range: [0, 400], step: 0.05, default: 34 },
      { id: "base", type: "int", label: "lowest note", range: [0, 127], step: 1, default: 48, help: "midi note of the bottom left key, C3" },
    ] },
    { id: "straight", label: "STRAIGHT", live: "commit", fields: [
      { id: "lin0X0", type: "mm", label: "slider 1 left", range: [0, 400], step: 0.05, default: 12 },
      { id: "lin0X1", type: "mm", label: "slider 1 right", range: [0, 400], step: 0.05, default: 32 },
      { id: "lin1X0", type: "mm", label: "slider 2 left", range: [0, 400], step: 0.05, default: 216 },
      { id: "lin1X1", type: "mm", label: "slider 2 right", range: [0, 400], step: 0.05, default: 236 },
      { id: "linY0", type: "mm", label: "bottom", range: [0, 400], step: 0.05, default: 64 },
      { id: "linY1", type: "mm", label: "top", range: [0, 400], step: 0.05, default: 186 },
      { id: "linHmin", type: "mm", label: "thin end", range: [0.5, 10], step: 0.05, default: 3 },
      { id: "linGap", type: "mm", label: "diagonal gap", range: [0.5, 5], step: 0.05, default: 1.4 },
      { id: "linOff", type: "mm", label: "end offset", range: [0, 20], step: 0.05, default: 6 },
      { id: "linCor0", type: "mm", label: "slider 1 corridor x", range: [0, 400], step: 0.05, default: 5.5 },
      { id: "linCor1", type: "mm", label: "slider 2 corridor x", range: [0, 400], step: 0.05, default: 242.5 },
    ] },
    { id: "arc", label: "ARC", live: "commit", fields: [
      { id: "arcCX", type: "mm", label: "centre x", range: [0, 400], step: 0.05, default: 124 },
      { id: "arcCY", type: "mm", label: "centre y", range: [0, 400], step: 0.05, default: 160.7 },
      { id: "arcR0", type: "mm", label: "inner radius", range: [5, 200], step: 0.05, default: 56 },
      { id: "arcR1", type: "mm", label: "outer radius", range: [5, 200], step: 0.05, default: 68 },
      { id: "arcA0", type: "deg", label: "from", range: [0, 180], step: 0.05, default: 38 },
      { id: "arcA1", type: "deg", label: "to", range: [0, 180], step: 0.05, default: 142 },
      { id: "arcHmin", type: "mm", label: "thin end", range: [0.5, 10], step: 0.05, default: 2.2 },
      { id: "arcGap", type: "mm", label: "diagonal gap", range: [0.5, 5], step: 0.05, default: 1.4 },
      { id: "arcOff", type: "deg", label: "end offset", range: [0, 20], step: 0.05, default: 4 },
      { id: "arcEsc", type: "deg", label: "escape inset", range: [0, 20], step: 0.05, default: 3 },
      { id: "arcRunY", type: "mm", label: "run y", range: [0, 400], step: 0.05, default: 189, help: "both ends step out sideways along this clear row" },
      { id: "arcOut", type: "mm", label: "b drop x", range: [0, 400], step: 0.05, default: 208, help: "ARC B drops in the gap right of the keys" },
    ] },
    { id: "rail", label: "RAIL", live: "commit", fields: [
      { id: "railN", type: "int", label: "fingers", range: [2, 30], step: 1, default: 21 },
      { id: "railW", type: "mm", label: "finger width", range: [3, 15], step: 0.05, default: 9 },
      { id: "railPitch", type: "mm", label: "pitch", range: [5, 25], step: 0.05, default: 11 },
      { id: "railY0", type: "mm", label: "rail y", range: [0, 20], step: 0.05, default: 2.5 },
      { id: "railDeep", type: "mm", label: "deep finger", range: [4, 30], step: 0.05, default: 16 },
      { id: "railShallow", type: "mm", label: "shallow finger", range: [4, 30], step: 0.05, default: 11 },
      { id: "railR", type: "mm", label: "finger corner", range: [0, 5], step: 0.05, default: 1.2 },
      { id: "laneFar", type: "mm", label: "farthest lane y", range: [0, 400], step: 0.05, default: 54, help: "fan lanes, farthest from the rail first" },
      { id: "laneStep", type: "mm", label: "lane step", range: [1, 10], step: 0.05, default: 3 },
      { id: "laneCount", type: "int", label: "lanes", range: [1, 20], step: 1, default: 12 },
    ] },
    { id: "faceplate", label: "FACEPLATE", live: "commit", fields: [
      { id: "vinylOut", type: "mm", label: "overhang", range: [0, 5], step: 0.05, default: 1.4, help: "vinyl past every electrode" },
      { id: "vinylRailClr", type: "mm", label: "rail clearance", range: [0, 6], step: 0.05, default: 3 },
      { id: "accentInset", type: "mm", label: "accent inset", range: [0, 8], step: 0.05, default: 2.6 },
    ] },
    { id: "brand", label: "BRAND", live: "commit", fields: [
      { id: "brand", type: "bool", label: "brand in copper", default: false,
        help: "decoration in the foil; off puts the mark on the printed faceplate only" },
      { id: "markSize", type: "mm", label: "mark", range: [5, 40], step: 0.05, default: 12 },
      { id: "markX", type: "mm", label: "mark x", range: [0, 400], step: 0.05, default: 8 },
      { id: "markY", type: "mm", label: "mark y", range: [0, 400], step: 0.05, default: 30 },
      { id: "wmCap", type: "mm", label: "wordmark cap", range: [2, 20], step: 0.05, default: 5 },
      { id: "wmX", type: "mm", label: "wordmark x", range: [0, 400], step: 0.05, default: 22 },
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
export type FretParams = ParamsOf<typeof chase>;
