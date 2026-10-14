// connectivity() netless rule (connect.ts doc comment): netless copper
// ("") joins nothing and shorts nothing. The cases are built by hand so
// the touching is known from the geometry alone: a 0.3 mm netless disc
// whose core sits on a named pad's core overlaps it by 0.6 mm.

import { describe, expect, test } from "vitest";
import { connectivity, type CopperItem } from "../src/index";

const pad = (net: string, key: string, x: number): CopperItem => ({ net, key, layers: ["F.Cu"], shape: { kind: "pt", p: [x, 0], r: 0.3 }, name: `pad ${key}` });
const via = (net: string, x: number): CopperItem => ({ net, layers: ["F.Cu", "B.Cu"], shape: { kind: "pt", p: [x, 0], r: 0.3 }, name: `via at (${x.toFixed(2)}, 0.00)` });

describe("netless copper", () => {
  test("a netless via on a named pad is no short", () => {
    const c = connectivity([pad("5V", "U1.1", 0), via("", 0)], [], []);
    expect(c.shorts).toEqual([]);
    expect(c.islands.get("5V")).toBe(1);
    expect(c.islands.has("")).toBe(false);
  });

  test("a netless via between two pads of one net joins nothing: the net stays two islands", () => {
    // Pads at x 0 and 0.9 sit 0.3 mm apart (copper gap), each touched by the via at 0.45.
    const c = connectivity([pad("GND", "J1.1", 0), via("", 0.45), pad("GND", "J1.2", 0.9)], [], []);
    expect(c.shorts).toEqual([]);
    expect(c.islands.get("GND")).toBe(2);
  });

  test("the same via on the named net joins the pads, and on another named net shorts both", () => {
    expect(connectivity([pad("GND", "J1.1", 0), via("GND", 0.45), pad("GND", "J1.2", 0.9)], [], []).islands.get("GND")).toBe(1);
    const s = connectivity([pad("GND", "J1.1", 0), via("5V", 0.45), pad("GND", "J1.2", 0.9)], [], []).shorts;
    expect(s.map((x) => x.nets)).toEqual([["5V", "GND"], ["5V", "GND"]]);
  });
});

// The pour join's keepout rule (connect.ts line 203, shared by CHK-BRD-21
// and CHK-BRD-22): a pour joins only the items whose anchor is outside
// every keepout on the pour's layer. Two GND pads on B.Cu sit 10 mm apart,
// so only the pour can join them; the pour square runs 0 to 20, the
// keepout square 6 to 14 holds the pad at x 10 alone.
describe("pour keepouts", () => {
  const bpad = (key: string, x: number): CopperItem => ({ net: "GND", key, layers: ["B.Cu"], shape: { kind: "pt", p: [x, 5], r: 0.5 }, name: `pad ${key}` });
  const square = (a: number, b: number): [number, number][] => [[a, 0], [b, 0], [b, 10], [a, 10]];
  const pads = [bpad("J1.1", 2.5), bpad("J1.2", 10)];
  const pour = { net: "GND", layers: ["B.Cu"], pts: square(0, 20) };

  test("a pad inside a B.Cu keepout stays off the B.Cu pour: two islands", () => {
    expect(connectivity(pads, [pour], [{ layers: ["B.Cu"], pts: square(6, 14) }]).islands.get("GND")).toBe(2);
  });

  test("with no keepout the pour joins both pads: one island", () => {
    expect(connectivity(pads, [pour], []).islands.get("GND")).toBe(1);
  });

  test("a keepout on F.Cu only leaves the B.Cu pour whole: one island", () => {
    expect(connectivity(pads, [pour], [{ layers: ["F.Cu"], pts: square(6, 14) }]).islands.get("GND")).toBe(1);
  });
});
