// M05-T03: the analytic DC solver against the BOSS sim on BOSS's own
// element lists. The fixtures under fixtures/boss-scenes are written by
// tools/legacy/boss/dump-elements.cjs from designs/blocks/legacy/boss-src
// and hold BOSS's node voltages, element currents and pin readings; this
// file holds none of those numbers. The readings the card quotes, and the
// M05-T07 expected table, are read from the card itself.

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { planCard } from "../../../tools/test-support/plan-root.js";
import { solveDc, type DcElement, type DcNetwork } from "@hackbuild/circuit";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const SCENES = fileURLToPath(new URL("./fixtures/boss-scenes/", import.meta.url));
const LEGACY = `${ROOT}designs/blocks/legacy/`;
const CARD = planCard("M05-circuit-copper.md");

const V_TOL = 1e-9;
const A_TOL = 1e-12;

interface Scene {
  name: string;
  source: string;
  pullupOhm: number;
  ok: boolean;
  sources: Record<string, string>;
  network: {
    nodeCount: number; ground: number; nodes: string[];
    resistors: { a: number; b: number; ohm: number; tag: string }[];
    leds: { anode: number; cathode: number; vfV: number; seriesOhm: number }[];
    sources: { pos: number; neg: number; volts: number; tag: string }[];
  };
  boss: {
    nodeVolts: number[];
    resistorAmps: number[];
    leds: { mA: number; v: number }[];
    pins: { pin: string; mode: string; node: number; v: number; adc: number; digital: string }[];
  };
  printed?: string[];
  button?: { shape: string; lenMm: number; core: string; pressed: boolean };
}

const files = readdirSync(SCENES).filter((f) => f.endsWith(".json")).sort();
const scenes: Scene[] = files.map((f) => JSON.parse(readFileSync(SCENES + f, "utf8")) as Scene);
const byName = new Map(scenes.map((s) => [s.name, s]));
const scene = (name: string): Scene => {
  const s = byName.get(name);
  if (s === undefined) throw new Error(`no scene ${name} in ${SCENES}`);
  return s;
};

// Resistors first, then LEDs, then sources: the element order BOSS stamps.
function network(s: Scene): DcNetwork {
  const elements: DcElement[] = [
    ...s.network.resistors.map((r): DcElement => ({ kind: "resistor", a: r.a, b: r.b, ohm: r.ohm, tag: r.tag })),
    ...s.network.leds.map((d): DcElement => ({ kind: "ledPwl", anode: d.anode, cathode: d.cathode, vfV: d.vfV, seriesOhm: d.seriesOhm })),
    ...s.network.sources.map((v): DcElement => ({ kind: "vsource", pos: v.pos, neg: v.neg, volts: v.volts, tag: v.tag })),
  ];
  return { nodeCount: s.network.nodeCount, ground: s.network.ground, elements };
}

function solved(s: Scene) {
  const sol = solveDc(network(s));
  const nr = s.network.resistors.length;
  const nd = s.network.leds.length;
  const pin = (name: string): number => {
    const p = s.boss.pins.find((q) => q.pin === name);
    if (p === undefined) throw new Error(`${s.name} has no pin ${name}`);
    return sol.volts[p.node]!;
  };
  return {
    ...sol,
    resistorAmps: Array.from(sol.amps.subarray(0, nr)),
    ledMa: Array.from(sol.amps.subarray(nr, nr + nd), (a) => a * 1e3),
    ledV: s.network.leds.map((d) => sol.volts[d.anode]! - sol.volts[d.cathode]!),
    pin,
  };
}

