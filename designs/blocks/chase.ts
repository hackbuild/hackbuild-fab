// designs/blocks/chase.ts
// BLOCKS, the printed stud and socket system (knowledge/designs/blocks.md),
// as a chase, release 1 cut: one part at a time, from the parts whose
// archetypes are ported and proven (packages/archetypes/src/blocks: the
// stud and the wire). The board seat stays out: its archetype
// blocks-board-seat is refused, and BOSS's press seat routed by
// src/route-seat.ts fails CHK-NET-02 and CHK-PRT-04 by the standard's own
// stack (README). The scene composer and the other parts wait for
// M10-T10 and the engine's composer binding. A chase declares and never
// computes (D-178): which archetype runs, and every refusal, lives in
// build.ts.
//
// The brick standard has no default until a print (D-087): `standard`
// starts at "unset" and build.ts refuses a stud until one is chosen. The
// two presets are the two standard starts. The wire is ported on the
// blocks-html standard only (packages/archetypes/src/blocks/wire.ts), so
// the defaults build the wire.
//
// Sources: the slots are blocks.js lines 54 to 59 (as
// reference/conductors/blocks-stud cites them); the wire fields are
// WIRE_PARAMS, originals/blocks/files/src-extracted/parts.js lines 565 to
// 577, with the core select's slot numbers 4 and 2 written as the
// archetype's material ids; the brick height range and default are
// reference/conductors/blocks-stud's (brickBody, parts.js line 56); peg is
// the blocks-stud archetype's (blocks.js lines 186 to 220).

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "blocks", kind: "single", name: "BLOCKS", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0", aliases: ["boss"],
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
    { slot: 2, material: "cpla", role: "conductor", label: "conductor", preview: "#1A1A1A" },
    { slot: 3, material: "tpu95", role: "flex", label: "flex", preview: "#FE0386" },
    { slot: 4, material: "ctpu", role: "flex-conductor", label: "flex conductor", preview: "#6E6E6E" },
  ],
  params: [
    { id: "pick", label: "PART", live: "commit", fields: [
      { id: "part", type: "enum", label: "part", default: "wire", options: [
        { value: "wire", label: "printed wire" }, { value: "stud", label: "stud brick" },
      ] },
      { id: "standard", type: "enum", label: "brick standard", default: "unset",
        help: "two standards shipped and no print has chosen one (D-087). pick one before a stud builds.",
        options: [
          { value: "unset", label: "not chosen" }, { value: "boss-v1", label: "boss v1, 0.24 layers" },
          { value: "blocks-html", label: "blocks, 0.20 layers" },
        ] },
    ] },
    { id: "wire", label: "WIRE", live: "commit", showWhen: { field: "part", in: ["wire"] }, fields: [
      { id: "shape", type: "enum", label: "shape", default: "straight", options: [
        { value: "straight", label: "straight" }, { value: "arc", label: "arc" }, { value: "spiral", label: "spiral (coiled flat)" },
        { value: "zigzag", label: "zigzag" }, { value: "s", label: "s bend" },
      ] },
      { id: "len", type: "mm", label: "length", range: [10, 400], step: 1, default: 80 },
      { id: "core", type: "enum", label: "core material", default: "ctpu", options: [
        { value: "ctpu", label: "conductive tpu (flex)" }, { value: "cpla", label: "conductive pla (stiffer, lower r)" },
      ] },
      { id: "coreW", type: "mm", label: "core width", range: [0.8, 2.4], step: 0.1, default: 1.2 },
      { id: "sheathW", type: "mm", label: "sheath width", range: [2, 5], step: 0.1, default: 3.2 },
      { id: "endA", type: "enum", label: "end a", default: "stud", options: [
        { value: "stud", label: "peg cap (socket + stud)" }, { value: "down", label: "peg cap, socket only" },
        { value: "up", label: "peg cap, stud only" }, { value: "bare", label: "bare core" },
      ] },
      { id: "endB", type: "enum", label: "end b", default: "stud", options: [
        { value: "stud", label: "peg cap (socket + stud)" }, { value: "down", label: "peg cap, socket only" },
        { value: "up", label: "peg cap, stud only" }, { value: "bare", label: "bare core" },
      ] },
      { id: "radius", type: "mm", label: "arc / bend radius", range: [5, 100], step: 1, default: 30, showWhen: { field: "shape", in: ["arc", "s"] } },
      { id: "amp", type: "mm", label: "zigzag amplitude", range: [3, 30], step: 0.5, default: 8, showWhen: { field: "shape", in: ["zigzag"] } },
      { id: "period", type: "mm", label: "zigzag period", range: [6, 60], step: 0.5, default: 16, showWhen: { field: "shape", in: ["zigzag"] } },
      { id: "pitch", type: "mm", label: "spiral pitch", range: [4, 12], step: 0.5, default: 5.5, showWhen: { field: "shape", in: ["spiral"] } },
    ] },
    { id: "brick", label: "BRICK", live: "commit", showWhen: { field: "part", in: ["stud"] }, fields: [
      { id: "H", type: "mm", label: "height", range: [3.2, 12.8], step: 3.2, default: 9.6 },
      { id: "peg", type: "enum", label: "pegs", default: "both", options: [
        { value: "both", label: "socket under, stud over" }, { value: "down", label: "socket only" },
        { value: "up", label: "stud only" }, { value: "pad", label: "flush pad" },
      ] },
    ] },
  ],
  presets: [
    { id: "boss-v1", label: "boss v1 stud brick", params: { part: "stud", standard: "boss-v1" },
      note: "the boss v1 standard: 2.4 socket, 0.72 flange and traces, 0.24 layers. one conductive column on a one stud brick." },
    { id: "blocks-html", label: "blocks stud brick", params: { part: "stud", standard: "blocks-html" },
      note: "the blocks standard: 2.2 socket, 0.6 flange and traces, 0.20 layers. one conductive column on a one stud brick." },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }],
  assertions: [],
});

/** The params type a build function sees. */
export type BlocksParams = ParamsOf<typeof chase>;
