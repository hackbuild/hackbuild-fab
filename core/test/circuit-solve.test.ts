// M05-T06: circuit.solve on the CLI and on a pullup variant of the flex
// pair. Expected numbers come from independent sources, never from what the
// command printed: the catalog pin rows from packages/catalog/data, the
// T18 card's along segment of conductor.key1, and every pressed voltage
// re-solved by the M05-T03 nodal solver over the path the extraction gave.
// The pullup variant is the flex pair with its hookup read by pullup: the
// hookup is wiring, outside the Part IR (D-183), so the same build is
// solved with other read models in process.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import type { CheckResult, CommandResult, HookupDecl, McuPinSpec, OperatingPoint } from "@hackbuild/spec";
import { isThrownCommandError } from "@hackbuild/spec";
import { NODAL_LEAK_S, solveDc } from "@hackbuild/circuit";
import { buildPart, loadDesign, resolveParams, type Built } from "../src/commands/build.js";
import { solveBuilt, type CircuitSolveInput, type CircuitSolveOutput } from "../src/commands/circuit-solve.js";
import { finish } from "../src/result.js";
import { fullProfile } from "../src/load-build.js";
import { exitOf } from "../src/errors.js";
import type { CoreCtx } from "../src/registry.js";
import { renderResult } from "../src/text.js";
import { REF, ROOT, hbf, json } from "./hbf.js";

// Counts every resolution of eecircuit-engine in this file's module graph and passes the real module through.
const spy = vi.hoisted(() => ({ resolved: 0 }));
vi.mock("eecircuit-engine", async (importOriginal) => {
  spy.resolved += 1;
  return importOriginal();
});

interface Row { id: string; vddV?: number; vilMaxV?: number; vihMinV?: number; inherits?: string; legacy?: unknown; pullup?: { kind: string; minOhm?: number; maxOhm?: number; typOhm?: number } }
const ROWS = (JSON.parse(readFileSync(path.join(ROOT, "packages", "catalog", "data", "mcu-pins.json"), "utf8")) as { rows: Row[] }).rows;
const row = (id: string): Row => {
  const r = ROWS.find((x) => x.id === id)!;
  return r.inherits === undefined ? r : { ...ROWS.find((x) => x.id === r.inherits)!, id };
};
const CATALOG_IDS = ROWS.filter((r) => r.legacy === undefined).map((r) => r.id);

const CARD = readFileSync(path.join(ROOT, "docs", "plan", "milestones", "M05-circuit-copper.md"), "utf8");
/** The T18 acceptance: the along segment of conductor.key1 equals <n> ohm within 0.1 percent. */
const KEY1_ALONG = Number(/conductor\.key1 \(15\.0 mm centreline[^)]*\) equals ([\d.]+) ohm/.exec(CARD.replace(/\s+/g, " "))![1]);

const ctx = { workspace: ROOT, cwd: ROOT, inputsHash: "0".repeat(64) } as unknown as CoreCtx;

let base: Built | undefined;
async function flexPair(): Promise<Built> {
  if (base === undefined) {
    const design = await loadDesign(REF, ROOT);
    base = await buildPart(design, resolveParams(design.chase, undefined, undefined));
  }
  return base;
}

/** The flex pair's build with its hookup replaced: wiring changes, the Part IR does not. */
async function wired(hookup: readonly HookupDecl[]): Promise<Built> {
  const b = await flexPair();
  return { ...b, design: { ...b.design, chase: { ...b.design.chase, hookup } } };
}

const pullupKey = (extra: Partial<Extract<HookupDecl["read"], { model: "pullup" }>> = {}, mcu = "rp2040"): HookupDecl[] => [
  { port: "port.key1", mcu, pin: "GP2", read: { model: "pullup", active: "low", ...extra } },
];

async function solve(b: Built, input: Partial<CircuitSolveInput> = {}): Promise<{ r: CommandResult<CircuitSolveOutput>; code: number }> {
  const r = finish(await solveBuilt(b, { build: REF, ...input }, ctx));
  return { r, code: exitOf(r) };
}

