// M05-T08: the copper router against PIP's own route at b137deb. The
// fixture was written by tools/legacy/pip/dump-route.mjs in a scratch
// checkout of hackbuild/pip-controller (manifold-3d 3.5.3 from its lock);
// this test never runs pip-controller. Legacy mode (Float32 history, as PIP
// shipped) must equal the fixture point for point; default mode (Float64,
// D-092) must route clean, and its lengths and iterations are the committed
// golden of packages/copper/scripts/pip-default-golden.mjs. Every number
// here is computed, none measured.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { isThrownCommandError } from "@hackbuild/spec";
import * as copper from "../src/index.js";
import * as vinyl from "../src/vinyl/index.js";
import * as traceLayer from "../src/emit/trace-layer.js";
import * as routeRec from "../src/emit/route-record.js";
import { route } from "../src/route/index.js";
import { ROUTE_CONSTANTS, routeNegotiated, type RouteInput, type RouteResult } from "../src/route/negotiated.js";
import { gridOf, insideByMargin } from "../src/route/stencil.js";
import { invariants } from "./invariants.js";

const repo = new URL("../../../", import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, repo), "utf8");
const sha = (rel: string): string => createHash("sha256").update(readFileSync(new URL(rel, repo))).digest("hex");

interface FixtureNet { name: string; polys: [number, number][][][]; stubs: [number, number][][]; vias: [number, number][]; fails: number; len: number }
const fixture = JSON.parse(read("packages/copper/test/fixtures/pip-b137deb-route.json")) as {
  meta: { commit: string; manifold: string };
  input: {
    route: { w: number; clr: number; grid: number; via: number; post: number; margin: number; iters: number };
    outline: [number, number][][];
    nets: { name: string; terms: { x: number; y: number; r: number; what: string }[] }[];
    keepIn: { first: { x: number; y: number; margin: number }; count: number; runs: number[] };
  };
  output: { nets: FixtureNet[]; conflicts: number; hot: unknown[]; unrouted: number; iters: number; grid: { nx: number; ny: number; gp: number } };
};
const golden = JSON.parse(read("packages/copper/test/golden/pip-b137deb-default.json")) as {
  conflicts: number; unrouted: number; iters: number; grid: unknown; nets: { name: string; len: number; polys: unknown; vias: unknown; fails: number }[]; warnings: unknown[];
};
const lineage = JSON.parse(read("lineage.json")) as { id: string; kind: string; source: string; sha256: string; dest: string | null }[];

const profile = createProfileLookup(loadProfile());
const s = fixture.input.route;
const input: RouteInput = {
  outline: fixture.input.outline,
  nets: fixture.input.nets,
  settings: { w: s.w, clr: s.clr, grid: s.grid, via: s.via, margin: s.margin, iters: s.iters },
};
const legacy = routeNegotiated(input, profile, { legacyFloat32History: true });
const plain = route(input, profile);
const strip = (r: RouteResult): FixtureNet[] => r.nets.map((n) => ({ name: n.name, polys: n.polys as never, stubs: n.stubs as never, vias: n.vias as never, fails: n.fails, len: n.len }));

describe("the PIP b137deb fixture", () => {
  test("comes from PIP b137deb with manifold-3d 3.5.3, and the vendored src equals SHA256SUMS", () => {
    expect(fixture.meta.commit).toBe("b137deb518229ea8910bfe85e6416d34cee353f3");
    expect(fixture.meta.manifold).toBe("3.5.3");
    const sums = read("designs/pip/legacy/SHA256SUMS").trim().split("\n").map((l) => l.split(/\s+/) as [string, string]);
    expect(sums.map(([, f]) => f)).toContain("src/router.js");
    // Copies added at M10-T01 stay out of git (D-286); the tracked src rows always run.
    const here = sums.filter(([, f]) => f.startsWith("src/") || existsSync(new URL(`designs/pip/legacy/${f}`, repo)));
    for (const [want, f] of here) expect(sha(`designs/pip/legacy/${f}`), f).toBe(want);
    const canonical = lineage.filter((r) => r.id.startsWith("router/") && r.kind === "canonical");
    expect(canonical.map((r) => r.id)).toEqual(["router/pip-controller-b137deb"]);
    expect(canonical[0]!.sha256).toBe(sha("designs/pip/legacy/src/router.js"));
    expect(canonical[0]!.dest).toBe("packages/copper/src/route/negotiated.ts");
  });

  test("the keep-in samples equal PIP's L.inside answers cell for cell", () => {
    const g = gridOf(input.outline, s.grid);
    expect([g.nx, g.ny, g.gp]).toEqual([fixture.output.grid.nx, fixture.output.grid.ny, fixture.output.grid.gp]);
    expect({ x: g.x0, y: g.y0, margin: s.margin }).toEqual(fixture.input.keepIn.first);
    const runs: number[] = [];
    let cur = 0, n = 0;
    for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
      const v = insideByMargin(input.outline, g.x0 + i * g.gp, g.y0 + j * g.gp, s.margin) ? 1 : 0;
      if (v === cur) n++; else { runs.push(n); cur = v; n = 1; }
    }
    runs.push(n);
    expect(g.nx * g.ny).toBe(fixture.input.keepIn.count);
    expect(runs).toEqual(fixture.input.keepIn.runs);
  });
});

