// M08-T12: CHK-BRD-21 (islands and shorts), CHK-BRD-05 (BOM, CPL and
// netlist by designator), CHK-BRD-02 on a pad feature, CHK-BRD-03 without a
// catalog land pattern, and the CHK-BRD-09 and -21 expect sets. Sources
// independent of the code under test: the SPINDLE R1 numbers come from
// pcb.py lines 184 to 200 as the card and the M08-T07 reparse state them
// (5V trace (2.40, 20.00) to (43.60, 20.00) width 0.80 on B.Cu, GND vias
// 0.8 pad at x 9.80, 16.00, 30.60, 36.20 on y 20.00), and the SHUNT sets
// from board.json `defects` and CHECKS.md section 10.

import { describe, expect, test } from "vitest";
import type { BoardRecord, RecordPad } from "@hackbuild/spec";
import { withHash, writeBom, writeCpl, writeNetlist } from "@hackbuild/board";
import { assemblyDrift, runBrd05 } from "../src/brd/assembly";
import { brd21, islandAudit } from "../src/brd/islands";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { boardLimits, brd02Pad, brd03, brd09 } from "../src/brd/board";

const LIM = boardLimits(createProfileLookup(loadProfile()));

const pad = (ref: string, pin: string, net: string, x: number, y: number, o: Partial<RecordPad> = {}): RecordPad =>
  ({ ref, pin, net, side: "top", through: false, shape: "rect", x, y, w: 1, h: 1, rot: 0, ...o });

function board(o: Partial<Omit<BoardRecord, "recordHash">>): BoardRecord {
  const pads = o.pads ?? [];
  const names = [...new Set(pads.map((p) => p.net).filter((n) => n !== ""))].sort();
  return withHash({
    schema: 1, backend: "direct", board: { outline: [[0, 0], [46, 0], [46, 46], [0, 46]], thickness: 1.6, copperLayers: 2 },
    parts: [], pads, nets: names.map((name) => ({ name, members: pads.filter((p) => p.net === name).map((p) => `${p.ref}.${p.pin}`).sort() })),
    vias: [], holes: [], tracks: [], jumpers: [], bridges: [], reads: [], ...o,
  } as Omit<BoardRecord, "recordHash">);
}

// The SPINDLE R1 bottom 5V trace and its two end vias, with the four GND vias pcb.py drops on y 20.
const via = (net: string, x: number, y = 20) => ({ net, x, y, drill: 0.4, pad: 0.8, layers: ["F.Cu", "B.Cu"] as const });
const trace = { net: "5V", layer: "B.Cu" as const, width: 0.8, pts: [[2.4, 20], [43.6, 20]] as [number, number][] };
const th = { through: true, drill: 1.0, shape: "circle" as const, w: 1.8, h: 1.8 };
const pads5 = [pad("J3", "1", "5V", 2.4, 30, th), pad("J4", "1", "5V", 43.6, 30, th), pad("J3", "2", "GND", 10, 40, th), pad("J4", "2", "GND", 30, 40, th)];
const tracks5 = [trace, { net: "5V", layer: "F.Cu" as const, width: 0.8, pts: [[2.4, 20], [2.4, 30]] as [number, number][] }, { net: "5V", layer: "F.Cu" as const, width: 0.8, pts: [[43.6, 20], [43.6, 30]] as [number, number][] }];
const pour = { net: "GND", layer: "B.Cu" as const, clearance: 0.35, outline: [[0.4, 0.4], [45.6, 0.4], [45.6, 45.6], [0.4, 45.6]] as [number, number][] };
const shipped = board({ pads: pads5, tracks: tracks5, vias: [via("5V", 2.4), via("5V", 43.6), via("GND", 9.8), via("GND", 16), via("GND", 30.6), via("GND", 36.2)], zones: [pour] });
const verdicts = (fs: readonly { verdict: string }[]) => fs.map((f) => f.verdict);

describe("CHK-BRD-21 islands and shorts", () => {
  test("fail: SPINDLE R1 as shipped, 5V and GND joined on B.Cu through the four GND vias", () => {
    const a = islandAudit(shipped);
    expect(a.shortIds).toEqual(["5V|GND"]);
    expect(a.split).toEqual([]);
    const f = brd21(shipped, "spindle-r1", {})[0]!;
    expect(f.verdict).toBe("fail");
    expect(f.constraint).toMatch(/^5V and GND shorted on B\.Cu/);
  });

  test("pass: the GND vias moved off the trace to y 22.00", () => {
    const moved = board({ ...shipped, vias: [via("5V", 2.4), via("5V", 43.6), via("GND", 9.8, 22), via("GND", 16, 22), via("GND", 30.6, 22), via("GND", 36.2, 22)] });
    expect(verdicts(brd21(moved, "spindle-r1", {}))).toEqual(["pass"]);
  });

  test("fail: without the pour the GND pads and vias fall apart into islands", () => {
    const loose = board({ ...shipped, vias: [via("5V", 2.4), via("5V", 43.6)], zones: [] });
    expect(islandAudit(loose).split).toEqual([{ net: "GND", islands: 2 }]);
    expect(verdicts(brd21(loose, "x", {}))).toEqual(["fail"]);
  });

  test("a declared bridge passes, and the expect set counts it", () => {
    const bridged = board({ ...shipped, bridges: [{ nets: ["5V", "GND"], through: "test", reason: "declared" }] });
    expect(verdicts(brd21(bridged, "x", {}))).toEqual(["pass"]);
    const exp = (set: string[]) => brd21(bridged, "x", { expect: [{ target: "x", verdict: "fail", set }] })[0]!;
    expect(exp(["5V|GND"]).verdict).toBe("pass");
    const drift = exp(["5V|GND", "BOOT"]);
    expect(drift.verdict).toBe("fail");
    expect(drift.extra).toMatchObject({ missing: "[\"BOOT\"]", extra: "[]" });
  });
});

