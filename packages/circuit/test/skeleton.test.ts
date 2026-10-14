// M-S-T05 circuit slice: the keys flex-pair build (spec fixture, through a
// test Author) gives each key net a 1D path resistance and a charge-release
// operating point against the rp2040 row. Expected figures are computed
// here from the card's inputs: cpla 500 ohm cm along (inferred, profile row
// cpla.pip.along), traces 1.4 x 0.72 mm, inputCap 7 pF (inferred), wait
// 3500 us (inferred, D-079).

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { canonicalize } from "@hackbuild/spec";
import {
  QUALIFIERS, isThrownCommandError,
  type Author, type BuildWarning, type FitClassId, type HookupDecl, type MachineView, type McuPinSpec, type PartDraft,
  type Qualified, type Ring, type Vec2,
} from "@hackbuild/spec";
import { createProfileLookup, layerIndex, layerTop, snapLayer, tablesFromSeed } from "@hackbuild/profile";
import { build, chase, type FlexPairParams } from "../../../spec/fixtures/keys-flex-pair";
import { conductorGraph, pressedPath, solveKeys, type KeyNetPoint } from "../src/index";
import { mcuPinRow } from "@hackbuild/catalog";

const seed: unknown = JSON.parse(readFileSync(new URL("../../profile/seed/profile.seed.json", import.meta.url), "utf8"));
const tables = tablesFromSeed(seed);

// ---- a test Author: the M00 kernel ships the real one ----

function machineOf(profile: ReturnType<typeof createProfileLookup>): MachineView {
  const p = profile.preset("ffc5p");
  return {
    id: "ffc5p", layerHeight: p.layer, firstLayer: p.firstLayer, lineWidth: p.lineWidth,
    layer: (z) => snapLayer(p, z), layerTop: (i) => layerTop(p, i), layerIndex: (z) => layerIndex(p, z),
    line: (n) => n * p.lineWidth,
  };
}

const circle = (r: number, at: Vec2 = [0, 0], segments = 64): Ring =>
  Array.from({ length: segments }, (_, i) => {
    const a = (2 * Math.PI * i) / segments;
    return [at[0] + r * Math.cos(a), at[1] + r * Math.sin(a)] as const;
  });

const roundRect = (w: number, h: number, r: number, at: Vec2 = [0, 0]): Ring => {
  const corners: readonly Vec2[] = [[w / 2 - r, -h / 2 + r], [w / 2 - r, h / 2 - r], [-w / 2 + r, h / 2 - r], [-w / 2 + r, -h / 2 + r]];
  const out: Vec2[] = [];
  corners.forEach(([cx, cy], c) => {
    for (let i = 0; i <= 8; i += 1) {
      const a = ((c - 1 + i / 8) * Math.PI) / 2;
      out.push([at[0] + cx + r * Math.cos(a), at[1] + cy + r * Math.sin(a)]);
    }
  });
  return out;
};

function testAuthor(): Author {
  const profile = createProfileLookup(tables);
  const machine = machineOf(profile);
  const unused = (name: string) => () => { throw new Error(`${name} is outside the M-S slice`); };
  return {
    profile,
    machine: () => machine,
    ring: { roundRect, circle, offset: unused("ring.offset") },
    body: (id, o) => ({ id, role: o.role, slot: o.slot, base: o.base, material: o.material ?? chase.materials.find((m) => m.slot === o.slot)?.material ?? "" }),
    part: (o) => ({ ...o, frame: { originOnAxis: false, carriesOffset: false, pose: "print", ...o.frame } }) as ReturnType<Author["part"]>,
    fit: (id) => id as FitClassId,
    derive: (_id, value) => value,
    bind: (f) => f,
    warn: (_code: string, _text: string) => undefined,
    face: (id, frame) => ({ id, frame }),
    applied: () => [],
    arch: unused("arch"),
    mech: unused("mech"),
  };
}

const presetParams = (id: string): FlexPairParams => {
  const row = chase.presets.find((p) => p.id === id);
  if (row === undefined) throw new Error(`no preset ${id}`);
  return { W: 60, H: 30, r: 4, keys: row.params.keys.map((key) => ({ ...key })), w: 1.4, pads: "clip" };
};

async function solvePreset(id: string): Promise<{ part: PartDraft; points: readonly KeyNetPoint[]; warnings: readonly BuildWarning[] }> {
  const part = (await build(presetParams(id), testAuthor())) as PartDraft;
  const mcu = (m: string): McuPinSpec => mcuPinRow(m);
  const out = solveKeys({ part, hookup: chase.hookup as readonly HookupDecl[], profile: createProfileLookup(tables), mcu });
  return { part, ...out };
}

const kohm = (ohm: number): string => (ohm / 1000).toFixed(1);

