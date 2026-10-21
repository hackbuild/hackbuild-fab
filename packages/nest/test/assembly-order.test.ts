// M07-T09 assembly-order mode. The steps are the viewers' own: the
// committed record packages/nest/records/ogee16-steps.json, written by
// designs/ogee16/extract/extract-steps.mjs from the reg(...) calls of
// viewer_template.html (14 steps) and printed_viewer_template.html (12),
// is run again here and held to the bills neither viewer reads (cutfiles.py
// BOM, build_plate.py QTY) and to the scene's instance rules. The step
// order on the sheets is audited with arithmetic of this file on the
// placements, and the sheet counts of both modes are held to the committed
// record packages/nest/records/ogee16-assembly-order.json
// (HBF_ASM_RECORD=1 rewrites it once the asserts hold).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import { canonicalize, isThrownCommandError, type NestItem, type NestRequest, type NestResult, type ProfileLookup, type Ring } from "@hackbuild/spec";
import { loadGeom, type Geom } from "@hackbuild/geom";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { assemblyReport, assignSteps, unassignedItems } from "../src/assembly-order.js";
import { packSheets } from "../src/connect.js";
import { packPlates } from "../src/plates.js";
import { nest } from "../src/sheet-loop.js";
import { billOf, countOf, DRIVES, INSTANCE_RULES, ogee16PlatesScene, type Drive } from "../scenes/ogee16-r16p-plates.js";
// @ts-expect-error the legacy tool is plain JavaScript with no declarations
import { lasercut, printed } from "../../../designs/ogee16/extract/extract-steps.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const json = <T>(rel: string): T => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8")) as T;
const RECORD = process.env.HBF_ASM_RECORD === "1";

type Steps = Record<string, Record<string, number>>;
interface ViewerSteps { asm: string[]; steps: Steps; unassigned: string[]; bill: Record<string, number> }
const stepsRecord = json<{ result: { lasercut: ViewerSteps; printed: ViewerSteps } }>("packages/nest/records/ogee16-steps.json").result;
/** The extraction run now, on the pinned legacy files. */
const live = { lasercut: lasercut() as ViewerSteps, printed: printed() as ViewerSteps };

