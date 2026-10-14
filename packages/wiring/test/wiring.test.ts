// M08-T13 acceptance on the SPINDLE R1 module: the ESP32-C3 SuperMini pins
// as catalog.pins answers them (fixture), and its 14 used pads with the
// functions the SPINDLE README pin table gives (README lines 251 to 255:
// motor X GPIO 0, 1, 3, 4 on J1 IN1 to IN4; motor Y GPIO 5, 6, 7, 10 on J2;
// laser gate 20; calibration sensor 2; spare 21) plus the three rails.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { PinDef } from "@hackbuild/spec";
import { WiringError, wiringReport, wiringSvg, type WiringInput } from "../src/index";

const pins = (JSON.parse(readFileSync(new URL("./fixtures/esp32c3-supermini.pins.json", import.meta.url), "utf8")) as { result: { pins: PinDef[]; tier: "vendor" } }).result;
const used = [
  ["GPIO0", "X IN1"], ["GPIO1", "X IN2"], ["GPIO3", "X IN3"], ["GPIO4", "X IN4"],
  ["GPIO5", "Y IN1"], ["GPIO6", "Y IN2"], ["GPIO7", "Y IN3"], ["GPIO10", "Y IN4"],
  ["GPIO20", "LASER"], ["GPIO2", "CAL"], ["GPIO21", "SPARE"], ["5V", "5V"], ["GND", "GND"], ["3V3", "3V3"],
].map(([pin, fn]) => ({ pin: pin!, function: fn! }));
const input: WiringInput = {
  board: { id: "esp32c3-supermini", name: "ESP32-C3 SuperMini", l: 22.52, w: 18, tier: pins.tier },
  pins: pins.pins, used,
  ends: [
    { id: "e1", x: 14, y: -4, net: "LASER", label: "1" },
    { id: "e2", x: -14, y: -4, net: "GND", label: "2" },
    { id: "e3", x: 0, y: -16, net: "BUZZER", label: "3" },
    { id: "e4", x: 14, y: -14, net: "3V3", label: "4" },
  ],
};

// The SuperMini hole centres as SPINDLE R1 pcb.py places them (originals
// spindle/files/pcb.py, sha256 65035121...): lines 57 to 64 give ROW_DX
// 7.62, PITCH 2.54, COL_R on +x and COL_L on -x top to bottom, and
// ypin(i) = MCY + 3.5 PITCH - i PITCH; line 80 drills each pad at
// side ROW_DX from MCX. Relative to the body centre (MCX, MCY), +y up.
const COL_R = ["5V", "GND", "3V3", "GPIO4", "GPIO3", "GPIO2", "GPIO1", "GPIO0"];
const COL_L = ["GPIO5", "GPIO6", "GPIO7", "GPIO8", "GPIO9", "GPIO10", "GPIO20", "GPIO21"];
const pcbHole = (pin: string): [number, number] => {
  const r = COL_R.indexOf(pin), i = r >= 0 ? r : COL_L.indexOf(pin);
  return [(r >= 0 ? 1 : -1) * 7.62, (3.5 - i) * 2.54];
};
const close = (a: readonly number[], b: readonly number[]): boolean => a.every((v, i) => Math.abs(v - b[i]!) < 1e-9);

