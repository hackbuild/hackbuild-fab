// M06-T02 parity: the 18 TUMBLER modules of the port against the legacy
// record test/legacy/tumbler.json, which record-tumbler.mjs wrote by
// running the canonical original's own module library under node. For
// each of the 9 bench materials and 18 modules: part count and names,
// every outline, hole and score vertex within 1e-6 mm, the plan warnings
// as strings, the readouts as the bay prints them, the logic table and the
// stateful sequences. Nothing expected here is computed by the port.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { localOriginal } from "../../../tools/test-support/originals-root.js";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import {
  CUT_SHEET_WIDTH, TUMBLER_MATERIALS, TUMBLER_MODULES, defaults, packSheet, sheetAudit, tumblerDefaults, tumblerDerive, tumblerMaterial,
  type Inputs, type ModuleState, type Pts, type SheetPart,
} from "@hackbuild/mechanisms";

interface LegacyPart { name: string; w: number; h: number; outer: number[][]; holes: number[][][]; score: number[][][] }
interface LegacyCase {
  module: string; material: string; parts: LegacyPart[]; warnings: string[][]; read: [string, string][]; placed: [number, number][];
  logic?: { inputs: Record<string, number>; q: boolean; want: boolean }[];
  levels?: number[];
  sequence?: { inputs: Record<string, number>; q: number }[];
}
interface LegacyRecord {
  source: { lineage: string; file: string; sha256: string; library: string; vals: number; sheetW: { value: number; line: number } };
  fit: number;
  materials: { name: string; t: number; k: number; E: number }[];
  logicMismatches: number;
  cases: LegacyCase[];
}

const root = new URL("../../../", import.meta.url);
const record = JSON.parse(readFileSync(new URL("packages/mechanisms/test/legacy/tumbler.json", root), "utf8")) as LegacyRecord;
const lineage = JSON.parse(readFileSync(new URL("lineage.json", root), "utf8")) as { id: string; kind: string; source: string; sha256: string }[];
const TOL = 1e-6;

/** The largest vertex distance between two point lists of equal length, or Infinity when the lengths differ. */
function worst(a: Pts, b: readonly number[][]): number {
  if (a.length !== b.length) return Infinity;
  let d = 0;
  a.forEach((p, i) => {
    d = Math.max(d, Math.abs(p[0] - b[i]![0]!), Math.abs(p[1] - b[i]![1]!));
  });
  return d;
}

/** Every geometric difference between a ported part and its legacy part, as text; empty when they agree within TOL. */
function partDiff(port: SheetPart, leg: LegacyPart): string[] {
  const out: string[] = [];
  if (port.name !== leg.name) out.push(`name ${port.name} != ${leg.name}`);
  if (Math.abs(port.w - leg.w) > TOL || Math.abs(port.h - leg.h) > TOL) out.push(`extents ${port.w} x ${port.h} != ${leg.w} x ${leg.h}`);
  if (worst(port.outer, leg.outer) > TOL) out.push("outer");
  if (port.holes.length !== leg.holes.length) out.push(`holes ${port.holes.length} != ${leg.holes.length}`);
  else port.holes.forEach((h, i) => { if (worst(h, leg.holes[i]!) > TOL) out.push(`hole ${i + 1}`); });
  if (port.score.length !== leg.score.length) out.push(`scores ${port.score.length} != ${leg.score.length}`);
  else port.score.forEach((s, i) => { if (worst(s, leg.score[i]!) > TOL) out.push(`score ${i + 1}`); });
  return out;
}

const STEP_KEYS = (c: LegacyCase): string[] => Object.keys(c.logic?.[0]?.inputs ?? c.sequence?.[0]?.inputs ?? {});

/** All-zero inputs of the module, living hinge at A 1 (the recorder's rule, the bench default). */
function zero(id: string, keys: readonly string[]): Inputs {
  const u: Record<string, number> = {};
  for (const k of keys) u[k] = 0;
  if (id === "hinge") u["A"] = 1;
  return u;
}

