// M06-T06, the originals rule for capsule-pocket-rotor: the canonical
// original is SLUG's slug.scad (lineage slug.scad/slug-12); its bodies are
// the drum cage of lines 171 to 213. OpenSCAD is not on this machine, so
// the geometry record is the original's own bake: slug.html OUTLINES (line
// 272), which bake.py wrote by running OpenSCAD on slug.scad and rounding
// every coordinate to 0.1 mm. reference/sheet/capsule-rotor-cage/
// expected/legacy.json holds those loops, PART_QTY, the scad assignments
// and audit.py's rows (test/legacy/record-slug-rotor.mjs). The port's
// loops, rounded the way bake.py rounds them, must equal every baked loop
// vertex for vertex; a port value on a 0.05 mm rounding boundary may round
// either way, since OpenSCAD's own float path decides it.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import type { ApplyIn, MechanismApplyOut, Vec2 } from "@hackbuild/spec";
import { cageParams, cageParts, mechanisms, type Values } from "@hackbuild/mechanisms";

interface LegacyPart { name: string; qty: number; loops: number[][][] }
interface Legacy {
  mechanism: string;
  source: { lineage: string; file: string; sha256: string; bench: { lineage: string; file: string; sha256: string } };
  values: Record<string, number>;
  gap: number;
  parts: LegacyPart[];
  audit: { rows: { rim: string; web: string; pocketClearance: string; slot: string } };
}
interface LineageRow { id: string; kind: string; source: string; sha256: string }

const root = new URL("../../../", import.meta.url);
const read = (p: string): string => readFileSync(new URL(p, root), "utf8");
const lineage = JSON.parse(read("lineage.json")) as LineageRow[];
const legacy = JSON.parse(read("reference/sheet/capsule-rotor-cage/expected/legacy.json")) as Legacy;
const build = JSON.parse(read("reference/sheet/capsule-rotor-cage/expected/build.json")) as { volumes: Record<string, number> };
const edit = JSON.parse(read("reference/sheet/capsule-rotor-cage/expected/edit.json")) as { pointer: string; from: number; to: number; expect: { changed: string[]; unchanged: string[] } };
const profile = createProfileLookup(loadProfile());
const def = mechanisms.resolve("capsule-pocket-rotor").def;

const defaults = (): Values => (def.params["~standard"].validate({}) as { value: Values }).value;
const place = (params: Values): MechanismApplyOut => def.apply!({
  draft: { id: "", name: "", process: "laser", machine: "sheet600", frame: { originOnAxis: false, carriesOffset: false, pose: "print" }, bodies: [], features: [] },
  face: { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] }, params, profile,
} as ApplyIn<Values>);

/** Python's round(x, 1) on the double x: exact, ties to even (bake.py's rounding). */
function pyRound1(x: number): number {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  const hi = view.getUint32(0);
  const lo = view.getUint32(4);
  const sign = hi >>> 31 ? -1n : 1n;
  const e = (hi >>> 20) & 0x7ff;
  let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let exp: number;
  if (e === 0) exp = -1074;
  else {
    mant |= 1n << 52n;
    exp = e - 1075;
  }
  let num = mant * 10n;
  let den = 1n;
  if (exp >= 0) num <<= BigInt(exp);
  else den <<= BigInt(-exp);
  let n = num / den;
  const rem = num - n * den;
  if (rem * 2n > den || (rem * 2n === den && n % 2n === 1n)) n += 1n;
  return Number(sign * n) / 10;
}

/** A baked coordinate is the port's rounded to 0.1 mm, or either neighbour when the port sits on a 0.05 boundary. */
function bakedFrom(baked: number, port: number): boolean {
  if (baked === pyRound1(port) + 0) return true;
  return Math.abs(Math.abs(baked - port) - 0.05) < 1e-9;
}

/** The baked loop equals the port loop in some start and winding, vertex for vertex under bake rounding. */
function sameLoop(baked: readonly number[][], port: readonly Vec2[]): boolean {
  if (baked.length !== port.length) return false;
  const n = port.length;
  for (const seq of [port, [...port].reverse()]) {
    for (let s = 0; s < n; s++) {
      if (baked.every((b, j) => bakedFrom(b[0]!, seq[(s + j) % n]![0]) && bakedFrom(b[1]!, seq[(s + j) % n]![1]))) return true;
    }
  }
  return false;
}