/** Every Qualified in a value tree, by JSON path. */
function qualifiedIn(x: unknown, at = ""): [string, Qualified][] {
  if (typeof x !== "object" || x === null) return [];
  const o = x as Record<string, unknown>;
  if (typeof o["value"] === "number" && typeof o["unit"] === "string") return [[at, o as unknown as Qualified]];
  return Object.entries(o).flatMap(([k, v]) => qualifiedIn(v, `${at}/${k}`));
}

describe("1D path resistance (D-072)", () => {
  test("preset one: key trace 15 mm gives 74.4 kohm, GND bus 30 mm gives 148.8 kohm (computed, inferred row)", async () => {
    const { points } = await solvePreset("one");
    expect(points).toHaveLength(1);
    const p = points[0] as KeyNetPoint;
    const leg = (id: string) => p.legs.find((l) => l.conductor === id);
    expect(leg("conductor.key1")).toMatchObject({ direction: "along", lengthMm: 15, ohmCm: 500, row: "cpla.pip.along", tier: "inferred" });
    expect(leg("conductor.key1")?.areaMm2).toBeCloseTo(1.4 * 0.72, 9);
    expect(kohm(leg("conductor.key1")?.ohm ?? 0)).toBe("74.4");
    expect(leg("conductor.gnd")).toMatchObject({ direction: "along", lengthMm: 30, ohmCm: 500 });
    expect(kohm(leg("conductor.gnd")?.ohm ?? 0)).toBe("148.8");
  });

  test("the pressed path runs lead, column, contact, column, stub, bus", async () => {
    const { points } = await solvePreset("one");
    const p = points[0] as KeyNetPoint;
    expect(p.legs.map((l) => l.conductor)).toEqual([
      "conductor.key1", "conductor.key1col", "conductor.gnd1col", "conductor.gnd1stub", "conductor.gnd",
    ]);
    expect(p.legs.filter((l) => l.direction === "through").map((l) => l.row)).toEqual(["cpla.pip.through", "cpla.pip.through"]);
    expect(p.path.terminals).toEqual(["port.key1", "port.gnd"]);
    expect(p.path.solved).toBeNull();
    const sum = p.legs.reduce((s, l) => s + l.ohm, 0);
    expect(p.path.preview.ohm).toBeCloseTo(sum, 6);
    expect(p.pathOhm).toMatchObject({ unit: "ohm", qualifier: "computed", basis: "inferred" });
    expect(p.pathOhm.value).toBeCloseTo(sum, 6);
  });

  test("nets touch only within themselves: the key lead never reaches the GND half", async () => {
    const { part } = await solvePreset("two");
    const g = conductorGraph(part);
    expect([...g.leads].sort()).toEqual(["conductor.gnd", "conductor.key1", "conductor.key2"]);
    expect(g.touches.get("conductor.key1")).toEqual(["conductor.key1col"]);
    expect([...(g.touches.get("conductor.gnd") ?? [])].sort()).toEqual(["conductor.gnd1stub", "conductor.gnd2stub"]);
  });
});

describe("cap and contact resistance stay unknown until a coupon", () => {
  test("every contact element is unpriced and the cap bridge is unknown", async () => {
    const { points } = await solvePreset("one");
    const p = points[0] as KeyNetPoint;
    expect(p.contacts.map((c) => [c.kind, c.qualifier, c.ohm])).toEqual([
      ["clip", "unknown", null], ["press", "unknown", null], ["press", "unknown", null], ["clip", "unknown", null],
    ]);
    expect(p.unpricedContacts).toEqual(p.contacts.map((c) => c.at));
    expect(p.capOhm).toMatchObject({ qualifier: "unknown", basis: null });
    expect(p.tracePf).toMatchObject({ unit: "pF", qualifier: "unknown", basis: null });
    expect(p.read.qualifier).toBe("unknown");
    expect(p.op.qualifier).toBe("unknown");
  });
});

