// designs/collar/chase.ts
// COLLAR, the challenge coin bench (knowledge/designs/collar.md), as a
// chase. A chase declares and never computes (D-178): the defaults below
// are the legacy `ST` literal at designs/collar/legacy/collar.html line 643
// (dia 44, thk 3.6, cham 0.5, inlay 1.2, layer 0.2, res 512, round blank,
// reeded edge 40 x 1.0 x 2.8, rim on 2.2 mm in slot 3, NFC off, faces
// empty), and every range is the legacy slider range (collar.html lines
// 315 to 498). The slots are DEF_SLOTS (collar.html lines 636 to 641) at
// nSlots 3. Face art moves with the art pipeline at M03, so this chase
// carries no art field and the faces are empty.
//
// The legacy layer 0.2 is written under the 0.24mm Standard @FF C5 process
// (collar.html line 647, plan-deltas R54); build.ts warns on it. The parity
// run keeps 0.2 to match legacy (M00-T11 step 7).

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "collar", kind: "single", name: "COLLAR", version: 1, chase: 2,
    kernels: ["geom", "mesh", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0", aliases: ["challenge-coin"],
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "black", preview: "#1A1A1A" },
    { slot: 2, material: "petg", role: "art", label: "cream", preview: "#F5F0E6" },
    { slot: 3, material: "petg", role: "art", label: "pink", preview: "#FE0386" },
  ],
  params: [
    { id: "blank", label: "BLANK", live: "commit", fields: [
      { id: "dia", type: "mm", label: "diameter", range: [20, 80], step: 0.5, default: 44 },
      { id: "thk", type: "mm", label: "thickness", range: [1.6, 8], step: 0.2, default: 3.6 },
      { id: "shape", type: "enum", label: "blank shape", default: "round", options: [
        { value: "round", label: "round" }, { value: "squircle", label: "squircle" },
        { value: "rounded", label: "rounded square" }, { value: "dogtag", label: "dog tag" },
        { value: "bar", label: "rounded bar" }, { value: "hex", label: "hexagon" },
        { value: "oct", label: "octagon" }, { value: "tri", label: "triangle" }, { value: "shield", label: "shield" },
      ] },
      { id: "aspect", type: "ratio", label: "proportion", range: [0.3, 1], step: 0.02, default: 0.72,
        showWhen: { field: "shape", in: ["dogtag", "bar"] } },
      { id: "corner", type: "ratio", label: "corner", range: [0.02, 1], step: 0.02, default: 0.3,
        showWhen: { field: "shape", in: ["rounded", "bar"] } },
    ] },
    { id: "edge", label: "EDGE", live: "commit", fields: [
      { id: "style", type: "enum", label: "edge", default: "reeded", options: [
        { value: "plain", label: "plain" }, { value: "reeded", label: "reeded" },
        { value: "milled", label: "milled V" }, { value: "square", label: "square groove" },
        { value: "openreed", label: "open reed" }, { value: "knurl", label: "diamond knurl" },
        { value: "rope", label: "rope" }, { value: "beaded", label: "beaded" },
        { value: "oblique", label: "oblique line" }, { value: "wave", label: "wave" },
        { value: "petal", label: "petal cut" }, { value: "lobed", label: "scalloped blank" },
      ] },
      { id: "count", type: "int", label: "count", range: [8, 160], step: 1, default: 40 },
      { id: "depth", type: "mm", label: "depth", range: [0.1, 2.5], step: 0.05, default: 1 },
      { id: "width", type: "mm", label: "width", range: [0.3, 6], step: 0.1, default: 2.8 },
      { id: "twist", type: "deg", label: "twist", range: [5, 80], step: 1, default: 35 },
      { id: "gapDeg", type: "deg", label: "blank arc", range: [0, 180], step: 5, default: 0 },
    ] },
    { id: "rim", label: "RIM", live: "commit", fields: [
      { id: "on", type: "bool", label: "rim band", default: true },
      { id: "w", type: "mm", label: "band width", range: [0.6, 6], step: 0.1, default: 2.2 },
      { id: "rimSlot", type: "slot", label: "band slot", default: 3 },
      { id: "dashOn", type: "bool", label: "edge spots", default: false },
      { id: "dashN", type: "int", label: "segments", range: [2, 48], step: 1, default: 12 },
      { id: "dashDuty", type: "number", unit: "percent", label: "duty", range: [5, 95], step: 1, default: 45 },
      { id: "dashSlot", type: "slot", label: "spot slot", default: 2 },
      { id: "dashAlt", type: "bool", label: "alternate", default: false },
      { id: "dashSlot2", type: "slot", label: "second spot slot", default: 1 },
      { id: "dashPhase", type: "deg", label: "phase", range: [0, 90], step: 1, default: 0 },
    ] },
    { id: "pocket", label: "POCKET", live: "commit", fields: [
      { id: "nfcOn", type: "bool", label: "insert pocket", default: false },
      { id: "tag", type: "mm", label: "tag", range: [6, 55], step: 0.5, default: 25 },
      { id: "nfcDia", type: "mm", label: "pocket", range: [8, 60], step: 0.5, default: 26 },
      { id: "nfcDepth", type: "mm", label: "pocket depth", range: [0.2, 3], step: 0.1, default: 0.6 },
    ] },
    { id: "print", label: "PRINT", live: "commit", fields: [
      { id: "inlay", type: "mm", label: "colour depth", range: [0.2, 2.4], step: 0.2, default: 1.2 },
      { id: "layer", type: "mm", label: "layer height", range: [0.06, 0.32], step: 0.02, default: 0.2 },
      { id: "cham", type: "mm", label: "edge break", range: [0, 2], step: 0.1, default: 0.5 },
      { id: "res", type: "int", label: "grid", range: [384, 1536], step: 128, default: 512, quality: true },
      { id: "nSlots", type: "int", label: "colours", range: [2, 4], step: 1, default: 3 },
      { id: "base", type: "slot", label: "body slot", default: 1 },
    ] },
  ],
  presets: [
    { id: "blank", label: "blank coin", params: { style: "plain", on: false } },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }, { kind: "card" }],
  assertions: [],
});

/** The params type a build function sees. */
export type CollarParams = ParamsOf<typeof chase>;