describe("legacy record", () => {
  test("pinned to the canonical original: lineage row, sha256 and the file on disk", () => {
    const row = lineage.find((r) => r.id === record.source.lineage);
    expect(row?.kind).toBe("canonical");
    expect(row?.sha256).toBe(record.source.sha256);
    expect(createHash("sha256").update(readFileSync(localOriginal(row!.source))).digest("hex")).toBe(record.source.sha256);
  });

  test("the cut sheet width is the original's planSVGFile width", () => {
    expect(CUT_SHEET_WIDTH).toBe(record.source.sheetW.value);
  });

  test("the port's material strip is the original's MATS and G.c", () => {
    expect(TUMBLER_MATERIALS.map((m) => ({ name: m.name, t: m.t, k: m.k, E: m.E }))).toEqual(record.materials);
    for (const m of TUMBLER_MATERIALS) expect(m.c).toBe(record.fit);
  });

  test("the comparator bites: a vertex moved 2e-6 mm reads as a difference", () => {
    const c = record.cases[0]!;
    const leg = c.parts[0]!;
    const moved: LegacyPart = { ...leg, outer: leg.outer.map((p, i) => (i === 1 ? [p[0]! + 2e-6, p[1]!] : p)) };
    const port = TUMBLER_MODULES.find((m) => m.id === c.module)!.plan(defaults(TUMBLER_MODULES[0]!), tumblerMaterial(c.material)!)[0]!;
    expect(partDiff(port, leg)).toEqual([]);
    expect(partDiff(port, moved)).toEqual(["outer"]);
  });
});