/** Every difference between the port's cage and the baked record, as text. */
function regenerate(leg: Legacy): string[] {
  const bad: string[] = [];
  const parts = cageParts(cageParams(defaults()));
  if (JSON.stringify(parts.map((p) => p.name)) !== JSON.stringify(leg.parts.map((p) => p.name))) bad.push("part names");
  for (const l of leg.parts) {
    const q = parts.find((p) => p.name === l.name);
    if (q === undefined) continue;
    if (q.qty !== l.qty) bad.push(`${l.name} qty ${q.qty}`);
    if (q.loops.length !== l.loops.length) bad.push(`${l.name} ${q.loops.length} loops`);
    const used = new Set<number>();
    l.loops.forEach((bl, k) => {
      const i = q.loops.findIndex((pl, j) => !used.has(j) && sameLoop(bl, pl));
      if (i < 0) bad.push(`${l.name} baked loop ${k}`);
      else used.add(i);
    });
  }
  return bad;
}

const area = (r: readonly (readonly number[])[]): number => {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const p = r[i]!;
    const q = r[(i + 1) % r.length]!;
    a += p[0]! * q[1]! - q[0]! * p[1]!;
  }
  return a / 2;
};
const cutArea = (loops: readonly (readonly (readonly number[])[])[]): number => Math.abs(area(loops[0]!)) - loops.slice(1).reduce((s, h) => s + Math.abs(area(h)), 0);

