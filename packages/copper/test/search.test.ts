// M05-T09: the search layer (TOGGLE assignment DP, layer escalation, plan
// view cache) and the Manhattan mode against TOGGLE's own route search on
// its four presets. The fixtures were written by
// tools/legacy/toggle/dump-route.cjs from the TOGGLE source of record; this
// test never runs TOGGLE. Legacy mode (Float32 g and history, as TOGGLE
// shipped) must equal every recorded try: the router input the search
// built, the keep-in answers, and the route. Default mode (Float64, D-092)
// records its tries and layers in the committed golden of
// packages/copper/scripts/toggle-default-golden.mjs. Every number here is
// computed, none measured.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { ERROR_TRANSPORT, isThrownCommandError } from "@hackbuild/spec";
import * as copper from "../src/index.js";
import { assignments } from "../src/route/assign.js";
import { RouteCache, ROUTE_CACHE_SIZE } from "../src/route/cache.js";
import { MANHATTAN, routeManhattan, type ManhattanInput, type ManhattanResult } from "../src/route/manhattan.js";
import { comGaps, routeAll, routeSearch, SEARCH_CONSTANTS, type StickPlan, type StickRoute } from "../src/route/search.js";

const repo = new URL("../../../", import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, repo), "utf8");
const shaFile = (abs: string): string => createHash("sha256").update(readFileSync(abs)).digest("hex");

interface TryRec { spec: Omit<ManhattanInput, "inside"> & { viaCost: number | null }; inside: number[][]; result: ManhattanResult }
interface Fixture {
  meta: { preset: string; source: string; sha256: Record<string, string> };
  plan: StickPlan & { terms: { x: number; y: number; r: number; label: string }[] };
  gaps: number[];
  assignments: { phiA: number; list: { key: string; map: number[]; cost: number }[] }[];
  search: { ok: boolean; layers: number; lead: number[]; phiA: number; map: number[]; tries: number; cached: boolean };
  tries: TryRec[];
  cacheHit: { cached: boolean; routeCalls: number };
}
const PRESETS = ["solo4", "solo8", "blocks4", "blocks8"] as const;
const fx = Object.fromEntries(PRESETS.map((k) => [k, JSON.parse(read(`packages/copper/test/fixtures/toggle-presets/${k}.json`)) as Fixture])) as Record<(typeof PRESETS)[number], Fixture>;
const golden = JSON.parse(read("packages/copper/test/golden/toggle-presets-default.json")) as { presets: { preset: string; ok: boolean; layers: number; tries: number; phiA: number; map: number[]; nets: unknown }[] };
const lineage = JSON.parse(read("lineage.json")) as { id: string; kind: string; source: string; sha256: string; fixes: string[]; dest: string | null }[];
const profile = createProfileLookup(loadProfile());

// JSON drops -0 and undefined the way the fixture writer did.
const norm = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const runsOf = (W: number, H: number, f: (i: number, j: number) => boolean): number[] => {
  const out: number[] = [];
  let cur = false, n = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const v = f(i, j); if (v === cur) n++; else { out.push(n); cur = v; n = 1; } }
  out.push(n);
  return out;
};
const fromRuns = (W: number, runs: number[]): ((i: number, j: number) => boolean) => {
  const bits: boolean[] = [];
  runs.forEach((n, k) => { for (let q = 0; q < n; q++) bits.push(k % 2 === 1); });
  return (i, j) => bits[j * W + i] === true;
};
const plan = (f: Fixture): StickPlan => { const { terms, ...rest } = f.plan; return { ...rest, terms: terms.map(({ x, y, r }) => ({ x, y, r })) }; };

