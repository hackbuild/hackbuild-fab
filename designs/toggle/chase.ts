// designs/toggle/chase.ts
// TOGGLE, the printed tilt stick (knowledge/designs/toggle.md), as a
// chase. A chase declares and never computes (D-178): the defaults are the
// original's blankState (originals/toggle/files/src/src/part2a.js lines 16
// to 27: stick, body and phys), every range and step is its PANES row
// (part4.js lines 111 to 159), and the presets are its PRESETS patches
// (part2a.js lines 29 to 34). The stick is the tilt-stick archetype at
// those presets (packages/archetypes src/toggle/); build.ts places the
// host body, the terminals and the routed leads around it.
//
// Not carried: texture pitch (the archetype builds no texture until the
// lathe route takes a heightfield, so the row would act on nothing), the
// cPLA resistivity (profile owns it: cpla-protopasta printed along, 30
// ohm cm), and the print rows layer, body grid, copies and bed (the
// machine preset owns the layer; the kernel meshes without a raster).
//
// Slots are T.SLOTS (part2a.js lines 9 to 14, toggle.md 4): 1 PETG body,
// 2 conductive PLA, 3 TPU, 4 conductive TPU.
//
// Hookup: each direction pad reads LOW on a plain input with a pull up
// (toggle.md 5.7), the TOGGLE rule: the next E12 value at or above ten
// times the switch path, 470 kohm at solo4 over Protopasta 30 ohm cm
// (computed, inferred tier, tilt-stick limits). The GP pins are a choice,
// GP2 upward in sector order from east; COM goes to GND. A solo4 build has
// no dir4 to dir7, so those entries apply to the eight way presets only.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "toggle", kind: "single", name: "TOGGLE", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "copper", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body", preview: "#F5F0E6" },
    { slot: 2, material: "cpla", role: "conductor", label: "conductive pla", preview: "#1A1A1A" },
    { slot: 3, material: "tpu95", role: "flex", label: "stick", preview: "#FE0386" },
    { slot: 4, material: "ctpu", role: "flex-conductor", label: "collar", preview: "#8A8A8A" },
  ],
  params: [
    { id: "stem", label: "STEM", live: "commit", note: "the tpu neck is the spring and the pivot. the collar cones out, runs a band tapered by the contact tilt, then cones back in.", fields: [
      { id: "neckD", type: "mm", label: "neck dia", range: [1.6, 6], step: 0.1, default: 3.2 },
      { id: "neckL", type: "mm", label: "neck length", range: [0.48, 6], step: 0.24, default: 2.4 },
      { id: "collarD", type: "mm", label: "collar dia", range: [5, 20], step: 0.1, default: 8.8 },
      { id: "bandH", type: "mm", label: "band height", range: [1.2, 6], step: 0.1, default: 2.4 },
      { id: "stemD", type: "mm", label: "stem dia", range: [1.6, 12], step: 0.1, default: 6 },
    ] },
    { id: "travel", label: "TRAVEL", live: "commit", note: "contact tilt sets the well radius. the lip hole is solved so the stem lands on it at contact plus overtravel.", fields: [
      { id: "tilt", type: "deg", label: "contact tilt", range: [4, 25], step: 0.5, default: 14 },
      { id: "over", type: "deg", label: "overtravel", range: [0.5, 8], step: 0.5, default: 2 },
      { id: "gate", type: "enum", label: "gate", default: "round", options: [
        { value: "round", label: "round" }, { value: "square", label: "square" }, { value: "octagon", label: "octagon" },
      ] },
    ] },
    { id: "cap", label: "THUMB CAP", live: "commit", fields: [
      { id: "capD", type: "mm", label: "cap dia", range: [6, 30], step: 0.2, default: 14 },
      { id: "rimT", type: "mm", label: "rim", range: [0.48, 4], step: 0.12, default: 1.2 },
      { id: "top", type: "enum", label: "top", default: "dish", options: [
        { value: "dish", label: "dish" }, { value: "dome", label: "dome" }, { value: "flat", label: "flat" },
      ] },
      { id: "topH", type: "mm", label: "top height", range: [0, 4], step: 0.1, default: 1.2 },
      { id: "edge", type: "mm", label: "edge round", range: [0.3, 5], step: 0.1, default: 1.6 },
      { id: "dish", type: "mm", label: "dish or dome", range: [0, 3], step: 0.1, default: 0.7, showWhen: { field: "top", notEquals: "flat" } },
      { id: "tex", type: "enum", label: "texture", default: "dots", help: "only none builds; a texture warns and the cap prints smooth", options: [
        { value: "dots", label: "dots" }, { value: "rings", label: "rings" }, { value: "ribs", label: "ribs" },
        { value: "knurl", label: "knurl" }, { value: "none", label: "none" },
      ] },
      { id: "texH", type: "mm", label: "texture depth", range: [0, 1], step: 0.05, default: 0.3, showWhen: { field: "tex", notEquals: "none" } },
    ] },
    { id: "base", label: "BASE", live: "commit", fields: [
      { id: "base", type: "enum", label: "base", default: "solo", options: [{ value: "solo", label: "solo" }, { value: "blocks", label: "blocks" }] },
      { id: "dirs", type: "int", label: "directions", range: [4, 8], step: 4, default: 4, help: "4 way or 8 way" },
    ] },
    { id: "solo", label: "SOLO BODY", live: "commit", showWhen: { field: "base", equals: "solo" },
      note: "header: male 2.54 mm pins press up into conductive pla cups from below. pads: flush bottom pads for pogo pins or copper tape.", fields: [
        { id: "outline", type: "enum", label: "outline", default: "square", options: [{ value: "square", label: "square" }, { value: "round", label: "round" }] },
        { id: "auto", type: "bool", label: "auto size", default: true },
        { id: "size", type: "mm", label: "size", range: [10, 60], step: 0.2, default: 18, showWhen: { field: "auto", equals: false } },
        { id: "term", type: "enum", label: "terminals", default: "header", options: [
          { value: "header", label: "header" }, { value: "wire", label: "wire" }, { value: "pads", label: "pads" },
        ] },
        // The build snaps the depth up to a layer (part2d.js line 431); the original's 0.24 step from
        // 1.5 misses its own 3.0 default, so the row steps 0.1 as the other length rows do.
        { id: "pinDepth", type: "mm", label: "pin depth", range: [1.5, 6], step: 0.1, default: 3, showWhen: { field: "term", notEquals: "pads" } },
        { id: "bore", type: "mm", label: "wire bore", range: [0.6, 2], step: 0.05, default: 1.2, showWhen: { field: "term", equals: "wire" } },
      ] },
    { id: "brick", label: "BLOCKS BRICK", live: "commit", showWhen: { field: "base", equals: "blocks" }, fields: [
      { id: "pegs", type: "enum", label: "pegs", default: "both", options: [
        { value: "both", label: "both" }, { value: "bottom", label: "bottom" }, { value: "top", label: "top only" },
      ] },
      { id: "plain", type: "enum", label: "plain sockets", default: "tpu", options: [{ value: "tpu", label: "tpu ring" }, { value: "petg", label: "petg bore" }] },
      { id: "studs", type: "int", label: "body studs", range: [0, 6], step: 1, default: 0, help: "0 is auto: the fewest studs that hold the collar" },
    ] },
    { id: "contacts", label: "CONTACTS", live: "commit", note: "direction pads sit below, the common ring above, split by a few petg layers. the tilted band touches both and closes that direction.", fields: [
      { id: "padD", type: "mm", label: "pad depth", range: [0.5, 1.6], step: 0.1, default: 0.8 },
      { id: "split", type: "int", label: "split layers", range: [1, 4], step: 1, default: 2 },
      { id: "gap", type: "mm", label: "sector gap", range: [0.4, 3], step: 0.1, default: 0.8 },
      { id: "margin", type: "mm", label: "zone margin", range: [0.2, 1.5], step: 0.1, default: 0.5 },
    ] },
    { id: "phys", label: "PHYSICS", live: "commit", fold: { label: "physics", fields: ["pivot", "E", "rhoT", "rc", "vcc", "minGap"] },
      note: "pivot is where the neck bends, as a fraction of its length. contact r is per touching surface; measure your spools.", fields: [
        { id: "pivot", type: "ratio", label: "pivot", range: [0.3, 1.2], step: 0.05, default: 1 },
        { id: "E", type: "number", unit: "MPa", label: "tpu modulus", range: [5, 80], step: 1, default: 26 },
        { id: "rhoT", type: "number", unit: "ohm cm", label: "ctpu rho", range: [50, 20000], step: 50, default: 1500 },
        { id: "rc", type: "number", unit: "kohm", label: "contact r", range: [0, 50], step: 0.5, default: 5 },
        { id: "vcc", type: "number", unit: "V", label: "logic", range: [1.8, 5], step: 0.1, default: 3.3 },
        { id: "minGap", type: "mm", label: "print gap", range: [0.2, 0.8], step: 0.05, default: 0.4 },
      ] },
    { id: "print", label: "PRINT", live: "commit", fields: [
      { id: "route", type: "enum", label: "trace layers", default: "auto", help: "auto tries one layer, then two", options: [
        { value: "auto", label: "auto" }, { value: "1", label: "1" }, { value: "2", label: "2" },
      ] },
    ] },
  ],
  presets: [
    { id: "solo4", label: "solo 4 way", params: {}, note: "square body, five header pins, breadboard ready." },
    { id: "solo8", label: "solo 8 way", params: { dirs: 8 }, note: "eight pads decoded by centroid, nine pins." },
    { id: "blocks8", label: "blocks 8 way", params: { base: "blocks", dirs: 8 }, note: "three stud ledge rows, every net on a stud." },
  ],
  build: { module: "./build.ts", fn: "build" },
  // The original's PETG walls are kept, not widened onto the 0.42 mm line
  // grid (D-615, D-629): 0.64 mm between pin cups and 0.8 mm to the edge
  // (part2d.js lines 62 to 87), and at blocks8 the 1.60 mm socket to
  // footprint edge. The report still lists the CHK-PRT-04 measurement.
  waive: [
    { check: "CHK-PRT-04", target: "toggle", reason: "D-615: the original's walls are kept (0.64 mm between cups, 0.8 mm to the edge, 1.60 mm socket edge at blocks8); widening them is an owner call" },
  ],
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }, { kind: "json" }],
  hookup: [
    { port: "tilt-stick.0.port.dir0", mcu: "rp2040", pin: "GP2", read: { model: "pullup", active: "low", externalOhm: { auto: "e12", ratio: 10 } } },
    { port: "tilt-stick.0.port.dir1", mcu: "rp2040", pin: "GP3", read: { model: "pullup", active: "low", externalOhm: { auto: "e12", ratio: 10 } } },
    { port: "tilt-stick.0.port.dir2", mcu: "rp2040", pin: "GP4", read: { model: "pullup", active: "low", externalOhm: { auto: "e12", ratio: 10 } } },
    { port: "tilt-stick.0.port.dir3", mcu: "rp2040", pin: "GP5", read: { model: "pullup", active: "low", externalOhm: { auto: "e12", ratio: 10 } } },
    { port: "tilt-stick.0.port.dir4", mcu: "rp2040", pin: "GP6", read: { model: "pullup", active: "low", externalOhm: { auto: "e12", ratio: 10 } } },
    { port: "tilt-stick.0.port.dir5", mcu: "rp2040", pin: "GP7", read: { model: "pullup", active: "low", externalOhm: { auto: "e12", ratio: 10 } } },
    { port: "tilt-stick.0.port.dir6", mcu: "rp2040", pin: "GP8", read: { model: "pullup", active: "low", externalOhm: { auto: "e12", ratio: 10 } } },
    { port: "tilt-stick.0.port.dir7", mcu: "rp2040", pin: "GP9", read: { model: "pullup", active: "low", externalOhm: { auto: "e12", ratio: 10 } } },
  ],
  assertions: [],
});

export type ToggleParams = ParamsOf<typeof chase>;