describe("18 modules across 9 materials", () => {
  test("every case regenerates parts, warnings, readouts, logic and sequences", () => {
    let parts = 0;
    let warnings = 0;
    let mismatches = 0;
    const bad: string[] = [];
    expect(record.cases.length).toBe(TUMBLER_MODULES.length * TUMBLER_MATERIALS.length);
    for (const c of record.cases) {
      const mod = TUMBLER_MODULES.find((m) => m.id === c.module);
      const mat = tumblerMaterial(c.material);
      expect(mod, c.module).toBeDefined();
      expect(mat, c.material).toBeDefined();
      const p = defaults(mod!);
      const tag = `${c.module} on ${c.material}`;
      const plan = mod!.plan(p, mat!);
      if (plan.length !== c.parts.length) bad.push(`${tag}: ${plan.length} parts, legacy ${c.parts.length}`);
      plan.forEach((q, i) => {
        const leg = c.parts[i];
        if (leg !== undefined) for (const d of partDiff(q, leg)) bad.push(`${tag}: ${leg.name}: ${d}`);
      });
      const pk = packSheet(plan, record.source.sheetW.value).placed.map((o) => [o.x, o.y]);
      if (pk.length !== c.placed.length || pk.some((q, i) => Math.abs(q[0]! - c.placed[i]![0]) > TOL || Math.abs(q[1]! - c.placed[i]![1]) > TOL)) bad.push(`${tag}: cut sheet placements`);
      const w = plan.map((q) => sheetAudit(q, mat!.k));
      if (JSON.stringify(w) !== JSON.stringify(c.warnings)) bad.push(`${tag}: warnings ${JSON.stringify(w)} != ${JSON.stringify(c.warnings)}`);
      const keys = STEP_KEYS(c).length > 0 ? STEP_KEYS(c) : mod!.inputs;
      const read = mod!.drive(p, mat!, zero(mod!.id, mod!.inputs), {}).read.map(([k, v]) => [k, v]);
      if (JSON.stringify(read) !== JSON.stringify(c.read)) bad.push(`${tag}: read ${JSON.stringify(read)} != ${JSON.stringify(c.read)}`);
      for (const l of c.logic ?? []) {
        const q = mod!.drive(p, mat!, l.inputs, {}).q > 0.5;
        if (q !== l.q) bad.push(`${tag}: logic ${JSON.stringify(l.inputs)} q ${q}, legacy ${l.q}`);
        const want = mod!.lg !== undefined ? mod!.lg(keys.map((k) => l.inputs[k]!)) : l.inputs["KEY"] === 1 && l.inputs["WRONG"] === 0;
        if (want !== l.want) bad.push(`${tag}: lg ${JSON.stringify(l.inputs)} ${want}, legacy ${l.want}`);
        if (q !== want) mismatches++;
      }
      if (c.levels !== undefined) {
        const lv = [0, 1, 2, 3, 4, 5, 6, 7].map((v) => mod!.drive(p, mat!, { B0: v & 1, B1: (v >> 1) & 1, B2: (v >> 2) & 1 }, {}).q);
        if (JSON.stringify(lv) !== JSON.stringify(c.levels)) bad.push(`${tag}: levels ${lv.join(",")} != ${c.levels.join(",")}`);
      }
      if (c.sequence !== undefined) {
        const st: ModuleState = {};
        const qs = c.sequence.map((s) => mod!.drive(p, mat!, s.inputs, st).q);
        if (JSON.stringify(qs) !== JSON.stringify(c.sequence.map((s) => s.q))) bad.push(`${tag}: sequence ${qs.join(",")}`);
      }
      parts += plan.length;
      warnings += w.flat().length;
    }
    expect(bad).toEqual([]);
    expect(mismatches).toBe(record.logicMismatches);
    console.log(`cases ${record.cases.length} parts ${parts} warnings ${warnings} logic ${mismatches} mismatches`);
    // The card's computed totals (M06-T02): cases 162, parts 567, plan warnings 24, logic mismatches 0.
    expect([record.cases.length, parts, warnings, mismatches]).toEqual([162, 567, 24, 0]);
  });

  test("at defaults (Delrin/POM 3 mm): parts 63, plan warnings 0", () => {
    const d = TUMBLER_MATERIALS[0]!;
    const plans = TUMBLER_MODULES.map((m) => m.plan(defaults(m), d));
    expect(plans.flat().length).toBe(63);
    expect(plans.flat().flatMap((q) => sheetAudit(q, d.k))).toEqual([]);
  });

  test("the 24 warnings are the HDPE living hinge's slits under 1.5 kerf", () => {
    const w = record.cases.flatMap((c) => c.warnings.flat().map((s) => `${c.module}|${c.material}|${s}`));
    expect(w.length).toBe(24);
    for (const s of w) expect(s).toMatch(/^hinge\|HDPE 3mm\|HINGE PANEL: hole \d+ thinner than 1\.5 kerf, it will fuse shut$/);
  });
});

/**
 * Each printed readout of the bay and the derive() key that must print the
 * same text (M06-T02 "Done when": every legacy number the bench prints
 * comes back from derive()). Digits are the original's toFixed; "int" is a
 * whole number, "group" a whole number with comma thousands, "raw" the
 * number as JavaScript prints it. Labels whose text is no number (the
 * state words, "2 x slide", "notch under pin") have no key.
 */
