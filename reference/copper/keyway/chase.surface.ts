// reference/copper/keyway/chase.surface.ts
// A surface chase (D-126): read as data by readChaseSource like any
// chase.ts and built by core's surface path (core/src/commands/surface.ts,
// hbf parity), and named apart because every reference/<area>/<id>/chase.ts
// is enumerated as a part.build reference (M05-T14 card defects).
//
// KEYWAY rev A, the first board of the KEYWAY family and its kernel's
// reference (M05-T14, D-092, D-063): a 2x2 velocity and pressure pad plus a
// graded slider with a top copper wiper, cut from adhesive copper foil with
// Velostat, two cardstock spacers, EVA caps, a chipboard backer and a
// print then cut guide on one shared outline (knowledge/designs/keyway.md).
//
// Every default is the P dict of the canonical generator,
// reference/copper/keyway/legacy/gen_keyway.py lines 39 to 62 (lineage
// keyway.generator/rev-a), one field per value; a tuple becomes one field
// per member. The route polylines and the guide's type sizes are the
// generator's own literals and live in build.ts with their line numbers.
// Each numeric default lands on its 0.05 mm step from the range minimum
// (G-09).

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "copper-keyway", kind: "surface", name: "KEYWAY", version: 1, chase: 2,
    kernels: ["geom", "copper", "profile"], machines: ["cricut"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "copper-tape", role: "conductor", label: "base copper" },
    { slot: 2, material: "velostat", role: "sheet", label: "velostat" },
    { slot: 3, material: "cardstock-030", role: "sheet", label: "spacers" },
    { slot: 4, material: "copper-tape", role: "conductor", label: "wiper" },
    { slot: 5, material: "eva-2", role: "sheet", label: "caps" },
    { slot: 6, material: "chipboard-2", role: "backer", label: "backer" },
  ],
  params: [
    { id: "board", label: "BOARD", live: "commit", fields: [
      { id: "W", type: "mm", label: "width", range: [60, 200], step: 0.05, default: 110 },
      { id: "H", type: "mm", label: "height", range: [100, 300], step: 0.05, default: 174 },
      { id: "R", type: "mm", label: "corner", range: [0, 10], step: 0.05, default: 3.2 },
      { id: "edgeKeep", type: "mm", label: "edge keep", range: [0, 3], step: 0.05, default: 1, help: "copper keepout from the cut outline" },
      { id: "clr", type: "mm", label: "clearance gate", range: [0.3, 2], step: 0.05, default: 0.7, help: "least copper to copper distance between nets" },
      { id: "tw", type: "mm", label: "trace", range: [0.8, 3], step: 0.05, default: 1.6 },
      { id: "smooth", type: "mm", label: "smooth", range: [0, 1], step: 0.05, default: 0.4, help: "closing then opening per net" },
    ] },
    { id: "zones", label: "ZONES", live: "commit", fields: [
      { id: "padW", type: "mm", label: "zone width", range: [10, 60], step: 0.05, default: 34 },
      { id: "padH", type: "mm", label: "zone height", range: [10, 60], step: 0.05, default: 34 },
      { id: "padX0", type: "mm", label: "left column x", range: [0, 100], step: 0.05, default: 13.5 },
      { id: "padX1", type: "mm", label: "right column x", range: [0, 100], step: 0.05, default: 62.5 },
      { id: "padY0", type: "mm", label: "lower row y", range: [0, 200], step: 0.05, default: 60 },
      { id: "padY1", type: "mm", label: "upper row y", range: [0, 200], step: 0.05, default: 100 },
      { id: "spineW", type: "mm", label: "spine", range: [1, 5], step: 0.05, default: 2.2 },
      { id: "fingW", type: "mm", label: "finger", range: [1, 4], step: 0.05, default: 1.8 },
      { id: "fingPitch", type: "mm", label: "finger pitch", range: [2, 6], step: 0.05, default: 3 },
      { id: "tipGap", type: "mm", label: "tip gap", range: [0.5, 3], step: 0.05, default: 1.4 },
    ] },
    { id: "bus", label: "BUS", live: "commit", fields: [
      { id: "busX0", type: "mm", label: "bus left", range: [0, 110], step: 0.05, default: 47.5 },
      { id: "busX1", type: "mm", label: "bus right", range: [0, 110], step: 0.05, default: 62.5 },
      { id: "busY0", type: "mm", label: "bus bottom", range: [0, 200], step: 0.05, default: 60 },
      { id: "busY1", type: "mm", label: "bus top", range: [0, 200], step: 0.05, default: 134 },
      { id: "koText", type: "text", label: "knockout", default: "KEYWAY", max: 12, help: "label knocked out of the bus as outlined type" },
      { id: "koCap", type: "mm", label: "knockout cap", range: [2, 12], step: 0.05, default: 7.5 },
      { id: "koY", type: "mm", label: "knockout y", range: [0, 200], step: 0.05, default: 74 },
    ] },
    { id: "escapes", label: "ESCAPES", live: "commit", fields: [
      { id: "slotSA", type: "mm", label: "slot sa", range: [0, 110], step: 0.05, default: 2.6 },
      { id: "slotP3", type: "mm", label: "slot p3", range: [0, 110], step: 0.05, default: 5.45 },
      { id: "slotP1", type: "mm", label: "slot p1", range: [0, 110], step: 0.05, default: 8.3 },
      { id: "slotP2", type: "mm", label: "slot p2", range: [0, 110], step: 0.05, default: 98.85 },
      { id: "slotP4", type: "mm", label: "slot p4", range: [0, 110], step: 0.05, default: 101.7 },
      { id: "slotSC", type: "mm", label: "slot sc", range: [0, 110], step: 0.05, default: 104.55 },
      { id: "slotSB", type: "mm", label: "slot sb", range: [0, 110], step: 0.05, default: 107.4 },
      { id: "hSA", type: "mm", label: "sa entry y", range: [0, 200], step: 0.05, default: 35 },
      { id: "hSB", type: "mm", label: "sb entry y", range: [0, 200], step: 0.05, default: 37 },
      { id: "hSC", type: "mm", label: "sc entry y", range: [0, 200], step: 0.05, default: 47 },
    ] },
    { id: "slider", label: "SLIDER", live: "commit", fields: [
      { id: "slY0", type: "mm", label: "band bottom", range: [0, 200], step: 0.05, default: 40 },
      { id: "slY1", type: "mm", label: "band top", range: [0, 200], step: 0.05, default: 54 },
      { id: "slGap", type: "mm", label: "diagonal gap", range: [0.5, 3], step: 0.05, default: 1.2 },
      { id: "slHmax", type: "mm", label: "a thick end", range: [1, 14], step: 0.05, default: 10.6 },
      { id: "slHmin", type: "mm", label: "a thin end", range: [1, 14], step: 0.05, default: 2.2 },
      { id: "slA0", type: "mm", label: "a spine left", range: [0, 110], step: 0.05, default: 13.5 },
      { id: "slA1", type: "mm", label: "a spine right", range: [0, 110], step: 0.05, default: 15.5 },
      { id: "slB0", type: "mm", label: "b spine left", range: [0, 110], step: 0.05, default: 87 },
      { id: "slB1", type: "mm", label: "b spine right", range: [0, 110], step: 0.05, default: 89 },
      { id: "slW0", type: "mm", label: "wedge left", range: [0, 110], step: 0.05, default: 15.5 },
      { id: "slW1", type: "mm", label: "wedge right", range: [0, 110], step: 0.05, default: 85.8 },
      { id: "scX0", type: "mm", label: "sc pad left", range: [0, 110], step: 0.05, default: 90.2 },
      { id: "scY0", type: "mm", label: "sc pad bottom", range: [0, 200], step: 0.05, default: 43 },
      { id: "scX1", type: "mm", label: "sc pad right", range: [0, 110], step: 0.05, default: 96.5 },
      { id: "scY1", type: "mm", label: "sc pad top", range: [0, 200], step: 0.05, default: 51 },
    ] },
    { id: "clips", label: "CLIPS", live: "commit", fields: [
      { id: "termX0", type: "mm", label: "first pad x", range: [0, 110], step: 0.05, default: 7 },
      { id: "termPitch", type: "mm", label: "pitch", range: [6, 20], step: 0.05, default: 12 },
      { id: "termSz", type: "mm", label: "pad", range: [4, 14], step: 0.05, default: 10 },
      { id: "termRow2Y", type: "mm", label: "row 2 y", range: [0, 200], step: 0.05, default: 146 },
      { id: "termRow1Y", type: "mm", label: "row 1 y", range: [0, 200], step: 0.05, default: 159 },
      { id: "fanY", type: "mm", label: "fan line y", range: [0, 200], step: 0.05, default: 134, help: "the bus top the fan leaves from; recorded, the routes carry their own points" },
      { id: "fanLane0", type: "mm", label: "lane 1 y", range: [0, 200], step: 0.05, default: 136 },
      { id: "fanLane1", type: "mm", label: "lane 2 y", range: [0, 200], step: 0.05, default: 138.6 },
      { id: "fanLane2", type: "mm", label: "lane 3 y", range: [0, 200], step: 0.05, default: 141.2 },
      { id: "fanLane3", type: "mm", label: "lane 4 y", range: [0, 200], step: 0.05, default: 143.8 },
      { id: "termOrder", type: "text", label: "field order", default: "SA P3 P1 COM GND P2 P4 SC SB", max: 64,
        help: "clip pads left to right; GND is the second COM tap" },
    ] },
    { id: "brand", label: "BRAND", live: "commit", fields: [
      { id: "brand", type: "bool", label: "brand in copper", default: false,
        help: "decoration in the foil; off puts the mark on the printed guide only" },
      { id: "bandY0", type: "mm", label: "brand band bottom", range: [0, 200], step: 0.05, default: 5, help: "recorded with the board; no geometry reads it" },
      { id: "bandY1", type: "mm", label: "brand band top", range: [0, 200], step: 0.05, default: 30.5 },
      { id: "markSize", type: "mm", label: "mark", range: [5, 40], step: 0.05, default: 24 },
      { id: "markX", type: "mm", label: "mark x", range: [0, 110], step: 0.05, default: 16.8 },
      { id: "markY", type: "mm", label: "mark y", range: [0, 200], step: 0.05, default: 5.5 },
      { id: "wmCap", type: "mm", label: "wordmark cap", range: [2, 20], step: 0.05, default: 9 },
      { id: "wmX", type: "mm", label: "wordmark x", range: [0, 110], step: 0.05, default: 46.8 },
      { id: "wmY1", type: "mm", label: "hack y", range: [0, 200], step: 0.05, default: 20.5 },
      { id: "wmY2", type: "mm", label: "build y", range: [0, 200], step: 0.05, default: 8.5 },
    ] },
    { id: "stack", label: "STACK", live: "commit", fields: [
      { id: "veloInset", type: "mm", label: "film inset", range: [0, 6], step: 0.05, default: 2 },
      { id: "spWinInset", type: "mm", label: "window inset", range: [0, 8], step: 0.05, default: 3 },
      { id: "spOut", type: "mm", label: "spacer outset", range: [0, 4], step: 0.05, default: 1 },
      { id: "foamInset", type: "mm", label: "cap inset", range: [0, 10], step: 0.05, default: 4 },
      { id: "veloSlX0", type: "mm", label: "slider film left", range: [0, 110], step: 0.05, default: 14 },
      { id: "veloSlY0", type: "mm", label: "slider film bottom", range: [0, 200], step: 0.05, default: 39.5 },
      { id: "veloSlX1", type: "mm", label: "slider film right", range: [0, 110], step: 0.05, default: 87.5 },
      { id: "veloSlY1", type: "mm", label: "slider film top", range: [0, 200], step: 0.05, default: 54.5 },
      { id: "spuX0", type: "mm", label: "upper spacer left", range: [0, 110], step: 0.05, default: 13 },
      { id: "spuY0", type: "mm", label: "upper spacer bottom", range: [0, 200], step: 0.05, default: 38.5 },
      { id: "spuX1", type: "mm", label: "upper spacer right", range: [0, 110], step: 0.05, default: 89.5 },
      { id: "spuY1", type: "mm", label: "upper spacer top", range: [0, 200], step: 0.05, default: 55.5 },
      { id: "slotX0", type: "mm", label: "slot left", range: [0, 110], step: 0.05, default: 16 },
      { id: "slotY0", type: "mm", label: "slot bottom", range: [0, 200], step: 0.05, default: 44.5 },
      { id: "slotX1", type: "mm", label: "slot right", range: [0, 110], step: 0.05, default: 85.5 },
      { id: "slotY1", type: "mm", label: "slot top", range: [0, 200], step: 0.05, default: 50.5 },
      { id: "wiperX0", type: "mm", label: "wiper left", range: [0, 110], step: 0.05, default: 15 },
      { id: "wiperY0", type: "mm", label: "wiper bottom", range: [0, 200], step: 0.05, default: 44 },
      { id: "wiperX1", type: "mm", label: "wiper right", range: [0, 110], step: 0.05, default: 96 },
      { id: "wiperY1", type: "mm", label: "wiper top", range: [0, 200], step: 0.05, default: 50 },
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
export type KeywayParams = ParamsOf<typeof chase>;