describe("wiring report", () => {
  test("14 used pads with their functions; GPIO8 and GPIO9 unused", () => {
    const r = wiringReport(input);
    expect(r.used).toHaveLength(14);
    expect([...r.unused].sort()).toEqual(["GPIO8", "GPIO9"]);
    // Each used pad's centre against pcb.py, not against the fixture it came from.
    for (const u of r.used) expect(close(u.at, pcbHole(u.pin)), `${u.pin} at ${u.at.join(",")} vs pcb.py ${pcbHole(u.pin).join(",")}`).toBe(true);
    expect(close(r.used.find((u) => u.pin === "GPIO20")!.at, [-7.62, -6.35])).toBe(true);
  });

  test("an end on a used function finds its pad, a rail end finds the rail pin, an unknown net lands in unmatched", () => {
    const r = wiringReport(input);
    expect(r.ends).toEqual([{ id: "e1", net: "LASER", pin: "GPIO20" }, { id: "e2", net: "GND", pin: "GND" }, { id: "e4", net: "3V3", pin: "3V3" }]);
    expect(r.unmatched).toEqual([{ id: "e3", net: "BUZZER" }]);
  });

  test("a rail end finds its pin by name even when no used entry carries the rail (PIP part2.js line 382)", () => {
    const r = wiringReport({ ...input, used: used.filter((u) => u.pin.startsWith("GPIO")), ends: [{ id: "r", x: 0, y: -16, net: "3V3", label: "r" }] });
    expect(r.ends).toEqual([{ id: "r", net: "3V3", pin: "3V3" }]);
    expect(r.unmatched).toEqual([]);
  });

  test("a 5V end finds the 5V pin by name with no used entry carrying it, as GND and 3V3 do", () => {
    const ends = (["5V", "GND", "3V3"] as const).map((net) => ({ id: net, x: 0, y: -16, net, label: net }));
    const r = wiringReport({ ...input, used: used.filter((u) => u.pin.startsWith("GPIO")), ends });
    expect(r.ends).toEqual(ends.map((e) => ({ id: e.id, net: e.net, pin: e.net })));
    expect(r.unmatched).toEqual([]);
  });

  // The two refusals have different owners (the design, the catalog row),
  // so a caller tells them apart by kind, not by message text.
  const thrown = (f: () => unknown): WiringError => {
    try { f(); } catch (e) { return e as WiringError; }
    throw new Error("expected a throw");
  };

  test("a used pin the board lacks is refused as unknown-pin at its used index", () => {
    const e = thrown(() => wiringReport({ ...input, used: [used[0]!, { pin: "GPIO99", function: "X" }] }));
    expect(e).toBeInstanceOf(WiringError);
    expect([e.kind, e.board, e.pin, e.index]).toEqual(["unknown-pin", "esp32c3-supermini", "GPIO99", 1]);
  });

  test("a used pin whose catalog row gives no centre is refused as no-centre, not as a bad pin name", () => {
    const pinsNoAt = pins.pins.map((p) => (p.name === "GPIO20" ? { n: p.n, name: p.name, role: p.role } as PinDef : p));
    const e = thrown(() => wiringReport({ ...input, pins: pinsNoAt }));
    expect(e).toBeInstanceOf(WiringError);
    expect([e.kind, e.pin, e.index]).toEqual(["no-centre", "GPIO20", 8]);
  });

  test("an unused pin with no centre is refused by the drawing, which places every pad", () => {
    const pinsNoAt = pins.pins.map((p) => (p.name === "GPIO8" ? { n: p.n, name: p.name, role: p.role } as PinDef : p));
    expect(wiringReport({ ...input, pins: pinsNoAt }).unused).toContain("GPIO8");
    const e = thrown(() => wiringSvg({ ...input, pins: pinsNoAt }));
    expect(e).toBeInstanceOf(WiringError);
    expect([e.kind, e.pin, e.index]).toEqual(["no-centre", "GPIO8", undefined]);
  });
});

describe("wiring svg (PIP drawing rules)", () => {
  const svg = wiringSvg(input);
  test("every pad drawn: 16 pad circles, unused in gold, used in pink", () => {
    const pads = [...svg.matchAll(/<circle [^>]*r="7" fill="(#[0-9a-fA-F]+)"[^>]*data-pin="([^"]+)"/g)].map((m) => [m[2], m[1]]);
    expect(pads).toHaveLength(16);
    expect(pads.filter(([, c]) => c === "#d4a94a").map(([p]) => p).sort()).toEqual(["GPIO8", "GPIO9"]);
    expect(pads.filter(([, c]) => c === "#FE0386")).toHaveLength(14);
  });

  test("every used pin labelled with its function", () => {
    for (const u of used) {
      const label = u.function === u.pin ? u.pin : `${u.pin} ${u.function}`;
      expect(svg, label).toContain(`>${label}</text>`);
    }
  });

  test("wires coloured by net as PIP part2.js line 383: pink signal, ink GND, red 3V3; the unmatched end is named on the drawing", () => {
    const strokes = [...svg.matchAll(/<line [^>]*stroke="(#[0-9a-fA-F]+)"/g)].map((m) => m[1]);
    // Ends e1 LASER, e2 GND, e4 3V3 in input order; e3 BUZZER has no pad, so no line.
    expect(strokes).toEqual(["#FE0386", "#1a1a1a", "#c3251f"]);
    expect(svg).toContain("e3 BUZZER");
  });

  test("the drawing is deterministic", () => expect(wiringSvg(input)).toBe(svg));
});
