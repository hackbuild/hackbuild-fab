// reference/boards/wiring-tang-r5/build.ts
// The TANG R5 pin map, from the net list of tang_r5_wiring.html (sha256
// 1b4f1347...3cf3331) and DIMENSIONS.txt WIRING: the island SNS tail on
// pin 14 (A0); the P1 to P6 drive tails on pins 0 to 5; the three pot
// wipers on 16, 17, 18 (A2 to A4), labelled MODE, TUNE and LEVEL on the
// drawing; the MAX98357A on DIN 7, LRC 20, BCLK 21, VIN from Vin and GND;
// 3V3 for the 47k on SNS and the pot outer legs. The film (SF23-600) is
// left out: its pins depend on panel A or B, which a person picks after
// one meter reading.
//
// Wire ends sit where the drawing puts them, in mm of the module frame
// (USB up): the island tails in a row below the board in the order the
// copper tails run (P6 P5 P4 SNS P1 P2 P3), the amp pins to the right, the
// pot wipers further down; each end is labelled with the part it lands on.
// The original lays its parts out on the page, not on a board, so these
// positions are drawing layout only.

import type { WiringDraft } from "@hackbuild/wiring";

const ISLAND = ["P6", "P5", "P4", "SNS", "P1", "P2", "P3"] as const;
const AMP = ["LRC", "BCLK", "DIN", "GND", "VIN"] as const;
const POTS = ["MODE", "TUNE", "LEVEL"] as const;

export function build(): WiringDraft {
  return {
    kind: "wiring",
    board: "teensy40-pjrc",
    used: [
      { pin: "14", function: "SNS" },
      { pin: "0", function: "P1" }, { pin: "1", function: "P2" }, { pin: "2", function: "P3" },
      { pin: "3", function: "P4" }, { pin: "4", function: "P5" }, { pin: "5", function: "P6" },
      { pin: "16", function: "MODE" }, { pin: "17", function: "TUNE" }, { pin: "18", function: "LEVEL" },
      { pin: "7", function: "DIN" }, { pin: "20", function: "LRC" }, { pin: "21", function: "BCLK" },
      { pin: "Vin", function: "VIN" }, { pin: "GND", function: "GND" }, { pin: "3.3V", function: "3V3" },
    ],
    ends: [
      ...ISLAND.map((net, i) => ({ id: `island-${net}`, x: -20 + i * 7, y: -24, net, label: "tail" })),
      ...AMP.map((net, i) => ({ id: `amp-${net}`, x: 25, y: 12 - i * 6, net, label: "amp" })),
      ...POTS.map((net, i) => ({ id: `pot-${net}`, x: -14 + i * 10, y: -35, net, label: "pot" })),
      { id: "pots-3v3", x: 16, y: -35, net: "3V3", label: "pots" },
    ],
  };
}