// cutfiles.py: KERF (line 19), GAP (line 21) and BOM (lines 22 to 32), read here and not from the extraction.
const cutfiles = readFileSync(path.join(ROOT, "designs/ogee16/legacy/source/cutfiles.py"), "utf8");
const KERF = Number(/^KERF = ([0-9.]+)/m.exec(cutfiles)?.[1]);
const GAP = Number(/^GAP = ([0-9.]+)/m.exec(cutfiles)?.[1]);
const BOM = [...(/^BOM = \[([\s\S]*?)^\]/m.exec(cutfiles)?.[1] ?? "").matchAll(/\("(\w+)", (\d+)\)/g)].map((m) => [m[1]!, Number(m[2])] as const);
// build_plate.py QTY (lines 5 to 12), read here.
const buildPlate = readFileSync(path.join(ROOT, "designs/ogee16/legacy/source/build_plate.py"), "utf8");
const QTY = [...(/^COMMON = \[[\s\S]*?^SERVO_DRIVE = \[.*$/m.exec(buildPlate)?.[0] ?? "").matchAll(/\("(\w+)",(\d+)\)/g)].map((m) => [m[1]!, Number(m[2])] as const);

const ogee = json<{ result: { parts: { id: string; qty: number; rings: number[][][] }[] } }>("packages/nest/records/ogee16-connect.json").result;

const total = (s: Record<string, number>): number => Object.values(s).reduce((n, x) => n + x, 0);

/** Step range per sheet, from the placements and the items' steps. */
function ranges(r: NestResult, items: readonly NestItem[]): { min: number; max: number; n: number }[] {
  const step = new Map(items.map((it) => [it.id, it.step!]));
  const out = Array.from({ length: r.sheets }, () => ({ min: Infinity, max: -Infinity, set: new Set<number>() }));
  for (const p of r.placements) {
    const s = step.get(p.id)!;
    const o = out[p.sheet]!;
    o.min = Math.min(o.min, s);
    o.max = Math.max(o.max, s);
    o.set.add(s);
  }
  return out.map((o) => ({ min: o.min, max: o.max, n: o.set.size }));
}

/** The card's property: the highest step on sheet s never exceeds the lowest on sheet s + 1. */
function monotone(r: NestResult, items: readonly NestItem[]): string[] {
  const g = ranges(r, items);
  const bad: string[] = [];
  for (let s = 0; s + 1 < g.length; s++) if (g[s]!.max > g[s + 1]!.min) bad.push(`sheet ${s} max ${g[s]!.max} > sheet ${s + 1} min ${g[s + 1]!.min}`);
  return bad;
}

/** Footprint audit: every copy placed once, inside the margin, no two footprints closer than the gap. */
function footprints(r: NestResult, items: readonly NestItem[], req: NestRequest): { placed: number; overlaps: number; outside: number } {
  const ext = new Map(items.map((it) => {
    const xs = it.rings.flat().map((p) => p[0]), ys = it.rings.flat().map((p) => p[1]);
    return [it.id, { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }];
  }));
  const gap = req.gap as number;
  const [W, H] = req.sheet;
  const boxes = r.placements.map((p) => {
    const e = ext.get(p.id)!;
    const turned = p.rot === 90 || p.rot === 270;
    return { sheet: p.sheet, x: p.at[0], y: p.at[1], w: turned ? e.h : e.w, h: turned ? e.w : e.h };
  });
  let overlaps = 0, outside = 0;
  for (const b of boxes) if (b.x < req.margin - 1e-9 || b.y < req.margin - 1e-9 || b.x + b.w > W - req.margin + 1e-9 || b.y + b.h > H - req.margin + 1e-9) outside++;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!, b = boxes[j]!;
      if (a.sheet !== b.sheet) continue;
      const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)), dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
      if (Math.max(dx, dy) < gap - 1e-6) overlaps++;
    }
  }
  return { placed: r.placements.length, overlaps, outside };
}

const refusal = (f: () => unknown): { code: string; path?: string; hint: string } => {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("expected a CommandError");
};

let geom: Geom;
let profile: ProfileLookup;
beforeAll(async () => {
  geom = await loadGeom();
  profile = createProfileLookup(loadProfile());
});

describe("steps come from the viewers' reg(...) calls (computed)", () => {
  test("the extraction run here equals the committed record", () => {
    expect(canonicalize(live)).toBe(canonicalize(stepsRecord));
  });

  test("lasercut: 14 steps; every BOM part but the coupon has a step; counts equal cutfiles.py BOM", () => {
    const r = live.lasercut;
    expect(r.asm).toHaveLength(14);
    expect(r.unassigned).toEqual(["coupon"]);
    expect(BOM).toHaveLength(27);
    for (const [id, q] of BOM) if (id !== "coupon") expect(total(r.steps[id]!), id).toBe(q);
    // the bars are laminated LAM = 2 plies (params.scad line 19): 4 registered bars, 8 pieces
    expect(r.steps.rowbar).toEqual({ 3: 8 });
    expect(r.steps.washer).toEqual({ 4: 4, 7: 4, 8: 32, 10: 1 });
  });

  test("printed: 12 steps; every QTY part but the drive pin has a step; counts equal build_plate.py QTY and the scene's rules", () => {
    const r = live.printed;
    expect(r.asm).toHaveLength(12);
    expect(r.unassigned).toEqual(["drivepin"]);
    expect(QTY).toHaveLength(25);
    for (const [id, q] of QTY) if (id !== "drivepin") expect(total(r.steps[id]!), id).toBe(q);
    for (const rule of INSTANCE_RULES) if (rule.id !== "drivepin") expect(total(r.steps[rule.id]!), rule.id).toBe(countOf(rule, 4));
    expect(r.steps.knob).toEqual({ 3: 4, 6: 4 });
  });
});