describe("charge-release operating point against rp2040 (D-076, D-079)", () => {
  test("preset one: tau, reject and the read at the 3500 us wait", async () => {
    const { points } = await solvePreset("one");
    const p = points[0] as KeyNetPoint;
    const R = p.pathOhm.value;
    expect(p.pinPf).toMatchObject({ value: 7, unit: "pF", qualifier: "inferred", basis: "inferred" });
    expect(p.read.cPf).toBe(7);
    expect(p.read.tauUs).toBeCloseTo(R * 7e-6, 9);
    expect(p.read.settleUs).toBeCloseTo(5 * R * 7e-6, 9);
    // 3500 us / (5 x 7 pF) = 100 Mohm (computed).
    expect(p.read.rejectOhm).toBeCloseTo(100e6, 0);
    // 1 nA x 3500 us / 7 pF = 0.5 V (computed, inferred leakage).
    expect(p.read.idleDroopV).toBeCloseTo(0.5, 9);
    expect(p.read.wait.emit).toMatchObject({ value: 3500, unit: "us", qualifier: "inferred", basis: "inferred" });
    expect(p.read.wait.computed).toMatchObject({ unit: "us", qualifier: "computed", basis: "inferred" });
    expect(p.read.ok).toBe(true);
    expect(p.crossing.value).toBeCloseTo(R * 7e-6 * Math.log(3.3 / 0.8), 9);
    expect(p.headroomOhm.value).toBeCloseTo(100e6 - R, 0);

    expect(p.op).toMatchObject({ net: "K1", mcu: "rp2040", distinguishable: true });
    expect(p.op.pressed.map((r) => r.state)).toEqual(["LOW"]);
    expect(p.op.released.map((r) => r.state)).toEqual(["HIGH"]);
    // The declared read floats with no pull: pullupOhm is null, never
    // Infinity, so the point has one canonical JSON form (D-225).
    expect([...p.op.pressed, ...p.op.released].map((r) => r.pullupOhm)).toEqual([null, null]);
    expect(() => canonicalize([p.op, p.pullSweep])).not.toThrow();
    expect(p.op.released[0]?.volts).toBeCloseTo(2.8, 9);
  });

  test("with the internal pull on during the float, both ends of 50 to 80 kohm read the press HIGH", async () => {
    const { points } = await solvePreset("one");
    const p = points[0] as KeyNetPoint;
    const R = p.pathOhm.value;
    expect(p.pullSweep.pressed.map((r) => r.pullupOhm)).toEqual([50_000, 80_000]);
    for (const r of p.pullSweep.pressed) {
      expect(r.volts).toBeCloseTo((3.3 * R) / (R + (r.pullupOhm ?? Number.NaN)), 6);
      expect(r.state).toBe("HIGH");
    }
    expect(p.pullSweep.released.map((r) => r.state)).toEqual(["HIGH", "HIGH"]);
    expect(p.pullSweep.distinguishable).toBe(false);
  });

  test("preset two: one OperatingPoint per key net, each number qualified", async () => {
    const { points, warnings } = await solvePreset("two");
    expect(warnings).toEqual([]);
    expect(points.map((p) => [p.net, p.port, p.pin, p.op.net])).toEqual([
      ["K1", "port.key1", "GP2", "K1"], ["K2", "port.key2", "GP3", "K2"],
    ]);
    for (const p of points) {
      expect(p.op.distinguishable).toBe(true);
      const qs = qualifiedIn(p);
      expect(qs.length).toBeGreaterThanOrEqual(9);
      for (const [, q] of qs) expect(QUALIFIERS).toContain(q.qualifier);
    }
  });

  test("preset one skips the port.key2 hookup entry with a warning", async () => {
    const { warnings } = await solvePreset("one");
    expect(warnings.map((w) => w.code)).toEqual(["HOOKUP_PORT_ABSENT"]);
  });

  test("a net with no lead to the outline throws E_REF", async () => {
    const { part } = await solvePreset("one");
    const cut: PartDraft = { ...part, features: part.features.filter((f) => f.id !== "conductor.gnd") };
    const mcu = (): McuPinSpec => mcuPinRow("rp2040");
    let thrown: unknown;
    try {
      solveKeys({ part: cut, hookup: chase.hookup as readonly HookupDecl[], profile: createProfileLookup(tables), mcu });
    } catch (e) {
      thrown = e;
    }
    expect(isThrownCommandError(thrown)).toBe(true);
    expect((thrown as { hbf: { code: string } }).hbf.code).toBe("E_REF");
  });

  test("an unknown port or body is E_REF with didYouMean by edit distance", async () => {
    const { part } = await solvePreset("one");
    const portIds = part.features.filter((f) => f.kind === "port").map((f) => f.id);
    const real = portIds[0]!;
    const near = `${real}x`;
    let thrown: unknown;
    try {
      pressedPath(part, near, createProfileLookup(tables));
    } catch (e) {
      thrown = e;
    }
    expect(isThrownCommandError(thrown)).toBe(true);
    const hbf = (thrown as { hbf: { code: string; didYouMean?: string[] } }).hbf;
    expect(hbf.code).toBe("E_REF");
    expect(hbf.didYouMean?.[0]).toBe(real);
    expect((thrown as Error).message.startsWith(`E_REF /features ${"no port"}`)).toBe(true);

    const body = part.bodies[0]!.id;
    const conductor = part.features.find((f) => f.kind === "conductor")!;
    const moved: PartDraft = { ...part, features: part.features.map((f) => (f === conductor ? { ...f, body: `${body}x` } : f)) };
    let bodyThrown: unknown;
    try {
      conductorGraph(moved);
    } catch (e) {
      bodyThrown = e;
    }
    expect((bodyThrown as { hbf: { code: string; didYouMean?: string[] } }).hbf).toMatchObject({ code: "E_REF", didYouMean: expect.arrayContaining([body]) });
    expect((bodyThrown as { hbf: { didYouMean: string[] } }).hbf.didYouMean[0]).toBe(body);
  });
});
