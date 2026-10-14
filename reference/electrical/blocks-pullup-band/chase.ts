// reference/electrical/blocks-pullup-band/chase.ts
// M05-T07 (D-077, C-03): the BLOCKS undefined-band result reproduced from
// circuit.solve on the BOSS button scenes, at BOSS v1 values while D-087 is
// open. The scenes are BOSS's own element lists (scene.legacy), dumped by
// tools/legacy/boss/dump-elements.cjs --table from
// designs/blocks/legacy/boss-src: the c3mini press seat, BUTTON pressed,
// IO2 in PULLUP, two equal wires IO2 to A and GND to B (M05-T07 step 1).
// circuit.solve reads the element lists and classifies IO2 against the
// rp2040 and esp32-c3 pin rows; no geometry is extracted.
//
// The bodies are the two wire cores of the default table scene, 80 mm of
// conductive PLA each, as BOSS's WIRE builds its core: 1.2 mm wide
// (parts.js line 328, coreW) and 0.96 mm tall (zc0 0.48 to zc1 1.44,
// BOSS record 5.7), on the 8.0 mm stud pitch (boss.js STD.P). They give
// parity a Part; circuit.solve does not read them.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "electrical-blocks-pullup-band", kind: "single", name: "BLOCKS PULLUP BAND", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  // BOSS slot 2 is conductive PLA at 30 ohm cm, "Protopasta in plane" (boss.js SLOTS).
  materials: [
    { slot: 1, material: "cpla-protopasta", role: "conductor", label: "wire cores", preview: "#1A1A1A" },
  ],
  params: [
    { id: "wire", label: "WIRE", live: "commit", fields: [
      { id: "lenMm", type: "mm", label: "length", range: [10, 200], step: 1, default: 80,
        help: "wire length, BOSS WIRE len; the table runs 10 to 200 mm" },
      { id: "coreW", type: "mm", label: "core width", range: [0.8, 2.4], step: 0.1, default: 1.2 },
      { id: "coreT", type: "mm", label: "core height", range: [0.48, 1.92], step: 0.24, default: 0.96 },
      { id: "pitchMm", type: "mm", label: "pitch", range: [4, 16], step: 0.5, default: 8,
        help: "wire to wire spacing, the BOSS stud pitch" },
    ] },
  ],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }],
  assertions: [],
  scene: {
    nets: "contact",
    legacy: { sim: "boss", elements: "./scenes", pin: "IO2", mcus: ["rp2040", "esp32-c3"] },
  },
});

/** The params type a build function sees. */
export type BlocksBandParams = ParamsOf<typeof chase>;