describe("assembly-order mode on fixtures (computed)", () => {
  const sq = (s: number): Ring[] => [[[0, 0], [s, 0], [s, s], [0, s]]];
  const item = (id: string, s: number, qty: number, step?: number): NestItem => ({ id, rings: sq(s), qty, stock: "ply3", ...(step === undefined ? {} : { step }) });
  const req = (items: NestItem[], extra: Partial<NestRequest> = {}): NestRequest => ({
    items, sheet: [100, 100], margin: 0, gap: 0, mode: "assembly-order", rotations: [0], partInPart: false, seed: 1, ...extra,
  });

  test("a copy with no step is refused with E_PARAM_MISSING naming every such item", () => {
    const h = refusal(() => nest(req([item("a", 10, 1, 0), item("b", 10, 1), item("idle", 10, 0), item("d", 10, 2)])));
    expect(h.code).toBe("E_PARAM_MISSING");
    expect(h.path).toBe("/items/1/step");
    expect(h.hint).toContain("b, d");
    expect(h.hint).not.toContain("idle");
    expect(unassignedItems([item("a", 10, 1, 0), item("b", 10, 1)])).toEqual(["b"]);
  });

  test("a bad step, part-in-part and sparrow are refused with E_SCHEMA", () => {
    expect(refusal(() => nest(req([item("a", 10, 1, -1)]))).path).toBe("/items/0/step");
    expect(refusal(() => nest(req([item("a", 10, 1, 0)], { partInPart: true }), geom)).path).toBe("/partInPart");
    const sp = refusal(() => nest(req([item("a", 10, 1, 0)], { packer: "sparrow" })));
    expect(sp.path).toBe("/packer");
    expect(sp.code).toBe("E_SCHEMA");
    expect(sp.hint).toContain("sparrow is not adopted");
    expect(JSON.stringify(sp)).not.toMatch(/until the sparrow verdict/);
  });

  test("a step shares the last sheet when that saves a sheet, and never jumps ahead of an earlier step", () => {
    // step 0: one 60 mm square; step 1: three 40 mm squares, which fit beside it; step 2: one 60 mm square
    const items = [item("late", 60, 1, 2), item("big", 60, 1, 0), item("small", 40, 3, 1)];
    const r = nest(req(items, { packer: "maxrects-bssf", order: "area" }));
    const g = ranges(r, items);
    expect(monotone(r, items)).toEqual([]);
    expect(r.sheets).toBe(2);
    expect(g).toEqual([{ min: 0, max: 1, n: 2 }, { min: 2, max: 2, n: 1 }]);
    expect(r.placements.filter((p) => p.sheet === 0).map((p) => p.id).sort()).toEqual(["big", "small", "small", "small"]);
    // two 50 mm squares hold sheet 0; three 100 x 50 bars of step 1 repacked with them would fill sheet 0
    // with bars and push both squares onto sheet 1 beside a bar: two sheets against three, and step 0 after step 1
    const bar = (id: string, qty: number, step: number): NestItem => ({ id, rings: [[[0, 0], [100, 0], [100, 50], [0, 50]]], qty, stock: "ply3", step });
    const pushed = [item("sq", 50, 2, 0), bar("bar", 3, 1)];
    const rp = nest(req(pushed, { packer: "maxrects-bssf", order: "area" }));
    expect(monotone(rp, pushed)).toEqual([]);
    expect(ranges(rp, pushed)).toEqual([{ min: 0, max: 0, n: 1 }, { min: 1, max: 1, n: 1 }, { min: 1, max: 1, n: 1 }]);
    // a fourth 40 mm square no longer fits beside the 60: packing step 1 alone takes one sheet either way, so it opens its own
    const four = [item("big", 60, 1, 0), item("small", 40, 4, 1)];
    const r4 = nest(req(four, { packer: "maxrects-bssf", order: "area" }));
    expect(ranges(r4, four)).toEqual([{ min: 0, max: 0, n: 1 }, { min: 1, max: 1, n: 1 }]);
    // fill mode puts the 60 mm squares together and the 40s around them; assembly order costs a sheet here
    const mixed = [item("big", 60, 1, 0), item("small", 40, 2, 1), item("late", 60, 1, 2), item("tail", 40, 2, 3)];
    const ra = nest(req(mixed, { packer: "maxrects-bssf", order: "area" }));
    const fill = nest({ ...req(mixed.map(({ step: _s, ...it }) => it), { packer: "maxrects-bssf", order: "area" }), mode: "fill" });
    expect(monotone(ra, mixed)).toEqual([]);
    const rep = assemblyReport(ra, fill, mixed);
    expect([rep.sheets, rep.fillSheets, rep.extra]).toEqual([ra.sheets, fill.sheets, ra.sheets - fill.sheets]);
    expect(rep.spans.map((x) => [x.min, x.max, x.steps])).toEqual(ranges(ra, mixed).map((x) => [x.min, x.max, x.n]));
  });

  test("assignSteps splits a part over several steps and refuses a count that is not its qty", () => {
    const { items, unassigned } = assignSteps([item("w", 5, 5), item("c", 5, 1), item("one", 5, 2)], { w: { 7: 3, 4: 2 }, one: { 3: 2 } });
    expect(items.map((it) => [it.id, it.qty, it.step])).toEqual([["w@4", 2, 4], ["w@7", 3, 7], ["c", 1, undefined], ["one", 2, 3]]);
    expect(unassigned).toEqual(["c"]);
    expect(refusal(() => assignSteps([item("w", 5, 4)], { w: { 1: 3 } })).code).toBe("E_SCHEMA");
  });
});