// A clean Manhattan route read from its geometry alone: per layer, no cell
// of one net lies within the square mask of another (part2c.js lines 34
// and 128 to 141), and every run is axis aligned.
function maskClear(r: ManhattanResult, spec: { g: number; w: number; clr: number }): number {
  const R = Math.max(1, Math.ceil((spec.w + spec.clr) / spec.g - 1e-9) - 1);
  const cells = r.nets.map((n) => {
    const out: Set<string>[] = [new Set(), new Set()];
    for (const run of n!.runs) for (let k = 0; k < run.pts.length; k++) {
      const a = run.pts[k]!, b = run.pts[Math.min(k + 1, run.pts.length - 1)]!;
      expect(a[0] === b[0] || a[1] === b[1], "run off the grid axes").toBe(true);
      const ia = Math.round(a[0] / spec.g), ja = Math.round(a[1] / spec.g), ib = Math.round(b[0] / spec.g), jb = Math.round(b[1] / spec.g);
      const steps = Math.max(Math.abs(ib - ia), Math.abs(jb - ja));
      for (let t = 0; t <= steps; t++) out[run.l]!.add(`${ia + (steps ? ((ib - ia) * t) / steps : 0)},${ja + (steps ? ((jb - ja) * t) / steps : 0)}`);
    }
    return out;
  });
  let minCheb = Infinity;
  for (let a = 0; a < cells.length; a++) for (let b = a + 1; b < cells.length; b++) for (const l of [0, 1]) {
    for (const ca of cells[a]![l]!) for (const cb of cells[b]![l]!) {
      const [ia, ja] = ca.split(",").map(Number) as [number, number], [ib, jb] = cb.split(",").map(Number) as [number, number];
      minCheb = Math.min(minCheb, Math.max(Math.abs(ia - ib), Math.abs(ja - jb)));
    }
  }
  return minCheb - R;
}

describe("the TOGGLE preset fixtures", () => {
  test("come from the TOGGLE source of record named by lineage", () => {
    for (const k of PRESETS) {
      expect(fx[k].meta.preset).toBe(k);
      expect(fx[k].meta.source).toBe("/Users/obsidian/Projects/hackbuild/fab-knowledge/originals/toggle/files/src/src/");
    }
    const row = (id: string) => lineage.find((r) => r.id === id)!;
    const pins = fx.solo4.meta.sha256;
    expect(pins["part2c.js"]).toBe(row("router/toggle-part2c").sha256);
    expect(pins["part2d.js"]).toBe(row("toggle.build/part2d").sha256);
    for (const f of ["search.ts", "assign.ts", "cache.ts"]) expect(row("toggle.build/part2d").fixes.join(" ")).toContain(`packages/copper/src/route/${f}`);
    expect(row("router/toggle-part2c").fixes.join(" ")).toContain("packages/copper/src/route/manhattan.ts");
    // the originals are on this machine; when they are, they still hold these bytes
    for (const f of ["part2c.js", "part2d.js"]) {
      let got: string | null = null;
      try { got = shaFile(`${fx.solo4.meta.source}${f}`); } catch { got = null; }
      if (got !== null) expect(got, f).toBe(pins[f]);
    }
  });
});