describe("legacy mode (Float32 history, PIP as shipped)", () => {
  test("12 nets, conflicts 0, unrouted 0, iters 2, grid 301 x 129 at 0.5 mm, no vias", () => {
    expect(legacy.nets.length).toBe(12);
    expect([legacy.conflicts, legacy.unrouted, legacy.iters]).toEqual([0, 0, 2]);
    expect(legacy.grid).toEqual({ nx: 301, ny: 129, gp: 0.5 });
    expect(legacy.nets.every((n) => n.vias.length === 0)).toBe(true);
    expect([fixture.output.conflicts, fixture.output.unrouted, fixture.output.iters]).toEqual([legacy.conflicts, legacy.unrouted, legacy.iters]);
    expect(legacy.grid).toEqual(fixture.output.grid);
    expect(legacy.hot).toEqual(fixture.output.hot);
    expect(legacy.warnings).toEqual([]);
  });

  test("every polyline, stub, via and length equals the fixture point for point", () => {
    expect(strip(legacy)).toEqual(fixture.output.nets);
  });

  test("lengths to 0.01 mm match the card (computed, PIP b137deb)", () => {
    const card: Record<string, number> = { GND: 215.55, "3V3": 60.31, UP: 36.40, DOWN: 44.68, LEFT: 54.96, RIGHT: 25.92, X: 34.66, B: 49.01, Y: 22.71, A: 59.54, SELECT: 28.35, START: 24.62 };
    expect(legacy.nets.map((n) => n.name)).toEqual(Object.keys(card));
    for (const n of legacy.nets) expect(Math.abs(n.len - card[n.name]!), n.name).toBeLessThan(0.005 + 1e-9);
  });

  test("the history is Float32 in legacy mode and Float64 by default", () => {
    const seen: number[][] = [];
    const grab = (st: { hist: readonly [Float32Array | Float64Array, Float32Array | Float64Array] }): void => {
      seen.push([...st.hist[0], ...st.hist[1]].filter((v) => v !== 0));
    };
    routeNegotiated(input, profile, { legacyFloat32History: true, inspect: grab });
    routeNegotiated(input, profile, { inspect: grab });
    const [f32, f64] = seen as [number[], number[]];
    expect(f32.length).toBeGreaterThan(0);
    expect(f32.length).toBe(f64.length);
    // a cell conflicted k times holds k additions of 0.8, stored in its array's precision
    const sum = (k: number, round: (v: number) => number): number => { let v = 0; for (let i = 0; i < k; i++) v = round(v + 0.8); return v; };
    f64.forEach((v, i) => {
      const k = Math.round(v / 0.8);
      expect(v).toBe(sum(k, (x) => x));
      expect(f32[i]).toBe(sum(k, Math.fround));
      expect(f32[i]).not.toBe(v);
    });
  });

  test("the output geometry alone shows no two nets closer than w + clr + zonePad and every net one piece", () => {
    const pad = profile.constant(ROUTE_CONSTANTS.zonePad).value;
    const { minGap, split } = invariants(legacy);
    expect(split).toEqual([]);
    expect(minGap).toBeGreaterThanOrEqual(s.w + s.clr + pad - 1e-9);
  });
});