interface ModeRecord { sheets: number; fillSheets: number; extra: number; spans: [number, number, number][]; layoutHash: string; unassigned: string[]; pieces: number }
const results: Record<string, ModeRecord> = {};

describe("OGEE16 R16 lasercut in assembly order (computed)", () => {
  test("the full set is refused naming the coupon; without it the sheets follow the 14 steps", () => {
    const t = loadProfile();
    // the kerf cutfiles.py ran at, entered on the machine row the way a coupon result would be (as dxf.test.ts); provenance stays inferred
    const lookup = createProfileLookup({ ...t, machines: t.machines.map((m) => (m.id === "sheet600" ? { ...m, kerf: KERF } : m)) });
    const env = lookup.machine("sheet600").envelope;
    if (!("sheet" in env)) throw new Error("sheet600 has no sheet envelope");
    const sheet: [number, number] = [env.sheet[0], env.sheet[1]];
    const raw: NestItem[] = ogee.parts.map((p) => ({ id: p.id, qty: p.qty, stock: "ply3", rings: p.rings as unknown as Ring[] }));
    const { items, unassigned } = assignSteps(raw, stepsRecord.lasercut.steps);
    expect(unassigned).toEqual(["coupon"]);
    const base = { sheet, margin: GAP, gap: GAP, rotations: [0, 90] as const, partInPart: false, seed: 1 };
    const opts = { profile: lookup, machine: "sheet600", kerfMode: "outline" as const };
    const h = refusal(() => packSheets(geom, { ...base, items, rotations: [0, 90], mode: "assembly-order" }, opts));
    expect([h.code, h.hint.startsWith("no assembly step for coupon;")]).toEqual(["E_PARAM_MISSING", true]);

    const stepped = items.filter((it) => !unassigned.includes(it.id));
    const asm = packSheets(geom, { ...base, items: stepped, rotations: [0, 90], mode: "assembly-order" }, opts);
    const fill = packSheets(geom, { ...base, items: raw.filter((it) => !unassigned.includes(it.id)), rotations: [0, 90], mode: "fill" }, opts);
    const r = asm.result!;
    expect(monotone(r, stepped)).toEqual([]);
    expect(footprints(r, asm.items, { ...base, items: stepped, rotations: [0, 90], mode: "assembly-order" })).toEqual({ placed: 182, overlaps: 0, outside: 0 });
    expect(r.oversize).toEqual([]);
    expect(ranges(r, stepped)[0]!.min).toBe(0);
    expect(r.sheets).toBeGreaterThanOrEqual(fill.result!.sheets);
    const rep = assemblyReport(r, fill.result!, stepped);
    results.lasercut = {
      sheets: rep.sheets, fillSheets: rep.fillSheets, extra: rep.extra, spans: rep.spans.map((s) => [s.min, s.max, s.steps]),
      layoutHash: r.layoutHash, unassigned, pieces: r.placements.length,
    };
  });
});