/**
 * The bound between the divider and the nodal solve: nodal stamps
 * NODAL_LEAK_S from the pin to ground (BOSS sim.js line 124), which moves
 * the pin by v x (Rpu || Rpath) x leak; twice that is the tolerance.
 */
const leakTol = (v: number, pullupOhm: number, pathOhm: number): number => 2 * v * ((pullupOhm * pathOhm) / (pullupOhm + pathOhm)) * NODAL_LEAK_S + 1e-12;

/** The pressed pin voltage the M05-T03 nodal solver gives for a pull and a path to 0 V. */
function nodal(vddV: number, pullupOhm: number, pathOhm: number): number {
  const s = solveDc({
    nodeCount: 3, ground: 0,
    elements: [
      { kind: "vsource", pos: 1, neg: 0, volts: vddV },
      { kind: "resistor", a: 1, b: 2, ohm: pullupOhm },
      { kind: "resistor", a: 2, b: 0, ohm: pathOhm },
    ],
  });
  return s.volts[2]!;
}

const stateOf = (v: number, r: Row): string => (v <= r.vilMaxV! ? "LOW" : v >= r.vihMinV! ? "HIGH" : "UNDEFINED");
const net05 = (r: CommandResult<CircuitSolveOutput>): CheckResult => r.result!.results.find((x) => x.id === "CHK-NET-05" && x.target.level === "feature" && (x.target as { feature: string }).feature === "port.key1")!;

describe("circuit.solve on the CLI", () => {
  test("flex pair: nets GND and K1, one charge-release read for K1 at 5 tau, wait 3500 us inferred, ok; K1 along equals the T18 card", async () => {
    const { code, r } = await json("circuit.solve", REF);
    expect(code).toBe(0);
    const out = r.result as unknown as CircuitSolveOutput;
    expect(out.nets.map((n) => n.id).sort()).toEqual(["GND", "K1"]);
    expect(out.reads).toHaveLength(1);
    const read = out.reads[0]!;
    expect([read.net, read.settleTaus, read.wait.emit.value, read.wait.emit.qualifier, read.ok]).toEqual(["K1", 5, 3500, "inferred", true]);
    const k1 = out.nets.find((n) => n.id === "K1")!;
    const along = k1.resistance[0]!.preview.segments.find((s) => s.direction === "along")!;
    expect(KEY1_ALONG).toBeGreaterThan(0);
    expect(Math.abs(along.ohm - KEY1_ALONG) / KEY1_ALONG).toBeLessThan(1e-3);
    // CHK-NET-05 version 2 targets pullup ports; the flex pair reads by charge-release (M05-T18).
    const n05 = (r.result as unknown as CircuitSolveOutput).results.filter((x) => x.id === "CHK-NET-05");
    expect(n05.length).toBeGreaterThan(0);
    for (const x of n05) expect(x.verdict).toBe("skip");
    expect(n05.find((x) => (x.target as { feature?: string }).feature === "port.key1")?.constraint).toContain("no port with read model pullup");
    expect(out.engine).toEqual({ name: "analytic", ran: false });
  }, 120_000);

  test("an unknown mcu exits 2 with E_REF and didYouMean listing the catalog row ids, before anything builds", async () => {
    for (const build of [REF, "reference/electrical/blocks-pullup-band"]) {
      const { code, r } = await json("circuit.solve", build, "--mcu", "nrf52");
      expect(code).toBe(2);
      expect(r.errors[0]!.code).toBe("E_REF");
      expect(r.errors[0]!.path).toBe("/mcu");
      // didYouMean holds at most three ids (D-064); the catalog holds four verdict rows since esp32-s3 (M08-T04 step 6).
      const dym = [...r.errors[0]!.didYouMean!];
      expect(dym).toHaveLength(Math.min(3, CATALOG_IDS.length));
      for (const id of dym) expect(CATALOG_IDS).toContain(id);
    }
  }, 60_000);

  test("the boss-legacy row is refused as a verdict row (D-076)", async () => {
    const { code, r } = await json("circuit.solve", REF, "--mcu", "boss-legacy");
    expect(code).toBe(2);
    expect(r.errors[0]!.record).toBe("D-076");
  });

  test("text mirror: one status line, the nets line, the engine line and one line per read", async () => {
    const { code, out } = await hbf(["circuit.solve", REF]);
    expect(code).toBe(0);
    const lines = out.trim().split("\n");
    // The button path checks run on the flex pair (M05-T19): CHK-NET-29 warns on K1 with inferred rows, nothing fails.
    expect(lines[0]).toMatch(/^WARN circuit\.solve reference\/keys\/flex-pair build \w+\.\.\w+ {3}0 fail {2}1 warn {2}\d+ pass {2}\d+ skip$/);
    expect(lines).toContain("engine analytic");
    expect(lines.some((l) => /^GP2 K1 charge-release tau [\d.]+ us, settle [\d.]+ us, wait 3500 us \(inferred\), reject \d+ ohm: settles, pressed [\d.]+ V LOW \(unknown\)$/.test(l))).toBe(true);
  }, 120_000);
});

