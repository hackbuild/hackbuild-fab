// reference/keys/key-bed/chase.ts
// A row of flex cone keys (flex-cone-key, pip.md 5.1) on a Raspberry Pi Pico
// press seat (pico-seat, D-667) in one PETG body with PIP's buried stack, the
// key count a param: the 2026-10-21 persona asked for a key bed on a Pico and
// midi-pad is fixed at four keys. Each key is read by charge-release on its
// own GPIO, GPIO0 onward down the Pico's left column; a chase cannot list one
// hookup entry per key of a count, so build.ts emits them (PartDraft.hookup,
// read after chase.hookup by spec hookupOf). A chase declares and never
// computes (D-178); the layout and routing are in build.ts.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "keys-key-bed", kind: "single", name: "KEY BED", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
    { slot: 2, material: "cpla", role: "conductor", label: "traces", preview: "#1A1A1A" },
    { slot: 3, material: "tpu95", role: "flex", label: "keys", preview: "#FE0386" },
    { slot: 4, material: "ctpu", role: "flex-conductor", label: "caps", preview: "#6E6E6E" },
  ],
  params: [
    { id: "keys", label: "KEYS", live: "commit", fields: [
      { id: "count", type: "int", label: "keys", range: [1, 13], step: 1, default: 8,
        help: "one GPIO each, GPIO0 onward on the Pico's left column; 8 is an octave of white keys, 13 at 19.05 mm fills the 256 mm build volume" },
      { id: "pitch", type: "mm", label: "key pitch", range: [17, 24], step: 0.05, default: 19.05,
        help: "centre to centre; 19.05 is the keyboard key pitch" },
    ] },
    { id: "body", label: "BODY", live: "commit", fields: [
      { id: "wall", type: "mm", label: "wall", range: [2, 6], step: 0.5, default: 3, help: "body past the board pocket, the lanes and the key wells" },
    ] },
  ],
  presets: [{ id: "default", label: "an octave of eight keys", params: {} }],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }, { kind: "json" }],
  assertions: [],
});

export type KeyBedParams = ParamsOf<typeof chase>;
