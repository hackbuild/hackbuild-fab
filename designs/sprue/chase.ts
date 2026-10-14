// designs/sprue/chase.ts
// SPRUE, the two colour giveaway coin and 351 pick (knowledge/designs/
// sprue.md), as a chase. A chase declares and never computes (D-178): the
// defaults are the bench state after its boot preset phx (legacy sprue.html
// ST at line 956, PRESETS.phx at line 980), every range is the bench slider
// range (sprue.html lines 147 to 170), and the colours are the bench's
// white body and black inlay (ST.colWhite, ST.colBlack). The layer height
// is the machine preset's (profile), never a param.
//
// Face art: the bench sets text in the browser; node has no font outline
// route (geom vector surface), so the build offers the vector art sprue.py
// ships for the pick, the lightning bolt (sprue.py motif_bolt, line 312),
// and the text faces stay with the browser parity (test/parity.entry.ts).
//
// Five numbers have no slider in the bench and are params here so build.ts
// types none: the coin ring inset 1.5 (ST.ringIn, line 957), the edge break
// steps 0.16 for a coin and 0.30 for a pick (breakStep, line 1000; sprue.py
// SPECS lines 54 to 59), the keyring hole centre 10.4 above the pick centre
// at scale 1 (holeSpec, line 1003) and the 0.9 art keepout round the hole
// and inside the ring (geo, lines 1029 and 1031); their ranges are inferred.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "sprue", kind: "single", name: "SPRUE", version: 1, chase: 2,
    kernels: ["geom", "mesh", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0", aliases: ["giveaway-coin", "pick-351"],
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "white", preview: "#FFFFFF" },
    { slot: 2, material: "petg", role: "art", label: "black", preview: "#000000" },
  ],
  params: [
    { id: "shape", label: "SHAPE", live: "commit", fields: [
      { id: "kind", type: "enum", label: "blank", default: "pick", options: [
        { value: "pick", label: "guitar pick" }, { value: "coin", label: "coin" },
      ] },
      { id: "pickScale", type: "ratio", label: "scale", range: [0.8, 1.4], step: 0.05, default: 1,
        showWhen: { field: "kind", in: ["pick"] } },
      { id: "pickThk", type: "mm", label: "thickness", range: [0.72, 2.4], step: 0.24, default: 1.2,
        showWhen: { field: "kind", in: ["pick"] } },
      { id: "pickHole", type: "bool", label: "keyring hole", default: true, showWhen: { field: "kind", in: ["pick"] } },
      { id: "holeD", type: "mm", label: "hole dia", range: [2, 6], step: 0.25, default: 3.5,
        showWhen: { field: "kind", in: ["pick"] } },
      { id: "holeY", type: "mm", label: "hole height", range: [8, 12], step: 0.1, default: 10.4,
        showWhen: { field: "kind", in: ["pick"] }, help: "no slider in the bench; above the pick centre at scale 1, scaled with the pick" },
      { id: "coinD", type: "mm", label: "diameter", range: [24, 60], step: 1, default: 36,
        showWhen: { field: "kind", in: ["coin"] } },
      { id: "coinThk", type: "mm", label: "thickness", range: [1.44, 4.8], step: 0.24, default: 2.4,
        showWhen: { field: "kind", in: ["coin"] } },
      { id: "ring", type: "bool", label: "black border ring", default: true, showWhen: { field: "kind", in: ["coin"] } },
      { id: "ringW", type: "mm", label: "ring width", range: [0.4, 2], step: 0.1, default: 0.8,
        showWhen: { field: "kind", in: ["coin"] } },
      { id: "ringIn", type: "mm", label: "ring inset", range: [0.5, 4], step: 0.1, default: 1.5,
        showWhen: { field: "kind", in: ["coin"] }, help: "no slider in the bench; ST.ringIn" },
    ] },
    { id: "inlay", label: "INLAY", live: "commit", fields: [
      { id: "inlay", type: "int", label: "inlay layers", range: [1, 4], step: 1, default: 2,
        help: "two layers of black hide white; white over black needs the profile opacity floor" },
      { id: "breakL", type: "int", label: "edge break", range: [0, 2], step: 1, default: 1 },
      { id: "breakStepPick", type: "mm", label: "pick break step", range: [0.05, 0.6], step: 0.01, default: 0.3,
        showWhen: { field: "kind", in: ["pick"] }, help: "no slider in the bench" },
      { id: "breakStepCoin", type: "mm", label: "coin break step", range: [0.05, 0.6], step: 0.01, default: 0.16,
        showWhen: { field: "kind", in: ["coin"] }, help: "no slider in the bench" },
      { id: "margin", type: "mm", label: "art margin", range: [0.6, 4], step: 0.1, default: 1.6 },
      { id: "keep", type: "mm", label: "art keepout", range: [0.3, 2], step: 0.1, default: 0.9,
        help: "no slider in the bench; air kept round the keyring hole and inside the coin ring" },
    ] },
    { id: "art", label: "ART", live: "commit", fields: [
      { id: "front", type: "enum", label: "front art", default: "bolt", options: [
        { value: "bolt", label: "lightning bolt" }, { value: "none", label: "none" },
      ] },
      { id: "back", type: "enum", label: "back art", default: "none", options: [
        { value: "bolt", label: "lightning bolt" }, { value: "none", label: "none" },
      ], help: "the bed face, mirrored in the mesh" },
    ] },
  ],
  presets: [
    { id: "coin", label: "blank coin", params: { kind: "coin", inlay: 3, breakL: 2 } },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }, { kind: "card" }],
  assertions: [],
});

/** The params type a build function sees. */
export type SprueParams = ParamsOf<typeof chase>;
