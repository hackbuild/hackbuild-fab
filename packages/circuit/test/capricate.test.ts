// M05-T12: circuit/capacitive-path-ceiling and the declared series nets of
// the Capricate reproduction. The figures come from the card and the paper
// (capricate.txt lines 407 to 423): 30 kohm, electrodes 5 to 20 mm,
// resistors 20 to 120 kohm in 10 kohm steps, the 0.8 by 0.2 mm minimal
// trace. The expected numbers are recomputed here from the committed data
// files read raw (packages/profile/data/constants.json and materials.json),
// never from the code under test.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { ConstraintCtx, SeriesSceneDecl } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import {
  CAPACITIVE_LEN_DIM, CAPACITIVE_NET_DIM, capacitivePathCeiling, constraintDefs, seriesPortId, solveSeriesScene,
} from "../src/index";

const DATA = new URL("../../profile/data/", import.meta.url);
const constants = JSON.parse(readFileSync(new URL("constants.json", DATA), "utf8")) as { constants: { id: string; value: number; unit: string; provenance: { tier: string; source: string } }[] };
const materials = JSON.parse(readFileSync(new URL("materials.json", DATA), "utf8")) as { materials: { id: string; resistivity: { id: string; direction: string; ohmCm: number; provenance: { tier: string } }[] }[] };

const CEIL = constants.constants.find((c) => c.id === "capacitive.pathCeilOhm")!;
const cabs = materials.materials.find((m) => m.id === "cabs")!;
const rho = (dir: string): number => cabs.resistivity.find((r) => r.direction === dir)!.ohmCm;

/** Rounds to the golden at d decimals, allowing binary noise (2738.75 computes as 2738.7499999999995). */
const roundsTo = (v: number, golden: number, d: number): boolean => Math.abs(v - golden) <= 0.5 * 10 ** -d + 1e-9 * Math.abs(v);

const profile = () => createProfileLookup(loadProfile());
/** The def's bounds on one dim; circuit sits beside constraints in tier 1 and never imports it (D-044). */
const bounds = (dim: typeof CAPACITIVE_NET_DIM, c: ConstraintCtx) => capacitivePathCeiling.bounds(dim, c);
const ctx = (facts: ConstraintCtx["facts"], material = "cabs"): ConstraintCtx => ({ profile: profile(), machine: "ffc5p", material, facts });

describe("profile rows the ceiling reads (committed data)", () => {
  test("capacitive.pathCeilOhm is 30000 ohm at tier community and cites Capricate", () => {
    expect([CEIL.value, CEIL.unit, CEIL.provenance.tier]).toEqual([30000, "ohm", "community"]);
    expect(CEIL.provenance.source).toMatch(/Capricate, UIST 2015/);
    expect(CEIL.provenance.source).toMatch(/capricate\.txt lines 407 to 416/);
    expect(CEIL.provenance.source).toMatch(/read by CHK-NET-28/);
  });
  test("cabs carries the Capricate along and across rows", () => {
    expect([rho("along"), rho("across")]).toEqual([0.4382, 0.8171]);
  });
});

describe("circuit/capacitive-path-ceiling", () => {
  test("is registered by the package", () => {
    expect(constraintDefs.map((d) => d.id)).toContain("circuit/capacitive-path-ceiling");
  });

  test("net.ohm: one ceiling at the profile constant, open floor, qualified measured from a community row", () => {
    const b = bounds(CAPACITIVE_NET_DIM, ctx({ capacitive: true }));
    expect(capacitivePathCeiling.units[CAPACITIVE_NET_DIM]).toBe("ohm");
    expect(b.map((x) => [x.side, x.value, x.qualifier, x.basis, x.source])).toEqual([["hi", CEIL.value, "measured", "community", "CHK-NET-28"]]);
    expect(b[0]!.reason).toMatch(/at most 30000 ohm/);
  });

  test("conductor.pathLen: 30000 w t / rho, 1095.4 mm along and 587.4 mm across at 0.8 by 0.2 mm", () => {
    const [a] = bounds(CAPACITIVE_LEN_DIM, ctx({ wMm: 0.8, tMm: 0.2, capacitive: true }));
    const [c] = bounds(CAPACITIVE_LEN_DIM, ctx({ wMm: 0.8, tMm: 0.2, capacitive: true, direction: "across" }));
    expect([a!.side, c!.side, capacitivePathCeiling.units[CAPACITIVE_LEN_DIM]]).toEqual(["hi", "hi", "mm"]);
    // ohm cm to ohm mm is x 10; L = R w t / rho in mm.
    const expectAlong = (CEIL.value * 0.8 * 0.2) / (rho("along") * 10);
    const expectAcross = (CEIL.value * 0.8 * 0.2) / (rho("across") * 10);
    expect(Math.abs(a!.value - expectAlong)).toBeLessThan(1e-9);
    expect(Math.abs(c!.value - expectAcross)).toBeLessThan(1e-9);
    expect(roundsTo(a!.value, 1095.4, 1)).toBe(true);
    expect(roundsTo(c!.value, 587.4, 1)).toBe(true);
    expect(a!.reason).toMatch(/cabs\.capricate\.along/);
    expect(c!.reason).toMatch(/cabs\.capricate\.across/);
    expect([a!.qualifier, a!.basis]).toEqual(["computed", "community"]);
  });

  test("absent unless the facts declare capacitive true: a pullup read never meets it", () => {
    expect(capacitivePathCeiling.bounds(CAPACITIVE_NET_DIM, ctx({}))).toEqual([]);
    expect(capacitivePathCeiling.bounds(CAPACITIVE_LEN_DIM, ctx({ wMm: 0.8, tMm: 0.2, capacitive: "yes" }))).toEqual([]);
  });

  test("an unknown direction is E_SCHEMA at /facts/direction", () => {
    expect(() => capacitivePathCeiling.bounds(CAPACITIVE_LEN_DIM, ctx({ wMm: 0.8, tMm: 0.2, capacitive: true, direction: "sideways" })))
      .toThrow(expect.objectContaining({ hbf: expect.objectContaining({ code: "E_SCHEMA", path: "/facts/direction" }) }));
  });
});

