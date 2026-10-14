// M05-T12: the capricate-touch reference. The committed goldens under
// reference/electrical/capricate-touch/expected are read and held to the
// card's figures, recomputed here from the chase read as data and from the
// profile data files read raw: 8 pass and 36 fail over 44 cases, 20 and 30
// kohm pass for every electrode, lead 0 mm and conductor 0 ohm per case,
// the minimal trace at 2738.8 ohm (one decimal), and the length ceiling
// 1095.4 mm along and 587.4 mm across. A fresh circuit.solve run must equal
// the golden, and the CLI query in the card's acceptance exits 0.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import type { CheckResult, CommandResult, Interval } from "@hackbuild/spec";
import { canonicalize } from "@hackbuild/spec";
import type { SeriesPort } from "@hackbuild/circuit";
import { readChaseSource } from "@hackbuild/chase";
import { queryGoldens } from "../src/commands/parity.js";
import type { CircuitSolveOutput } from "../src/commands/circuit-solve.js";
import { ROOT, json } from "./hbf.js";

const DIR = path.join(ROOT, "reference", "electrical", "capricate-touch");
const golden = <T>(name: string): CommandResult<T> => JSON.parse(readFileSync(path.join(DIR, "expected", name), "utf8")) as CommandResult<T>;
const data = (f: string): unknown => JSON.parse(readFileSync(path.join(ROOT, "packages", "profile", "data", f), "utf8"));
const CEIL = (data("constants.json") as { constants: { id: string; value: number }[] }).constants.find((c) => c.id === "capacitive.pathCeilOhm")!.value;
const rho = (dir: string): number => (data("materials.json") as { materials: { id: string; resistivity: { direction: string; ohmCm: number }[] }[] })
  .materials.find((m) => m.id === "cabs")!.resistivity.find((r) => r.direction === dir)!.ohmCm;
const roundsTo = (v: number, g: number, d: number): boolean => Math.abs(v - g) <= 0.5 * 10 ** -d + 1e-9 * Math.abs(v);

const { chase } = readChaseSource(readFileSync(path.join(DIR, "chase.ts"), "utf8"), "reference/electrical/capricate-touch/chase.ts");
const series = chase.scene!.series!;

describe("capricate-touch chase (M05-T12 step 3)", () => {
  test("declares the card's sweep: electrodes 5 to 20 mm at 0.2 mm, resistors 20 to 120 kohm in 10 kohm steps, the 0.8 by 0.2 by 100 mm trace", () => {
    expect(series.material).toBe("cabs");
    expect(series.electrodes.map((e) => [e.diameterMm, e.tMm])).toEqual([[5, 0.2], [10, 0.2], [15, 0.2], [20, 0.2]]);
    expect(series.leads.map((l) => [l.lengthMm, l.widthMm, l.tMm])).toEqual([[100, 0.8, 0.2]]);
    const sweep = series.nets.filter((n) => n.electrode !== undefined);
    expect(sweep).toHaveLength(44);
    for (const e of series.electrodes) {
      expect(sweep.filter((n) => n.electrode === e.id).map((n) => n.resistorOhm)).toEqual(Array.from({ length: 11 }, (_, i) => 20000 + 10000 * i));
    }
    for (const n of sweep) expect([n.interface, n.leads]).toEqual(["capacitive", []]);
    expect(series.nets.filter((n) => n.electrode === undefined).map((n) => [n.resistorOhm, n.leads])).toEqual([[0, ["lead.min"]]]);
  });
});

describe("capricate-touch goldens", () => {
  const solve = golden<CircuitSolveOutput>("query-solve.json");
  const s = solve.result!.series as readonly SeriesPort[];
  const results = solve.result!.results as readonly CheckResult[];
  const net28 = results.filter((r) => r.id === "CHK-NET-28");
  const netOf = (r: CheckResult): string | undefined => (r.target as { net?: string }).net;

  test("each sweep case records lead 0 mm and conductor 0 ohm; the path is the declared resistor", () => {
    const sweep = s.filter((x) => x.electrode !== null);
    expect(sweep).toHaveLength(44);
    for (const x of sweep) expect([x.leadMm, x.conductorOhm, x.totalOhm], x.net).toEqual([0, 0, series.nets.find((n) => n.net === x.net)!.resistorOhm]);
  });

  test("8 pass and 36 fail over the 44 cases; 20 and 30 kohm pass for every size, 30 kohm on the bound", () => {
    const sweepIds = new Set(s.filter((x) => x.electrode !== null).map((x) => x.net));
    const sweep = net28.filter((r) => sweepIds.has(netOf(r)!));
    expect(sweep).toHaveLength(44);
    const pass = sweep.filter((r) => r.verdict === "pass");
    expect([pass.length, sweep.filter((r) => r.verdict === "fail").length]).toEqual([8, 36]);
    expect([...new Set(pass.map((r) => r.measured))].sort()).toEqual([20000, CEIL]);
    for (const r of sweep) {
      expect(r.legal).toMatchObject({ kind: "interval", lo: null, hi: CEIL, unit: "ohm" });
      expect(r.verdict).toBe((r.measured as number) <= CEIL ? "pass" : "fail");
    }
    for (const r of sweep.filter((x) => x.verdict === "fail")) {
      expect(r.constraint).toMatch(/at most 30000 ohm/);
      expect(r.constraint).toMatch(/Capricate/);
    }
    expect([solve.verdict, solve.counts]).toEqual(["fail", { pass: 9, warn: 0, fail: 36, skip: 90 }]);
  });

  test("minimal trace, 100 mm along: 2738.8 ohm at one decimal, pass", () => {
    const t = s.find((x) => x.electrode === null)!;
    const expectOhm = (rho("along") * 10 * 100) / (0.8 * 0.2);
    expect(Math.abs(t.totalOhm - expectOhm)).toBeLessThan(1e-9);
    expect(roundsTo(t.totalOhm, 2738.8, 1)).toBe(true);
    expect(net28.find((r) => netOf(r) === t.net)!.verdict).toBe("pass");
  });

  test("length ceiling 1095.4 mm along and 587.4 mm across at 0.8 by 0.2 mm", () => {
    const along = golden<Interval>("query-along.json").result!;
    const across = golden<Interval>("query-across.json").result!;
    expect(roundsTo(along.legal![1]!, 1095.4, 1)).toBe(true);
    expect(roundsTo(across.legal![1]!, 587.4, 1)).toBe(true);
    expect(Math.abs(along.legal![1]! - (CEIL * 0.08 * 0.02) / rho("along") * 10)).toBeLessThan(1e-9);
    expect(golden<Interval>("query-ceiling.json").result!.legal).toEqual([null, CEIL]);
    // No 3mf: the chase declares none (no harvested ffc5p cABS preset), so parity writes an empty artifacts golden.
    expect(JSON.parse(readFileSync(path.join(DIR, "expected", "artifacts.json"), "utf8"))).toEqual({});
  });

  test("a fresh run of every declared query equals its committed golden", async () => {
    for (const q of await queryGoldens(DIR, ROOT)) {
      const committed = readFileSync(path.join(DIR, "expected", path.basename(q.file)), "utf8");
      expect(`${canonicalize(q.fresh)}\n`, q.file).toBe(committed);
    }
  }, 300_000);

  test("the card's CLI query exits 0 with the along ceiling", async () => {
    const { code, r } = await json("constraints.query", "conductor.pathLen", "--material", "cabs", "--facts", "wMm=0.8,tMm=0.2,capacitive=true");
    expect(code).toBe(0);
    expect(roundsTo((r.result as unknown as Interval).legal![1]!, 1095.4, 1)).toBe(true);
  });
});
