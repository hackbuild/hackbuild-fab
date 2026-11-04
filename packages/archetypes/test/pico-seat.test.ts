// The Pico seat's pads are the catalog footprint's: 40 castellations in two
// columns, pad 1 at the USB end of the left column, a repeated pin name
// naming its lowest pad and name.n after it.

import { describe, expect, test } from "vitest";
import { isThrownCommandError } from "@hackbuild/spec";
import { PICO_BOARD, PICO_SEAT_DEFAULTS, picoPads, usedPads } from "../src/pip/seat.js";

describe("pico seat pads", () => {
  const pads = picoPads();

  test("40 pads, 20 a column, 17.78 mm apart, pitch 2.54, USB toward +y", () => {
    expect(pads).toHaveLength(40);
    expect(pads.filter((p) => p.edge === "L")).toHaveLength(20);
    expect(pads.find((p) => p.num === 1)).toMatchObject({ name: "GPIO0", x: -8.89, y: 24.13, edge: "L" });
    expect(pads.find((p) => p.num === 40)).toMatchObject({ name: "VBUS", x: 8.89, y: 24.13, edge: "R" });
    expect(pads.find((p) => p.num === 2)!.y).toBeCloseTo(24.13 - 2.54, 9);
  });

  test("names are unique; GND names pad 3 and GND.8 pad 8, each carrying the pin name GND", () => {
    expect(new Set(pads.map((p) => p.name)).size).toBe(40);
    expect(pads.find((p) => p.name === "GND")).toMatchObject({ num: 3, pin: "GND" });
    expect(pads.find((p) => p.name === "GND.8")).toMatchObject({ num: 8, pin: "GND" });
  });

  test("the default map lands on GND, GPIO2 to GPIO5 and 3V3; a Zero pad name is refused with the Pico's label", () => {
    expect(usedPads(PICO_SEAT_DEFAULTS, PICO_BOARD).map((u) => u.pad.num)).toEqual([3, 4, 5, 6, 7, 36]);
    let expected = "";
    try { usedPads({ ...PICO_SEAT_DEFAULTS, nets: { K: "GP29" } }, PICO_BOARD); } catch (e) { if (isThrownCommandError(e)) expected = String(e.hbf.expected); }
    expect(expected).toBe("a Raspberry Pi Pico castellation");
  });
});