describe("scene set", () => {
  // Every solve() each shipped script runs is a scene: test_sim.js calls
  // sc.solve() directly, test_sim2.js through rep(tag).
  test.each([
    ["test_sim.js", "test-sim", /sc\.solve\(\)/g],
    ["test_sim2.js", "test-sim2", /\brep\('/g],
  ])("%s: one fixture per solve", (file, prefix, call) => {
    const text = readFileSync(`${LEGACY}boss-src/${file}`, "utf8");
    const want = text.match(call)!.length;
    const got = scenes.filter((s) => s.source === file);
    expect(got.length).toBe(want);
    expect(got.map((s) => s.name)).toEqual(Array.from({ length: want }, (_, i) => `${prefix}-${String(i + 1).padStart(2, "0")}`));
  });

  test("the legacy copy and every fixture carry the hashes the README pins", () => {
    const readme = readFileSync(`${LEGACY}README.md`, "utf8");
    const pinned = new Map([...readme.matchAll(/^([0-9a-f]{64})  (\S+)$/gm)].map((m) => [m[2]!, m[1]!]));
    const onDisk = ["boss-src.zip", ...readdirSync(`${LEGACY}boss-src`, { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile()).map((e) => `${e.parentPath.slice(LEGACY.length)}/${e.name}`)].sort();
    expect([...pinned.keys()].sort()).toEqual(onDisk);
    for (const [rel, sha] of pinned) {
      expect(createHash("sha256").update(readFileSync(LEGACY + rel)).digest("hex"), rel).toBe(sha);
    }
    for (const s of scenes) {
      for (const [rel, sha] of Object.entries(s.sources)) expect(pinned.get(`boss-src/${rel}`), `${s.name} ${rel}`).toBe(sha);
    }
  });
});

describe("analytic DC equals BOSS on every BOSS scene", () => {
  test.each(scenes.map((s) => [s.name, s] as const))("%s", (_, s) => {
    expect(s.ok).toBe(true);
    const r = solved(s);
    expect(r.converged).toBe(true);
    expect(r.volts.length).toBe(s.boss.nodeVolts.length);
    let dv = 0;
    let di = 0;
    s.boss.nodeVolts.forEach((v, i) => { dv = Math.max(dv, Math.abs(r.volts[i]! - v)); });
    s.boss.resistorAmps.forEach((a, i) => { di = Math.max(di, Math.abs(r.resistorAmps[i]! - a)); });
    s.boss.leds.forEach((l, i) => {
      di = Math.max(di, Math.abs(r.ledMa[i]! - l.mA) * 1e-3);
      dv = Math.max(dv, Math.abs(r.ledV[i]! - l.v));
    });
    for (const p of s.boss.pins) dv = Math.max(dv, Math.abs(r.volts[p.node]! - p.v));
    expect(r.resistorAmps.length).toBe(s.boss.resistorAmps.length);
    expect(dv).toBeLessThan(V_TOL);
    expect(di).toBeLessThan(A_TOL);
  });
});

// The acceptance readings of M05-T03, read from the card's own lines.
function cardReading(re: RegExp): string[] {
  const section = CARD.split(/^## /m).find((s) => s.startsWith("M05-T03 "))!;
  const m = section.replace(/\s+/g, " ").match(re);
  if (m === null) throw new Error(`M05-T03 acceptance has no line matching ${re}`);
  return m.slice(1);
}

describe("M05-T03 acceptance readings", () => {
  test("test_sim2.js: IO2 released and pressed, lamp on supply, lamp on IO3 OUT_H", () => {
    const [rel, pressed, supMa, supV, io3Ma, io3V] = cardReading(
      /IO2 released (\d\.\d\d) V, pressed (\d\.\d\d) V .*?lamp on supply (\d\.\d\d) mA at (\d\.\d\d) V, lamp on IO3 OUT_H (\d\.\d\d) mA at (\d\.\d\d) V/,
    );
    expect(solved(scene("test-sim2-01")).pin("IO2").toFixed(2)).toBe(rel);
    expect(solved(scene("test-sim2-02")).pin("IO2").toFixed(2)).toBe(pressed);
    const lamp = solved(scene("test-sim2-04"));
    expect([lamp.ledMa[0]!.toFixed(2), lamp.ledV[0]!.toFixed(2)]).toEqual([supMa, supV]);
    const io3 = solved(scene("test-sim2-06"));
    expect([io3.ledMa[1]!.toFixed(2), io3.ledV[1]!.toFixed(2)]).toEqual([io3Ma, io3V]);
  });

  test("test_sim.js: LED with wires, IO2 released and pressed", () => {
    const [ma, v, rel, pressed] = cardReading(/with wires LED (\d\.\d{3}) mA at (\d\.\d\d) V, IO2 released (\d\.\d\d) V, pressed (\d\.\d\d) V/);
    const w = solved(scene("test-sim-02"));
    expect([w.ledMa[0]!.toFixed(3), w.ledV[0]!.toFixed(2)]).toEqual([ma, v]);
    expect(solved(scene("test-sim-03")).pin("IO2").toFixed(2)).toBe(rel);
    expect(solved(scene("test-sim-04")).pin("IO2").toFixed(2)).toBe(pressed);
  });

  test("the lines BOSS printed carry the same rounded readings", () => {
    for (const s of scenes.filter((x) => x.source === "test_sim2.js")) {
      const r = solved(s);
      const leds = r.ledMa.map((ma, i) => `${ma.toFixed(2)}mA@${r.ledV[i]!.toFixed(2)}V`).join(" ");
      expect(s.printed![0]).toMatch(new RegExp(` IO2 ${r.pin("IO2").toFixed(2).replace(".", "\\.")} \\w+ leds ${leds.replace(/\./g, "\\.")}$`));
    }
  });
});

// M05-T07 expected table, pressed IO2 at the BOSS 50 kohm pullup and at the
// two catalog pullups the dump runs (80 mm cPLA): the 3 decimal cells.
describe("M05-T07 expected table through the dumped BUTTON scenes", () => {
  const section = CARD.split(/^## /m).find((s) => s.startsWith("M05-T07 "))!;
  const rows = [...section.matchAll(/^\| (cPLA|cTPU)(?: (zigzag|spiral))? (\d+) mm \| (\d\.\d{3}) \|[^|]*\|[^|]*\|[^|]*\|\s*(?:(\d\.\d{3}) \w+)?\s*\|\s*(?:(\d\.\d{3}) \w+)?\s*\|/gm)];
  test("the table parses", () => expect(rows.length).toBe(13));
  test.each(rows.map((m) => [m[0].slice(0, 30), m] as const))("%s", (_, m) => {
    const [, core, shape, len, at50, at80k, at45k] = m;
    const base = `button-${core!.toLowerCase()}-${shape ?? "straight"}-${len!.padStart(3, "0")}`;
    expect(solved(scene(base)).pin("IO2").toFixed(3)).toBe(at50);
    if (base === "button-cpla-straight-080") {
      expect(solved(scene(`${base}-pu80000`)).pin("IO2").toFixed(3)).toBe(at80k);
      expect(solved(scene(`${base}-pu45000`)).pin("IO2").toFixed(3)).toBe(at45k);
    }
  });
});

describe("solveDc", () => {
  test("a 1 kohm over 1 kohm divider on 5 V gives 2.5 V and 2.5 mA, the source delivering 2.5 mA (computed by hand)", () => {
    const r = solveDc({ nodeCount: 3, ground: 0, elements: [
      { kind: "vsource", pos: 1, neg: 0, volts: 5 },
      { kind: "resistor", a: 1, b: 2, ohm: 1000 },
      { kind: "resistor", a: 2, b: 0, ohm: 1000 },
    ] });
    expect(r.volts[2]).toBeCloseTo(2.5, 6);
    expect(r.amps[1]).toBeCloseTo(2.5e-3, 9);
    expect(r.amps[0]).toBeCloseTo(-2.5e-3, 9);
  });

  test("two sources holding one node at different volts is E_KERNEL", () => {
    expect(() => solveDc({ nodeCount: 2, ground: 0, elements: [
      { kind: "vsource", pos: 1, neg: 0, volts: 3.3 },
      { kind: "vsource", pos: 1, neg: 0, volts: 5 },
    ] })).toThrow(expect.objectContaining({ hbf: expect.objectContaining({ code: "E_KERNEL" }) }));
  });

  test("a node index outside the network is E_SCHEMA", () => {
    expect(() => solveDc({ nodeCount: 2, ground: 0, elements: [{ kind: "resistor", a: 0, b: 2, ohm: 1 }] }))
      .toThrow(expect.objectContaining({ hbf: expect.objectContaining({ code: "E_SCHEMA", path: "/elements/0/b" }) }));
  });
});