describe("TOGGLE presets in Manhattan mode, legacy Float32 (computed, TOGGLE legacy)", () => {
  const card: Record<(typeof PRESETS)[number], { layers: number; tries: number }> = {
    solo4: { layers: 1, tries: 1 }, solo8: { layers: 1, tries: 1 }, blocks4: { layers: 1, tries: 1 }, blocks8: { layers: 2, tries: 13 },
  };

  test.each(PRESETS.map((k) => [k] as const))("%s: tries and layers equal the card and TOGGLE", (k) => {
    const f = fx[k];
    const specs: { spec: ManhattanInput; res: ManhattanResult }[] = [];
    const r = routeSearch(plan(f), profile, { legacyFloat32: true, inspect: (spec, res) => specs.push({ spec, res }) });
    expect({ layers: r.layers, tries: r.tries }).toEqual(card[k]);
    expect({ layers: f.search.layers, tries: f.search.tries }).toEqual(card[k]);
    expect(norm({ ok: r.res !== null, layers: r.layers, lead: r.lead, phiA: r.phiA, map: r.map, tries: r.tries, cached: r.cached })).toEqual(f.search);
    expect(r.attempts.map((a) => a.ok)).toEqual(f.tries.map((t) => t.result.ok));
    expect(specs.length).toBe(f.tries.length);
    specs.forEach(({ spec, res }, q) => {
      const want = f.tries[q]!;
      const { inside, ...rest } = spec;
      expect(norm({ ...rest, viaCost: rest.viaCost ?? null }), `try ${q} input`).toEqual(want.spec);
      for (let l = 0; l < spec.layers; l++) expect(runsOf(spec.W, spec.H, (i, j) => inside(spec.x0 + i * spec.g, spec.y0 + j * spec.g, l)), `try ${q} keep-in layer ${l}`).toEqual(want.inside[l]);
      expect(norm({ ok: res.ok, failed: res.failed, layers: res.layers, nets: res.nets }), `try ${q} route`).toEqual(want.result);
    });
  });

  test.each(PRESETS.map((k) => [k] as const))("%s: the router alone equals every recorded try", (k) => {
    for (const [q, t] of fx[k].tries.entries()) {
      const { viaCost, ...spec } = t.spec;
      const inside = t.inside.map((runs) => fromRuns(spec.W, runs));
      const input: ManhattanInput = { ...spec, ...(viaCost === null ? {} : { viaCost }), inside: (x, y, l) => inside[l]!(Math.round((x - spec.x0) / spec.g), Math.round((y - spec.y0) / spec.g)) };
      const res = routeManhattan(input, { legacyFloat32: true });
      expect(norm({ ok: res.ok, failed: res.failed, layers: res.layers, nets: res.nets }), `try ${q}`).toEqual(t.result);
      if (res.ok) expect(maskClear(res, spec), `try ${q} mask`).toBeGreaterThan(0);
    }
  });

  test.each(PRESETS.map((k) => [k] as const))("%s: COM gaps and assignments equal TOGGLE's", (k) => {
    const f = fx[k], p = plan(f);
    expect(comGaps(p, profile).gaps).toEqual(f.gaps);
    for (const a of f.assignments) {
      expect(norm(assignments(p.terms, p.sectors.map((s) => s.c).concat([a.phiA])))).toEqual(a.list);
    }
  });
});

describe("TOGGLE presets in default mode, Float64 (computed, this card)", () => {
  test("the golden holds one row per preset", () => {
    expect(golden.presets.map((r) => r.preset)).toEqual([...PRESETS]);
  });

  test.each(PRESETS.map((k) => [k] as const))("%s: tries and layers equal the golden and the route is clean", (k) => {
    const r = copper.routeSearch(plan(fx[k]), profile);
    const row = norm({ preset: k, ok: r.res !== null, layers: r.layers, tries: r.tries, phiA: r.phiA, map: r.map, nets: r.res?.nets ?? null });
    expect(row).toEqual(golden.presets.find((g) => g.preset === k));
    expect(r.res?.ok).toBe(true);
    expect(maskClear(r.res!, { g: profile.constant(SEARCH_CONSTANTS.grid).value, w: fx[k].plan.w, clr: fx[k].plan.clr })).toBeGreaterThan(0);
    if (r.tries !== fx[k].search.tries || r.layers !== fx[k].search.layers) {
      // informational, not asserted (computed)
      process.stdout.write(`${k} default against legacy: tries ${r.tries} against ${fx[k].search.tries}, layers ${r.layers} against ${fx[k].search.layers}\n`);
    }
  });
});

describe("the plan view cache (part2d.js lines 207 to 217)", () => {
  test("a second call on the same plan view is a hit with no routing, as in TOGGLE", () => {
    for (const k of PRESETS) expect(fx[k].cacheHit, k).toEqual({ cached: true, routeCalls: 0 });
    const cache = copper.createRouteCache();
    const p = plan(fx.solo4);
    const calls: number[] = [];
    const first = routeAll(p, profile, cache, { inspect: () => calls.push(1) });
    expect([first.cached, calls.length]).toEqual([false, 1]);
    const second = routeAll({ ...p, sectors: [...p.sectors] }, profile, cache, { inspect: () => calls.push(2) });
    expect([second.cached, calls.length]).toEqual([true, 1]);
    expect(second.res).toBe(first.res);
  });

  test("key order in the plan view does not split the key", () => {
    const p = plan(fx.solo4);
    const shuffled = Object.fromEntries(Object.entries(p).reverse()) as unknown as StickPlan;
    expect(RouteCache.key(shuffled)).toBe(RouteCache.key(p));
  });

  test("a changed terminal misses and reroutes", () => {
    const cache = copper.createRouteCache();
    const p = plan(fx.solo4);
    routeAll(p, profile, cache);
    const moved: StickPlan = { ...p, terms: p.terms.map((t, q) => (q === 0 ? { ...t, x: t.x + 0.2 } : t)) };
    let calls = 0;
    const r = routeAll(moved, profile, cache, { inspect: () => { calls++; } });
    expect([r.cached, calls > 0]).toEqual([false, true]);
    expect(cache.length).toBe(2);
  });

  test("keeps the last 6 results, newest first", () => {
    expect(ROUTE_CACHE_SIZE).toBe(6);
    const c = new RouteCache<number>();
    for (let q = 0; q < 8; q++) c.put(`k${q}`, q);
    expect(c.length).toBe(6);
    expect([c.get("k0"), c.get("k1"), c.get("k2"), c.get("k7")]).toEqual([undefined, undefined, 2, 7]);
  });
});