describe("circuit.solve on a pullup read (the flex pair rewired)", () => {
  test("rp2040 internal pull: both ends HIGH as the nodal solver gives them, CHK-NET-05 fails on an empty interval, exit 1", async () => {
    const { r, code } = await solve(await wired(pullupKey()));
    const rp = row("rp2040");
    const op = r.result!.points[0]!;
    expect(op.pressed.map((x) => x.pullupOhm)).toEqual([rp.pullup!.minOhm, rp.pullup!.maxOhm]);
    for (const x of op.pressed) {
      const v = nodal(rp.vddV!, x.pullupOhm!, op.pathOhm);
      expect(Math.abs(x.volts - v)).toBeLessThan(leakTol(v, x.pullupOhm!, op.pathOhm));
      expect(x.state).toBe(stateOf(v, rp));
    }
    // The pressed path is the key net plus the return net, hi ends (PIP model.js Rn + common).
    const nets = r.result!.nets;
    expect(op.pathOhm).toBeCloseTo(nets.find((n) => n.id === "K1")!.totalOhm[1] + nets.find((n) => n.id === "GND")!.totalOhm[1], 6);
    const f = net05(r);
    expect(f.verdict).toBe("fail");
    expect(f.measured).toBe(rp.pullup!.minOhm);
    // Floor R (VDD - VIL) / VIL over the ceiling 80000 (CHECKS.md 7.5).
    const floor = (op.pathOhm * (rp.vddV! - rp.vilMaxV!)) / rp.vilMaxV!;
    expect(f.legal).toMatchObject({ kind: "interval", hi: rp.pullup!.maxOhm });
    expect((f.legal as { lo: number }).lo).toBeCloseTo(floor, 6);
    expect(f.extra?.["unsat"]).toBe("yes");
    expect(code).toBe(1);
    expect(r.counts.fail).toBe(1);
  }, 120_000);

  test("rp2040 internal pull over the cpla-protopasta rows: UNDEFINED at the range minimum, LOW at the maximum, a fail inside a non-empty interval", async () => {
    // The same geometry priced on the vendor cpla-protopasta rows: the conductor features name the material the legs read,
    // and the full profile (packages/profile/data) holds the row; the flex pair's seed slice does not.
    const b = await wired(pullupKey());
    const priced = {
      ...b,
      design: { ...b.design, ws: { ...b.design.ws, tables: fullProfile() } },
      part: { ...b.part, features: b.part.features.map((f) => (f.kind === "conductor" ? { ...f, material: "cpla-protopasta" } : f)) },
    };
    const { r, code } = await solve(priced);
    const rp = row("rp2040");
    const op = r.result!.points[0]!;
    const floor = (op.pathOhm * (rp.vddV! - rp.vilMaxV!)) / rp.vilMaxV!;
    // The interval is non-empty and the range minimum sits under its floor.
    expect(floor).toBeGreaterThan(rp.pullup!.minOhm!);
    expect(floor).toBeLessThan(rp.pullup!.maxOhm!);
    expect(op.pressed.map((x) => [x.pullupOhm, x.state])).toEqual(
      op.pressed.map((x) => [x.pullupOhm, stateOf(nodal(rp.vddV!, x.pullupOhm!, op.pathOhm), rp)]),
    );
    expect(op.pressed.map((x) => x.state)).toEqual(["UNDEFINED", "LOW"]);
    const f = net05(r);
    expect(f.verdict).toBe("fail");
    expect(f.extra?.["unsat"]).toBeUndefined();
    expect(f.measured).toBe(rp.pullup!.minOhm);
    expect((f.legal as { lo: number; hi: number; nearest: number }).hi).toBe(rp.pullup!.maxOhm);
    expect((f.legal as { lo: number }).lo).toBeCloseTo(floor, 6);
    expect((f.legal as { nearest: number }).nearest).toBeCloseTo(floor, 6);
    expect(code).toBe(1);
  }, 120_000);

  test("an external pull of 1 Mohm reads LOW: pass held to warn while the path rows are inferred (D-081), exit 0", async () => {
    const { r, code } = await solve(await wired(pullupKey({ externalOhm: 1_000_000 })));
    const rp = row("rp2040");
    const x = r.result!.points[0]!.pressed[0]!;
    const v = nodal(rp.vddV!, 1_000_000, r.result!.points[0]!.pathOhm);
    expect(Math.abs(x.volts - v)).toBeLessThan(leakTol(v, 1_000_000, r.result!.points[0]!.pathOhm));
    expect([x.pullupOhm, x.state, stateOf(v, rp)]).toEqual([1_000_000, "LOW", "LOW"]);
    const f = net05(r);
    expect(f.verdict).toBe("warn");
    expect(f.constraint).toContain("path rows inferred (D-081)");
    expect(code).toBe(0);
  }, 120_000);

  test("an external pull of 900 kohm reads UNDEFINED: UNDEFINED is a fail for CHK-NET-05, exit 1, and the fix names the M01 chain", async () => {
    const { r, code } = await solve(await wired(pullupKey({ externalOhm: 900_000 })));
    const rp = row("rp2040");
    const op: OperatingPoint = r.result!.points[0]!;
    const v = nodal(rp.vddV!, 900_000, op.pathOhm);
    expect(stateOf(v, rp)).toBe("UNDEFINED");
    expect(op.pressed[0]!.state).toBe("UNDEFINED");
    const f = net05(r);
    expect(f.verdict).toBe("fail");
    // Largest path that reads LOW at the pull: Rpu VIL / (VDD - VIL), whole ohm down.
    expect(f.extra?.["largestPathOhm"]).toBe(Math.floor((900_000 * rp.vilMaxV!) / (rp.vddV! - rp.vilMaxV!)));
    expect(f.constraint).toContain("conductor.width (M01-T08 chain)");
    expect(code).toBe(1);
    const text = renderResult("circuit.solve", REF, r).split("\n");
    // The clip pads of M05-T18 are unpriced contacts: no profile contact row exists.
    expect(text).toContain(`GP2 pressed ${op.pressed[0]!.volts.toFixed(2)} V at pullup 900000, rp2040 band 0.80 to 2.00 V: UNDEFINED (unknown, path tier inferred, unpriced pad.key1, pad.gnd, contact.key1)`);
  }, 120_000);

  test("--mcu esp32-c3 classifies at its one typical pull, against its own band", async () => {
    const { r } = await solve(await wired(pullupKey()), { mcu: "esp32-c3" });
    const c3 = row("esp32-c3");
    const op = r.result!.points[0]!;
    expect(op.mcu).toBe("esp32-c3");
    expect(op.pressed.map((x) => x.pullupOhm)).toEqual([c3.pullup!.typOhm]);
    expect(op.pressed[0]!.state).toBe(stateOf(nodal(c3.vddV!, c3.pullup!.typOhm!, op.pathOhm), c3));
    expect(r.result!.mcus.map((m: McuPinSpec) => m.id)).toEqual(["esp32-c3"]);
  }, 120_000);

  test("--pullup min and max classify one end each", async () => {
    const b = await wired(pullupKey());
    const rp = row("rp2040");
    expect((await solve(b, { pullup: "min" })).r.result!.points[0]!.pressed.map((x) => x.pullupOhm)).toEqual([rp.pullup!.minOhm]);
    expect((await solve(b, { pullup: "max" })).r.result!.points[0]!.pressed.map((x) => x.pullupOhm)).toEqual([rp.pullup!.maxOhm]);
  }, 120_000);

  test("analytic never resolves eecircuit-engine; --engine spice loads it once, agrees within 1e-9 V and records ngspice in buildInputs", async () => {
    const b = await wired(pullupKey());
    const before = spy.resolved;
    const analytic = (await solve(b)).r;
    expect(spy.resolved).toBe(before);
    expect(analytic.result!.engine).toEqual({ name: "analytic", ran: false });
    expect(analytic.result!.buildInputs.engines["ngspice"]).toBeUndefined();

    const spice = (await solve(b, { engine: "spice" })).r;
    expect(spy.resolved).toBe(before + 1);
    expect(spice.result!.engine).toEqual({ name: "spice", ran: true, ngspice: "45.2" });
    expect(spice.result!.buildInputs.engines["ngspice"]).toBe("45.2");
    const audited = (JSON.parse(readFileSync(path.join(ROOT, "tools", "licences.json"), "utf8")) as { dependencies: { name: string; version: string; audited: string }[] })
      .dependencies.find((x) => x.name === "eecircuit-engine" && x.version === "1.8.0")!.audited;
    expect(spice.result!.buildInputs.licences["eecircuit-engine"]).toBe(audited);
    const a = analytic.result!.points[0]!.pressed;
    const s = spice.result!.points[0]!.pressed;
    expect(s.map((x) => x.pullupOhm)).toEqual(a.map((x) => x.pullupOhm));
    a.forEach((x, i) => {
      expect(Math.abs(x.volts - s[i]!.volts)).toBeLessThan(1e-9);
      expect(s[i]!.state).toBe(x.state);
    });
    expect(spice.findings.map((f) => f.verdict)).toEqual(analytic.findings.map((f) => f.verdict));
  }, 180_000);

  test("stimulus names hookup ports held true; an unknown port is E_REF and a number is E_SCHEMA", async () => {
    const b = await wired(pullupKey());
    expect((await solve(b, { stimulus: { "port.key1": true } })).r.result!.points).toHaveLength(1);
    const thrown = async (input: Partial<CircuitSolveInput>): Promise<string> => {
      try {
        await solveBuilt(b, { build: REF, ...input }, ctx);
      } catch (e) {
        if (isThrownCommandError(e)) return `${e.hbf.code} ${e.hbf.path ?? ""}`;
        throw e;
      }
      return "no error";
    };
    expect(await thrown({ stimulus: { "port.key9": true } })).toBe("E_REF /stimulus/port.key9");
    expect(await thrown({ stimulus: { "port.key1": 3.3 } })).toBe("E_SCHEMA /stimulus/port.key1");
  }, 120_000);
});