describe("capsule-pocket-rotor regenerates SLUG's drum cage", () => {
  test("typed, its canonical original and the bake it is held to pinned to their lineage rows", () => {
    expect(def.status).toBe("typed");
    expect(def.reference).toEqual(["sheet/capsule-rotor-cage"]);
    const [scad, bench] = def.original!;
    for (const [o, src] of [[scad!, legacy.source], [bench!, legacy.source.bench]] as const) {
      expect(o.sha256).toBe(src.sha256);
      const row = lineage.find((r) => r.id === src.lineage)!;
      expect(row.kind).toBe("canonical");
      expect(row.sha256).toBe(o.sha256);
      expect(row.source.endsWith(`slug/${o.file}`)).toBe(true);
    }
  });

  test("params round trip: the def's defaults are slug.scad's assignments", () => {
    const d = defaults();
    const v = legacy.values;
    const pairs: [string, string][] = [
      ["fn", "$fn"], ["t", "t"], ["slop", "slop"], ["capD", "cap_d"], ["pockD", "pock_d"], ["pockRc", "pock_rc"], ["nPock", "npock"], ["gm", "gm"],
      ["gzRot", "gz_rot"], ["gzPin", "gz_pin"], ["gpa", "gpa"], ["rotH", "rot_h"], ["rotGearN", "rot_gear_n"], ["rotRingZ", "rot_ring_z"],
      ["spcR", "spc_r"], ["spcN", "spc_n"], ["spcW", "spc_w"], ["spcBody", "spc_body"], ["rotBore", "rot_bore"], ["tieR", "tie_r"], ["tieR2", "tie_r2"], ["tieD", "tie_d"],
    ];
    expect(pairs.map(([k]) => d[k])).toEqual(pairs.map(([, s]) => v[s]));
  });

  test("every baked loop of the six cut parts regenerates under bake.py's rounding, and the quantities equal PART_QTY", () => {
    expect(legacy.parts.map((p) => [p.name, p.qty, p.loops.length])).toEqual([
      ["rotor_gear_a", 1, 14], ["rotor_gear_b", 1, 20], ["rotor_ring", 1, 26], ["rotor_top", 1, 20], ["spacer_a", 6, 1], ["spacer_b", 6, 1],
    ]);
    expect(regenerate(legacy)).toEqual([]);
  });

  test("a baked vertex moved by one rounding step fails the regeneration", () => {
    const moved = structuredClone(legacy);
    moved.parts[2]!.loops[0]![5]![0] = moved.parts[2]!.loops[0]![5]![0]! + 0.1;
    expect(regenerate(moved)).toEqual(["rotor_ring baked loop 0"]);
    const spacer = structuredClone(legacy);
    spacer.parts[5]!.loops[0]![6]![1] = 32.1;
    expect(regenerate(spacer)).toEqual(["spacer_b baked loop 0"]);
  });

  test("apply() lays every cut part out once per PART_QTY row, outlines equal to the port's loops moved in the row", () => {
    const out = place(defaults());
    const parts = cageParts(cageParams(defaults()));
    expect(out.bodies.length).toBe(legacy.parts.reduce((n, p) => n + p.qty, 0));
    expect(out.warnings).toEqual([]);
    let i = 0;
    let x = 0;
    for (const part of parts) {
      const xs = part.loops[0]!.map((q) => q[0]);
      const ys = part.loops[0]!.map((q) => q[1]);
      for (let n = 0; n < part.qty; n++) {
        const b = out.bodies[i++]!.base as { route: string; outline: readonly (readonly Vec2[])[]; z: readonly [number, number] };
        expect(b.route).toBe("prism");
        expect(b.z).toEqual([0, legacy.values["t"]]);
        expect(b.outline.length).toBe(part.loops.length);
        expect(Math.min(...b.outline[0]!.map((q) => q[0]))).toBeCloseTo(x, 9);
        expect(Math.min(...b.outline[0]!.map((q) => q[1]))).toBeCloseTo(0, 9);
        expect(Math.abs(cutArea(b.outline) - cutArea(part.loops))).toBeLessThan(1e-9);
        x += Math.max(...xs) - Math.min(...xs) + legacy.gap;
      }
    }
  });

  test("the reference build's meshed volumes equal cut area x t of the port's loops within the 1/1024 mm grid's reach", () => {
    const out = place(defaults());
    const t = legacy.values["t"]!;
    for (const b of out.bodies) {
      const base = b.base as { outline: readonly (readonly Vec2[])[] };
      const got = build.volumes[`capsule-pocket-rotor.0.${b.id}`]!;
      const perimeter = base.outline.reduce((s, r) => s + r.reduce((p, q, j) => p + Math.hypot(r[(j + 1) % r.length]![0] - q[0], r[(j + 1) % r.length]![1] - q[1]), 0), 0);
      expect(Math.abs(got - cutArea(base.outline) * t), b.id).toBeLessThan(perimeter * (1 / 1024) * t);
    }
    // The baked loops' area against the port's, an informational gap the 0.1 mm bake rounding opens.
    const parts = cageParts(cageParams(defaults()));
    for (const l of legacy.parts) {
      const q = parts.find((p) => p.name === l.name)!;
      expect(Math.abs(cutArea(l.loops) - cutArea(q.loops)) / cutArea(q.loops), l.name).toBeLessThan(2e-3);
    }
  });

  test("derive() gives audit.py's rim, web, pocket clearance and slot at its printed precision", () => {
    const d = def.derive(defaults(), profile);
    const rows = legacy.audit.rows;
    expect(rows.rim).toContain(`${d["rim"]!.value.toFixed(1)} mm`);
    expect(rows.web).toContain(`${d["web"]!.value.toFixed(1)} mm`);
    expect(rows.pocketClearance).toContain(`${d["pocketSlop"]!.value.toFixed(1)} mm`);
    expect(rows.slot).toContain(`${d["slotWidth"]!.value.toFixed(2)} vs ${legacy.values["t"]!.toFixed(2)} mm`);
    expect(d["spacerGapA"]!.value).toBe(legacy.values["spc_gap1"]);
    expect(d["spacerGapB"]!.value).toBe(legacy.values["spc_gap2"]);
    expect(d["rootR"]!.value).toBe(91.875);
  });

  test("edit pocket dia 62 to 60 moves the four discs, leaves the twelve spacers, and opens the web by 2 mm", () => {
    expect([edit.pointer, edit.from, edit.to]).toEqual(["/pockD", 62, 60]);
    const a = place(defaults());
    const b = place({ ...defaults(), pockD: 60 });
    const moved = a.bodies.filter((x, i) => JSON.stringify(x.base) !== JSON.stringify(b.bodies[i]!.base)).map((x) => `capsule-pocket-rotor.0.${x.id}`);
    expect(moved).toEqual(edit.expect.changed);
    expect(a.bodies.length - moved.length).toBe(edit.expect.unchanged.length);
    const da = def.derive(defaults(), profile);
    const db = def.derive({ ...defaults(), pockD: 60 }, profile);
    expect(db["web"]!.value - da["web"]!.value).toBeCloseTo(2, 12);
  });

  test("a param set that makes the cuts meet is refused rather than drawn wrong", () => {
    expect(() => place({ ...defaults(), pockD: 70 })).toThrow(expect.objectContaining({ hbf: expect.objectContaining({ code: "E_SCHEMA" }) }));
  });
});