describe("the Manhattan mode constants (card step 4, part2c.js)", () => {
  test("turn 2.5, via 30, history 1.5, 22 iterations, pop cap 400000, present 0.6 times 1.7", () => {
    expect(MANHATTAN).toEqual({ turn: 2.5, via: 30, presStart: 0.6, presGrowth: 1.7, history: 1.5, popCap: 400000, iters: 22 });
  });

  test("the search reads its lengths from profile with provenance", () => {
    const got = Object.values(SEARCH_CONSTANTS).map((id) => { const c = profile.constant(id); return [id, c.value, c.unit, c.provenance.tier]; });
    expect(got).toEqual([
      ["route.stick.grid", 0.2, "mm", "inferred"], ["route.stick.edgePad", 0.6, "mm", "inferred"], ["route.stick.leadR", 0.65, "mm", "inferred"],
      ["route.stick.comR", 0.71, "mm", "inferred"], ["route.stick.leadHalf", 0.5, "mm", "inferred"],
    ]);
    for (const id of Object.values(SEARCH_CONSTANTS)) expect(profile.constant(id).provenance.source).toMatch(/part2d\.js at sha256 1da486e7 .*lines? \d+/);
  });

  test("a single layer try that cannot route reports a warning, never a clean result", () => {
    const t = fx.blocks8.tries[0]!;
    const { viaCost: _v, ...spec } = t.spec;
    const inside = fromRuns(spec.W, t.inside[0]!);
    const res = routeManhattan({ ...spec, inside: (x, y) => inside(Math.round((x - spec.x0) / spec.g), Math.round((y - spec.y0) / spec.g)) });
    expect(res.ok).toBe(false);
    expect(res.warnings.map((w) => w.code)).toEqual([res.failed.length ? "UNROUTED" : "ROUTE_CONFLICT"]);
  });

  test("a malformed input is E_SCHEMA, exit 2", () => {
    const t = fx.solo4.tries[0]!;
    const { viaCost: _v, ...spec } = t.spec;
    let err: unknown;
    try { routeManhattan({ ...spec, layers: 3 as 1, inside: () => true }); } catch (e) { err = e; }
    expect(isThrownCommandError(err)).toBe(true);
    if (isThrownCommandError(err)) expect([err.hbf.code, ERROR_TRANSPORT[err.hbf.code].exit]).toEqual(["E_SCHEMA", 2]);
  });
});

describe("routeSearch on a plan the search cannot route", () => {
  test("blocks8 held to one layer fails every try loudly with UNROUTED", () => {
    const p = plan(fx.blocks8);
    const r: StickRoute = routeSearch({ ...p, route: "1" }, profile, { legacyFloat32: true });
    // one layer option is no quick pass: 3 gaps x 3 assignments x 2 lead variants
    expect([r.res, r.tries, r.layers, r.attempts.every((a) => !a.ok)]).toEqual([null, 18, 1, true]);
    expect(r.map).toEqual(assignments(p.terms, p.sectors.map((s) => s.c).concat([r.phiA]))[0]!.map);
    expect(r.warnings.map((w) => w.code)).toContain("UNROUTED");
  });
});