// M05-T07: circuit.solve on the BLOCKS reproduction, the legacy scene path.
// The per-pin rows are checked against the card's expected table and BOSS's
// own readings in the reference's dumped scenes, never against this run.
describe("circuit.solve on the BLOCKS reproduction (M05-T07)", () => {
  const BAND = "reference/electrical/blocks-pullup-band";
  const T07 = CARD.slice(CARD.indexOf("## M05-T07 "), CARD.indexOf("## M05-T08 "));
  // | cPLA 10 mm | 1.308 | LOW | undefined | 1.308 UNDEFINED | 0.960 UNDEFINED | 1.392 UNDEFINED |
  const table = [...T07.matchAll(/^\| (cPLA|cTPU)(?: (zigzag|spiral))? (\d+) mm \| (\d\.\d{3}) \| (LOW|HIGH) \| (undefined|released|low) \|([^|]*)\|([^|]*)\|([^|]*)\|$/gm)]
    .map((m) => ({ scene: `button-${m[1]!.toLowerCase()}-${m[2] ?? "straight"}-${m[3]!.padStart(3, "0")}`, at50: m[4]!, read: m[5]!, band: m[6]!, rp50: m[7]!.trim(), rp80: m[8]!.trim(), esp45: m[9]!.trim() }));

  test("--mcu rp2040 exits 1 with the per-pin rows of the M05-T07 table; every scene fails CHK-NET-05", async () => {
    expect(table).toHaveLength(13);
    const { code, r } = await json("circuit.solve", BAND, "--mcu", "rp2040");
    expect(code).toBe(1);
    const out = r.result as unknown as CircuitSolveOutput;
    for (const t of table) {
      const legacyLine = `${t.scene} IO2 pressed ${t.at50} V at pullup 50000: boss-legacy 0.5 VIO read ${t.read}, hint band 0.3 to 0.7 VIO ${t.band}, path `;
      expect(out.lines.filter((l) => l.startsWith(legacyLine)), t.scene).toHaveLength(1);
      for (const [cell, pu] of [[t.rp50, 50000], [t.rp80, 80000]] as const) {
        if (cell === "") continue;
        const [v, state] = cell.split(" ");
        expect(out.lines, `${t.scene} ${pu}`).toContain(`${t.scene} IO2 pressed ${v} V at pullup ${pu}, rp2040 band 0.80 to 2.00 V: ${state} (computed, BOSS element list)`);
      }
    }
    const n05 = out.results.filter((x) => x.id === "CHK-NET-05");
    expect(n05.length).toBe(out.lines.filter((l) => / at pullup 50000: boss-legacy /.test(l)).length);
    for (const x of n05) expect(x.verdict).toBe("fail");
    expect(out.mcus.map((m) => m.id)).toEqual(["boss-legacy", "rp2040"]);
  }, 120_000);

  test("without --mcu the scene's rows are rp2040 and esp32-c3, and the esp32-c3 cells match the table", async () => {
    const { code, r } = await json("circuit.solve", BAND);
    expect(code).toBe(1);
    const out = r.result as unknown as CircuitSolveOutput;
    expect(out.mcus.map((m) => m.id)).toEqual(["boss-legacy", "rp2040", "esp32-c3"]);
    for (const t of table.filter((x) => x.esp45 !== "")) {
      const [v, state] = t.esp45.split(" ");
      expect(out.lines, t.scene).toContain(`${t.scene} IO2 pressed ${v} V at pullup 45000, esp32-c3 band 0.825 to 2.475 V: ${state} (computed, BOSS element list)`);
    }
  }, 120_000);

  test("every pressed volt at 50 kohm equals BOSS's own pin reading in the scene within 1e-9 V", async () => {
    const { r } = await json("circuit.solve", BAND, "--mcu", "rp2040", "--pullup", "min");
    const out = r.result as unknown as CircuitSolveOutput;
    const dir = path.join(ROOT, BAND, "scenes");
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      const s = JSON.parse(readFileSync(path.join(dir, f), "utf8")) as { name: string; boss: { pins: { pin: string; v: number }[] } };
      const want = s.boss.pins.find((p) => p.pin === "IO2")!.v;
      const p = out.points.find((x) => x.net === `${s.name}:IO2` && x.mcu === "rp2040")!;
      expect(p.pressed.map((x) => x.pullupOhm)).toEqual([50000]);
      expect(Math.abs(p.pressed[0]!.volts - want), s.name).toBeLessThan(1e-9);
    }
  }, 120_000);

  test("a stimulus is E_SCHEMA and the legacy row stays refused as a verdict row", async () => {
    const st = await json("circuit.solve", BAND, "--stimulus", "{\"IO2\":true}");
    expect(st.code).toBe(2);
    expect(st.r.errors[0]!.code).toBe("E_SCHEMA");
    expect(st.r.errors[0]!.path).toBe("/stimulus");
    const legacy = await json("circuit.solve", BAND, "--mcu", "boss-legacy");
    expect(legacy.code).toBe(2);
    expect(legacy.r.errors[0]!.record).toBe("D-076");
  }, 120_000);
});