describe("CHK-BRD-09 expect set", () => {
  test("the measured single-node nets drift from a declared set in both directions", () => {
    const r = board({ pads: [pad("U1", "1", "MAGIC", 5, 5), pad("R1", "1", "VIBES", 10, 5), pad("R1", "2", "VIBES", 12, 5), pad("Y1", "1", "RF_OUT", 20, 5)] });
    const f = brd09(r, "x", { expect: [{ target: "x", verdict: "fail", set: ["MAGIC", "VIBES"] }] })[0]!;
    expect(f.verdict).toBe("fail");
    expect(f.extra).toMatchObject({ missing: "[\"VIBES\"]", extra: "[\"RF_OUT\"]" });
    expect(brd09(r, "x", { expect: [{ target: "x", verdict: "fail", set: ["MAGIC", "RF_OUT"] }] })[0]!.verdict).toBe("pass");
  });
});

describe("CHK-BRD-05 BOM, CPL and netlist by designator", () => {
  const rec = board({
    pads: [pad("R1", "1", "A", 5, 5), pad("R1", "2", "B", 7, 5), pad("C1", "1", "A", 5, 9), pad("C1", "2", "B", 7, 9)],
    parts: [
      { ref: "R1", value: "10k", catalogId: "kicad:R_0805_2012Metric", tier: "community", side: "top", x: 6, y: 5, rot: 0, body: { w: 2, h: 1, z: 0 } },
      { ref: "C1", value: "100nF", catalogId: "kicad:C_0805_2012Metric", tier: "community", side: "top", x: 6, y: 9, rot: 0, body: { w: 2, h: 1, z: 0 } },
    ],
  });
  const art = (exporter: string, text: string) => ({ level: "artifact" as const, artifact: { exporter, name: `t.${exporter}`, bytes: new TextEncoder().encode(text), part: { board: rec } as never } });
  test("pass: the three files the writers wrote", () => {
    for (const [k, t] of [["bom", writeBom(rec)], ["cpl", writeCpl(rec)], ["netlist", writeNetlist(rec)]] as const) expect(verdicts(runBrd05(art(k, t))), k).toEqual(["pass"]);
  });
  test("fail: a stale BOM row for a part the record no longer places (SPINDLE R1 origin)", () => {
    const stale = `${writeBom(rec)}J9,1x02 header,,PinHeader_1x02,Top,1,removed\n`;
    expect(assemblyDrift("bom", stale, rec)).toEqual(["BOM names J9, which the record does not place"]);
    expect(verdicts(runBrd05(art("bom", stale)))).toEqual(["fail"]);
  });
  test("fail: a CPL row off its body centre, and a netlist missing a member", () => {
    expect(assemblyDrift("cpl", writeCpl(rec).replace("R1,6.000,5.000", "R1,6.400,5.000"), rec)).toEqual(["R1 placed 0.400 mm from its body centre"]);
    expect(assemblyDrift("netlist", writeNetlist(rec).replace(" R1.1", ""), rec)).toEqual(["net A members differ from the record"]);
  });
});

describe("CHK-BRD-02 on a pad feature and CHK-BRD-03 without a catalog row", () => {
  test("a drilled pad at its centre passes its margin; a hole pushed to the pad edge fails", () => {
    const r = board({ pads: [pad("U1", "5V", "5V", 10, 10, { through: true, w: 2.2, h: 1.6, drill: 1.05 }), pad("U1", "GND", "GND", 10, 12.54, { through: true, w: 2.2, h: 1.6, drill: 1.05, holeDx: 0.9 })] });
    expect(verdicts(brd02Pad(r, "pad.U1.5V", LIM))).toEqual(["pass"]);
    expect(verdicts(brd02Pad(r, "pad.U1.GND", LIM))).toEqual(["fail"]);
  });
  test("SHUNT BT1 on the back: pads at x +/-14.68 about the body map onto themselves and pass by declaration; an asymmetric pattern skips", () => {
    const part = { ref: "BT1", value: "CR2032", catalogId: "kicad:BatteryHolder_Keystone_1058_1x2032", tier: "community" as const, side: "bottom" as const, x: 77, y: 30, rot: 0, body: { w: 30.5, h: 25, z: 0 } };
    const sym = board({ parts: [part], pads: [pad("BT1", "1", "P8V", 77 - 14.68, 30, { side: "bottom", w: 3.5, h: 5 }), pad("BT1", "2", "N8V", 77 + 14.68, 30, { side: "bottom", w: 3.5, h: 5 })] });
    expect(verdicts(brd03(sym, LIM))).toEqual(["pass"]);
    const asym = board({ parts: [part], pads: [pad("BT1", "1", "P8V", 77 - 14.68, 30, { side: "bottom" }), pad("BT1", "2", "N8V", 77 + 12, 30, { side: "bottom" })] });
    expect(verdicts(brd03(asym, LIM))).toEqual(["skip"]);
  });
});