type Fmt = number | "int" | "group" | "raw";
const READOUT: Readonly<Record<string, readonly (readonly [string, string, Fmt])[]>> = {
  coin: [["stack", "stack", 1], ["pin clear", "pinClear", 2]],
  inh: [["stack", "stack", 1]],
  or: [["ratio", "ratio", 2], ["out stroke", "outStroke", 1], ["ramp", "ramp", "raw"]],
  teet: [["gain", "gain", 2], ["out stroke", "outStroke", 1], ["spring", "springForce", 2]],
  diff: [["pins", "pins", "int"], ["bars", "bars", "int"], ["lost motion", "lostMotion", 1]],
  tumb: [["pins", "pins", "int"], ["codes", "codes", "group"], ["window", "window", "raw"]],
  latch: [["hold force", "holdForce", 2], ["throw", "throw", "raw"]],
  snap: [["h/t", "riseOverT", 2], ["snap est", "snapForce", 2], ["stable", "stableStates", "int"]],
  ratch: [["step", "stepAngle", 1], ["carry every", "carryEvery", "int"]],
  drum: [["step angle", "stepAngle", 1], ["words", "words", "int"], ["bits", "bits", "int"]],
  gen: [["index", "indexAngle", 1], ["centres", "centres", 2], ["wheel dia", "wheelDia", 1]],
  spur: [["centres", "centres", 2], ["ratio", "ratio", 2], ["OD A/B", "odA", 1], ["OD A/B", "odB", 1]],
  whif: [["stops", "stops", "int"], ["full stroke", "fullStroke", 2], ["LSB", "lsb", 2]],
  hinge: [["bend R", "bendRadius", 1], ["per row", "degPerRow", 1], ["ligament", "ligament", 2]],
  fing: [["pitch", "pitch", 2], ["tab", "tab", 2], ["slot", "slot", 2]],
  tesla: [["loops", "loops", "int"], ["est diodicity", "diodicity", 2], ["Re window", "reLo", "int"], ["Re window", "reHi", "int"]],
  coanda: [["nozzle", "nozzle", "raw"], ["splitter", "splitter", 1]],
  memb: [["est close", "closePressure", 0], ["layers", "layers", "int"]],
};

const r3 = (n: number): number => Math.round(n * 1000) / 1000;
function printed(v: number, f: Fmt): string {
  if (f === "raw") return String(v);
  if (f === "int") return String(Math.round(v));
  if (f === "group") return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return r3(v).toFixed(f);
}

describe("derive() prints every legacy readout (M06-T03 step 1)", () => {
  const profile = createProfileLookup(loadProfile());
  test("every numeric readout of the 162 cases comes back from derive() at the bay's printed precision", () => {
    const bad: string[] = [];
    let compared = 0;
    for (const c of record.cases) {
      const mod = TUMBLER_MODULES.find((m) => m.id === c.module)!;
      const mat = tumblerMaterial(c.material)!;
      const flat = { ...tumblerDefaults(mod.id), t: mat.t, k: mat.k, c: mat.c, E: mat.E };
      const out = tumblerDerive(mod, flat, profile);
      for (const [label, key, f] of READOUT[c.module] ?? []) {
        const text = c.read.find(([k]) => k === label)?.[1];
        const v = out[key];
        if (text === undefined || v === undefined) {
          bad.push(`${c.module} ${c.material}: ${label} or ${key} missing`);
          continue;
        }
        const want = printed(v.value, f);
        // The bay prints the number inside its text; split "27.0 / 51.0" and "200 - 2000" into their numbers (no readout is negative).
        const nums: string[] = text.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
        if (!nums.includes(want)) bad.push(`${c.module} ${c.material}: ${label} "${text}" lacks ${key} ${want}`);
        compared++;
      }
    }
    expect(bad).toEqual([]);
    console.log(`readouts compared ${compared}`);
    expect(compared).toBe(9 * Object.values(READOUT).flat().length);
  });

  test("every derive() output carries unit, qualifier and equation", () => {
    for (const mod of TUMBLER_MODULES) {
      for (const [k, v] of Object.entries(tumblerDerive(mod, tumblerDefaults(mod.id), profile))) {
        expect(v.unit, `${mod.id} ${k}`).not.toBe("");
        expect(["measured", "computed", "vendor", "inferred", "unknown"], `${mod.id} ${k}`).toContain(v.qualifier);
        expect(v.equation.trim(), `${mod.id} ${k}`).not.toBe("");
        expect(Number.isFinite(v.value), `${mod.id} ${k}`).toBe(true);
      }
    }
  });
});