/** The card's sweep: 4 electrodes by 11 resistors with no lead, plus the minimal trace. */
function sweep(): SeriesSceneDecl {
  const sizes = [5, 10, 15, 20];
  const resistors = Array.from({ length: 11 }, (_, i) => 20000 + 10000 * i);
  return {
    material: "cabs",
    electrodes: sizes.map((d) => ({ id: `electrode.d${d}`, diameterMm: d, tMm: 0.2 })),
    leads: [{ id: "lead.min", lengthMm: 100, widthMm: 0.8, tMm: 0.2 }],
    nets: [
      ...sizes.flatMap((d) => resistors.map((r) => ({ net: `D${d}-R${r / 1000}`, interface: "capacitive", electrode: `electrode.d${d}`, resistorOhm: r, leads: [] as string[] }))),
      { net: "TRACE-MIN", interface: "capacitive", resistorOhm: 0, leads: ["lead.min"] },
    ],
  };
}

describe("solveSeriesScene on the Capricate sweep", () => {
  const solved = solveSeriesScene(sweep(), profile());

  test("44 sweep cases at lead 0 mm and conductor 0 ohm: the path is the resistor alone", () => {
    const cases = solved.filter((s) => s.net !== "TRACE-MIN");
    expect(cases).toHaveLength(44);
    for (const s of cases) {
      expect([s.leadMm, s.conductorOhm, s.totalOhm, s.legs.length, s.tier], s.net).toEqual([0, 0, s.resistorOhm, 0, null]);
      expect(s.port).toBe(seriesPortId(s.net));
    }
  });

  test("against the ceiling: 8 pass and 36 fail, 20 and 30 kohm pass for every size", () => {
    const cases = solved.filter((s) => s.net !== "TRACE-MIN");
    const pass = cases.filter((s) => s.totalOhm <= CEIL.value);
    expect([pass.length, cases.length - pass.length]).toEqual([8, 36]);
    expect([...new Set(pass.map((s) => s.resistorOhm))].sort()).toEqual([20000, 30000]);
  });

  test("minimal trace 0.8 by 0.2 mm, 100 mm along: 2738.8 ohm at one decimal, inside the ceiling", () => {
    const t = solved.find((s) => s.net === "TRACE-MIN")!;
    const expectOhm = (rho("along") * 10 * 100) / (0.8 * 0.2);
    expect(Math.abs(t.totalOhm - expectOhm)).toBeLessThan(1e-9);
    expect(roundsTo(t.totalOhm, 2738.8, 1)).toBe(true);
    expect([t.resistorOhm, t.leadMm, t.tier, t.q.qualifier, t.legs[0]!.row]).toEqual([0, 100, "community", "computed", "cabs.capricate.along"]);
    expect(t.totalOhm).toBeLessThan(CEIL.value);
  });

  test("an unknown electrode or lead is E_REF, a negative resistor E_SCHEMA", () => {
    const base = sweep();
    const one = (n: SeriesSceneDecl["nets"][number]): SeriesSceneDecl => ({ ...base, nets: [n] });
    expect(() => solveSeriesScene(one({ net: "X", interface: "capacitive", electrode: "electrode.d7", resistorOhm: 0, leads: [] }), profile()))
      .toThrow(expect.objectContaining({ hbf: expect.objectContaining({ code: "E_REF", path: "/scene/series/nets/0/electrode" }) }));
    expect(() => solveSeriesScene(one({ net: "X", interface: "capacitive", resistorOhm: 0, leads: ["lead.none"] }), profile()))
      .toThrow(expect.objectContaining({ hbf: expect.objectContaining({ code: "E_REF", path: "/scene/series/nets/0/leads/0" }) }));
    expect(() => solveSeriesScene(one({ net: "X", interface: "capacitive", resistorOhm: -1, leads: [] }), profile()))
      .toThrow(expect.objectContaining({ hbf: expect.objectContaining({ code: "E_SCHEMA", path: "/scene/series/nets/0/resistorOhm" }) }));
  });
});