describe("OGEE16 R16-P plates in assembly order (computed)", () => {
  for (const drive of DRIVES) {
    test(`${drive}: the full bill is refused naming the drive pin; without it the plates follow the 12 steps`, () => {
      const scene = ogee16PlatesScene(profile, drive);
      const { items, unassigned } = assignSteps(scene.request.items, stepsRecord.printed.steps);
      expect(unassigned).toEqual(["drivepin"]);
      const h = refusal(() => nest({ ...scene.request, items, mode: "assembly-order" }));
      expect([h.code, h.hint.startsWith("no assembly step for drivepin;")]).toEqual(["E_PARAM_MISSING", true]);

      const stepped = items.filter((it) => !unassigned.includes(it.id));
      const r = nest({ ...scene.request, items: stepped, mode: "assembly-order" });
      const kept = scene.request.items.filter((it) => !unassigned.includes(it.id));
      const fill = packPlates({ ...scene, request: { ...scene.request, items: kept }, parts: scene.parts.filter((p) => p.id !== "drivepin") }, profile);
      expect(monotone(r, stepped)).toEqual([]);
      const pieces = billOf(drive as Drive, 4).filter(([id]) => id !== "drivepin").reduce((n, [, q]) => n + q, 0);
      expect(footprints(r, stepped, { ...scene.request, items: stepped })).toEqual({ placed: pieces, overlaps: 0, outside: 0 });
      // one type per plate: every plate holds one item, so no plate is shared
      expect(ranges(r, stepped).every((g) => g.n === 1)).toBe(true);
      const rep = assemblyReport(r, fill, stepped);
      results[`plates-${drive}`] = {
        sheets: rep.sheets, fillSheets: rep.fillSheets, extra: rep.extra, spans: rep.spans.map((s) => [s.min, s.max, s.steps]),
        layoutHash: r.layoutHash, unassigned, pieces: r.placements.length,
      };
    });
  }
});

describe("sheet counts in both modes (computed record)", () => {
  test("equal the committed record", () => {
    const file = path.join(ROOT, "packages/nest/records/ogee16-assembly-order.json");
    const rec = {
      record: "ogee16-assembly-order",
      card: "M07-T09",
      qualifier: "computed: nest assembly-order and fill mode on the OGEE16 R16 lasercut set (cutfiles.py parts, kerf 0.18 from cutfiles.py, sheet600) and the R16-P plate bills (centauri); steps from packages/nest/records/ogee16-steps.json",
      command: "npm test -w packages/nest -- assembly-order",
      result: results,
    };
    expect(Object.keys(results).sort()).toEqual(["lasercut", "plates-knobs", "plates-servos"]);
    if (RECORD) writeFileSync(file, `${JSON.stringify(rec, null, 1)}\n`);
    expect(existsSync(file), "record not committed; run with HBF_ASM_RECORD=1 once the asserts hold").toBe(true);
    expect(json<typeof rec>("packages/nest/records/ogee16-assembly-order.json").result).toEqual(results);
  });
});
