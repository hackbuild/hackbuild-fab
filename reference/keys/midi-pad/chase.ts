// reference/keys/midi-pad/chase.ts
// A MIDI touch pad on the four-toolhead ffc5p, promoted from flagship 1
// (fab-knowledge evals/2026-10-13/flagship-midi-pad.md) once a press-fit
// board seat could end a read path (K-04). Four flex cone keys
// (flex-cone-key, pip.md 5.1, reference buttons/flex-cone), a printed
// membrane fader (membrane-slider-thinpot, thinpot.md 4.5, reference
// sensors/membrane-slider-thinpot) and a press-fit RP2040-Zero seat
// (rp2040-zero-seat, pip.md 5.7, reference seats/rp2040-zero-pressfit) on
// one PETG body with the PIP buried stack (profile stack rows, reference
// electrical/pip-buried-route). A chase declares and never computes
// (D-178); the layout is in build.ts.
//
// Materials are PIP's four slots (layout.js lines 47 to 52), which the
// three archetypes share. The TANG wall slider (reference
// sensors/membrane-slider) asks for PLA and Proto-pasta cPLA, two more
// slots than the printer has, so the fader is the THINPOT strip.
//
// Hookup: each key is read by charge-release with PIP's 3500 us wait
// until a coupon calibrates it (D-079, waitSource default, inferred). Each
// key port names the GP pin the seat lands its net on; circuit.solve
// refuses an entry whose pin is not the seat's. The fader wiper T2 reads
// on GP26, an RP2040 ADC input: 12 bits (vendor, RP2040 datasheet ADC),
// reference 3.3 V on the 3V3 rail (inferred), one sample per read (a
// choice).
//
// The wiper lead width 2.8 mm is the first 0.05 mm step over the 2.78 mm
// floor constraints.query returned in the flagship run for a 75000 ohm
// budget over 30 mm of cpla 0.72 mm thick (computed, tier inferred). That
// budget leaves out the seat post and the T2 post, which the seat tap now
// prices; README.md gives the whole path.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "keys-midi-pad", kind: "single", name: "MIDI PAD", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
    { slot: 2, material: "cpla", role: "conductor", label: "traces", preview: "#1A1A1A" },
    { slot: 3, material: "tpu95", role: "flex", label: "keys and membrane", preview: "#FE0386" },
    { slot: 4, material: "ctpu", role: "flex-conductor", label: "caps and collector", preview: "#6E6E6E" },
  ],
  params: [
    { id: "keys", label: "KEYS", live: "commit", fields: [
      { id: "pitch", type: "mm", label: "key pitch", range: [17, 24], step: 0.05, default: 19.05,
        help: "centre to centre; 19.05 is the keyboard key pitch" },
    ] },
    { id: "fader", label: "FADER", live: "commit", fields: [
      { id: "len", type: "mm", label: "throw", range: [40, 100], step: 1, default: 60, help: "active track length" },
      { id: "wW", type: "mm", label: "wiper lead", range: [1.4, 3.85], step: 0.05, default: 2.8, constraintDim: "conductor.width",
        help: "width of the gp26 lead to the collector terminal" },
    ] },
    { id: "body", label: "BODY", live: "commit", fields: [
      { id: "wall", type: "mm", label: "wall", range: [2, 6], step: 0.5, default: 3, help: "body past the board pocket, the outer lane and the key wells" },
    ] },
  ],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }],
  hookup: [
    { port: "flex-cone-key.0.port.key", mcu: "rp2040", pin: "GP8",
      read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } },
    { port: "flex-cone-key.1.port.key", mcu: "rp2040", pin: "GP7",
      read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } },
    { port: "flex-cone-key.2.port.key", mcu: "rp2040", pin: "GP6",
      read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } },
    { port: "flex-cone-key.3.port.key", mcu: "rp2040", pin: "GP5",
      read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } },
    { port: "rp2040-zero-seat.0.port.GP26", mcu: "rp2040", pin: "GP26",
      read: { model: "adc", bits: 12, samples: 1, refV: 3.3 } },
  ],
  assertions: [],
});

export type MidiPadParams = ParamsOf<typeof chase>;
