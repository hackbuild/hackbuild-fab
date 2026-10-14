// reference/boards/shunt-art/chase.ts
// M08-T06 and M08-T09 (D-089, D-074): SHUNT R1, the KevinCon counterfeit
// Jumperless, a deliberately non-functional art board whose fab set is
// real. gen.py reads the committed board.json, runs the geometry gates G1
// to G6 and writes the fab set; G7, the inverted electrical gate, is the
// expect set below. Electrical gates stay off by declaration: the board
// ships with no cell in BT1 and DO NOT APPLY POWER on its silk (README).

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "boards-shunt-art", kind: "board", name: "SHUNT R1", version: 1, chase: 2,
    kernels: ["board"], machines: [],
    license: "CERN-OHL-W-2.0",
  },
  materials: [],
  params: [],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "gerbers" }],
  assertions: [],
  // G7, the inverted electrical gate (D-074, CHECKS.md section 10): the five
  // deliberate shorts of board.json defects, each a declared bridge in the
  // record. A pair id sorts its two nets (N8V|P8V); a net shorted to itself
  // is the net.
  // D-254: the CHK-BRD-09 set is what that check measures on this record,
  // the nets with fewer than two pads. ENC, PROBE and VBUS reach no pad (SW1,
  // J2 and J1 are stand-ins with no copper); MAGIC reaches U1.1 alone and
  // RF_OUT Y1.1 alone. The legacy floating list of gen_board.py lines 705
  // to 709 (GND?, MAGIC, MATRIX, PROBE, VIBES, kept in board.json defects)
  // is a hand-named set no registered check derives; its gate counted 5,
  // and this set is 5.
  expect: [
    { check: "CHK-BRD-21", target: "shunt-art", verdict: "fail", set: ["ANALOG", "BOOT", "ENC", "N8V|P8V", "NANO"] },
    { check: "CHK-BRD-09", target: "shunt-art", verdict: "fail", set: ["ENC", "MAGIC", "PROBE", "RF_OUT", "VBUS"] },
  ],
});