describe("default mode (Float64)", () => {
  test("routes the same fixture clean; lengths and iters equal the committed golden", () => {
    expect([plain.conflicts, plain.unrouted]).toEqual([0, 0]);
    const { minGap, split } = invariants(plain);
    expect(split).toEqual([]);
    expect(minGap).toBeGreaterThanOrEqual(s.w + s.clr + profile.constant(ROUTE_CONSTANTS.zonePad).value - 1e-9);
    expect({ conflicts: plain.conflicts, unrouted: plain.unrouted, iters: plain.iters, grid: plain.grid, warnings: plain.warnings })
      .toEqual({ conflicts: golden.conflicts, unrouted: golden.unrouted, iters: golden.iters, grid: golden.grid, warnings: golden.warnings });
    expect(plain.nets.map((n) => ({ name: n.name, len: n.len, polys: n.polys, vias: n.vias, fails: n.fails }))).toEqual(golden.nets);
    // informational, not asserted: default against legacy, mm
    const deltas = plain.nets.map((n, k) => `${n.name} ${(n.len - legacy.nets[k]!.len).toFixed(2)}`);
    process.stdout.write(`default minus legacy length (computed), mm: ${deltas.join(", ")}; iters ${plain.iters} against ${legacy.iters}\n`);
  });

  test("the public route takes no parity switch and equals routeNegotiated with none", () => {
    expect(route.length).toBe(2);
    // The vinyl kernel (M05-T14) shares the package's index; the router's own surface is what is left.
    // M05-T09 added the Manhattan mode, the search layer and the cache; none of them takes a parity switch.
    // M05-T10's trace layer emit and route record (src/emit/) take no route options.
    expect(Object.keys(copper).filter((k) => !(k in vinyl) && !(k in traceLayer) && !(k in routeRec)).sort()).toEqual([
      "ASSIGN_RADIUS_WEIGHT", "MANHATTAN", "NEGOTIATION", "ROUTE_CACHE_SIZE", "ROUTE_CONSTANTS", "RouteCache", "SEARCH", "SEARCH_CONSTANTS",
      "angDist", "angNorm", "assignments", "comGaps", "createRouteCache", "route", "routeAll", "routeManhattan", "routeSearch",
    ]);
    expect([copper.routeManhattan.length, copper.routeSearch.length, copper.routeAll.length]).toEqual([1, 2, 3]);
    expect(strip(plain)).toEqual(strip(routeNegotiated(input, profile)));
  });

  test("the keepout pad is read from profile: a different pad moves the route", () => {
    const wider = { constant: (id: string) => (id === ROUTE_CONSTANTS.keepoutPad ? { ...profile.constant(id), value: 0.6 } : profile.constant(id)) };
    expect(strip(routeNegotiated(input, wider, { legacyFloat32History: true }))).not.toEqual(fixture.output.nets);
  });
});

describe("warnings and refusals", () => {
  test("one iteration leaves tight spots: ROUTE_CONFLICT with PIP's text and hot cells", () => {
    const r = route({ ...input, settings: { ...input.settings, iters: 1 } }, profile);
    expect(r.conflicts).toBeGreaterThan(0);
    expect(r.hot.length).toBeGreaterThan(0);
    expect(r.warnings).toEqual([{ code: "ROUTE_CONFLICT", text: `routing left ${r.conflicts} tight spots under the clearance, raise iterations or loosen the grid` }]);
  });

  test("a terminal outside the keep-in is unrouted, loudly", () => {
    const sq: [number, number][] = [[-10, -10], [10, -10], [10, 10], [-10, 10]];
    const r = route({ outline: [sq], nets: [{ name: "N", terms: [{ x: -9, y: 0, r: 0.6 }, { x: 9, y: 0, r: 0.6 }] }], settings: input.settings }, profile);
    expect(r.unrouted).toBe(1);
    expect(r.warnings).toEqual([{ code: "UNROUTED", text: "1 connections could not be routed, widen the body or move groups apart" }]);
  });

  test("a one-terminal net and a zero grid are E_SCHEMA", () => {
    const one = (): RouteResult => route({ ...input, nets: [{ name: "N", terms: [{ x: 0, y: 0, r: 0.6 }] }] }, profile);
    const zero = (): RouteResult => route({ ...input, settings: { ...input.settings, grid: 0 } }, profile);
    for (const f of [one, zero]) {
      try { f(); expect.unreachable(); } catch (e) {
        expect(isThrownCommandError(e)).toBe(true);
        if (isThrownCommandError(e)) expect(e.hbf.code).toBe("E_SCHEMA");
      }
    }
  });
});
