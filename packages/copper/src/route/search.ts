// The router's search layer, ported from TOGGLE's route search (toggle
// src/src/part2d.js lines 169 to 260, lineage toggle.build/part2d): for a
// tilt stick plan view it tries layer counts (1 then 2 when the mode is
// auto), up to three COM gaps, up to three net to terminal assignments (two
// on the quick single layer pass) and two lead variants, and the first
// route that negotiates clean wins. routeAll keeps the last results by plan
// view (cache.ts).
//
// The plan view is data: the layoutXY fields tryRoute and routeSearch read
// (part2d.js lines 13 to 116), as tools/legacy/toggle/dump-route.cjs
// records them. Lengths come from the plan or from profile constants; the
// angular weights stay here with their lines.

import type { BuildWarning } from "@hackbuild/spec";
import { commandError } from "@hackbuild/spec";
import { constantMm, type ConstantSource } from "@hackbuild/geom";
import { angDist, angNorm, assignments } from "./assign.js";
import { RouteCache } from "./cache.js";
import { MANHATTAN, routeManhattan, type ManhattanInternals, type ManhattanNet, type ManhattanObstacle, type ManhattanResult } from "./manhattan.js";

/** Profile constants the search layer reads, mm. */
export const SEARCH_CONSTANTS = {
  /** Route grid pitch of a stick floor (part2d.js line 171). */
  grid: "route.stick.grid",
  /** Keep-in distance past half a trace from the body outline (part2d.js line 176). */
  edgePad: "route.stick.edgePad",
  /** Direction lead foot radius before clearance and half a trace (part2d.js line 197). */
  leadR: "route.stick.leadR",
  /** COM column foot radius before clearance and half a trace (part2d.js lines 197 and 229). */
  comR: "route.stick.comR",
  /** Half width of a wall contact lead, the arc a lead keeps from its sector edge (part2d.js line 237). */
  leadHalf: "route.stick.leadHalf",
} as const;

/** Search widths and angular weights (part2d.js lines 237, 241 to 250). */
export const SEARCH = {
  /** COM gaps tried per layer count. */
  gaps: 3,
  /** Assignments tried per gap, and on the quick single layer pass. */
  assignments: 3,
  quickAssignments: 2,
  /** Angular margin kept off the sector edge, rad. */
  slackMargin: 0.08,
  /** Fraction of the slack a bent lead takes toward its terminal. */
  bend: 0.8,
} as const;

export interface PlanRect { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number }

/** A tilt stick plan view, mm and rad (TOGGLE layoutXY). */
export interface StickPlan {
  /** Direction count, 4 or 8; nets are the directions then COM. */
  readonly dirs: number;
  readonly blocks: boolean;
  /** header, wire or pads on a solo body; null on BLOCKS. */
  readonly termKind: string | null;
  readonly w: number;
  readonly clr: number;
  /** Lathe keep-out margin around the stick foot. */
  readonly cons: number;
  /** Stick foot radius. */
  readonly rf: number;
  /** Direction lead radius. */
  readonly Re: number;
  /** COM column radius. */
  readonly RA: number;
  readonly sectors: readonly { readonly c: number; readonly half: number }[];
  readonly terms: readonly { readonly x: number; readonly y: number; readonly r: number }[];
  readonly bbox: readonly [number, number, number, number];
  readonly outKind: "round" | "square";
  readonly outR: number | null;
  readonly tab: PlanRect | null;
  readonly outHx: number | null;
  readonly outHy0: number | null;
  readonly outHy1: number | null;
  /** BLOCKS footprint including ledge rows. */
  readonly foot: PlanRect | null;
  /** Layer mode: 1, 2 or auto (1 then 2). */
  readonly route: "1" | "2" | "auto";
}

/** One routing attempt as the search built it. */
export interface StickTry {
  readonly layers: 1 | 2;
  readonly phiA: number;
  readonly lead: readonly number[];
  readonly map: readonly number[];
  readonly ok: boolean;
}

export interface StickRoute {
  /** The winning route, or null when every try failed. */
  readonly res: ManhattanResult | null;
  readonly layers: number;
  readonly lead: readonly number[];
  readonly phiA: number;
  /** map[k] is the terminal of net k (directions, then COM). */
  readonly map: readonly number[];
  readonly tries: number;
  readonly attempts: readonly StickTry[];
  readonly cached: boolean;
  readonly warnings: readonly BuildWarning[];
}

/** Test-only switches; never part of the public route options. */
export interface SearchInternals extends ManhattanInternals {
  /** Called with every Manhattan input the search hands the router, in order. */
  readonly inspect?: (spec: Parameters<typeof routeManhattan>[0], res: ManhattanResult) => void;
}

function checkPlan(p: StickPlan): void {
  const bad = (path: string, got: unknown, expected: string): never => {
    throw commandError({ code: "E_SCHEMA", path, got, expected, hint: `set ${path.slice(1)} to ${expected}` });
  };
  if (!(Number.isInteger(p.dirs) && p.dirs >= 1)) bad("/dirs", p.dirs, "a whole direction count");
  if (p.sectors.length !== p.dirs) bad("/sectors", p.sectors.length, `${p.dirs} sectors, one per direction`);
  if (p.terms.length < p.dirs + 1) bad("/terms", p.terms.length, `at least ${p.dirs + 1} terminals, one per net`);
  if (p.route !== "1" && p.route !== "2" && p.route !== "auto") bad("/route", p.route, "1, 2 or auto");
  if (p.blocks ? p.foot === null : p.outKind === "round" ? p.outR === null : p.outHx === null || p.outHy0 === null || p.outHy1 === null) {
    bad("/outKind", p.outKind, "the outline fields its kind reads");
  }
}

function tryRoute(p: StickPlan, k: Readonly<Record<keyof typeof SEARCH_CONSTANTS, number>>, layers: 1 | 2, leadAng: readonly number[], phiA: number, map: readonly number[], internals: SearchInternals): ManhattanResult {
  const g = k.grid, w = p.w, clr = p.clr;
  const [bx0, by0, bx1, by1] = p.bbox;
  const x0 = Math.floor(bx0 / g) * g, y0 = Math.floor(by0 / g) * g;
  const W = Math.round((Math.ceil(bx1 / g) * g - x0) / g) + 1, H = Math.round((Math.ceil(by1 / g) * g - y0) / g) + 1;
  const top = layers - 1;
  const m = w / 2 + k.edgePad;
  const footR = p.rf + p.cons + clr + w / 2;
  const inside = (x: number, y: number, l: number): boolean => {
    if (l === top && Math.hypot(x, y) < footR) return false;
    if (p.blocks) { const f = p.foot!; return x >= f.x0 + m && x <= f.x1 - m && y >= f.y0 + m && y <= f.y1 - m; }
    if (p.outKind === "round") {
      if (Math.hypot(x, y) <= p.outR! - m) return true;
      const t = p.tab; return !!t && x >= t.x0 + m && x <= t.x1 - m && y >= t.y0 + m && y <= t.y1;
    }
    return Math.abs(x) <= p.outHx! - m && y <= p.outHy1! - m && y >= -p.outHy0! + m;
  };
  const nets: ManhattanNet[] = [], obst: ManhattanObstacle[] = [];
  const allL: number[] = []; for (let l = 0; l < layers; l++) allL.push(l);
  for (let q = 0; q <= p.dirs; q++) {
    const isA = q === p.dirs;
    const ang = isA ? phiA : leadAng[q]!;
    const R = isA ? p.RA : p.Re;
    const src = { x: R * Math.cos(ang), y: R * Math.sin(ang) };
    const t = p.terms[map[q]!]!;
    nets.push({ src, tgt: { x: t.x, y: t.y } });
    obst.push({ x: src.x, y: src.y, r: (isA ? k.comR : k.leadR) + clr + w / 2, layers: [top], net: q });
  }
  p.terms.forEach((t, q) => {
    const owner = map.indexOf(q);
    obst.push({ x: t.x, y: t.y, r: t.r + clr + w / 2, layers: allL, net: owner });
  });
  const spec = { g, x0, y0, W, H, layers, top, w, clr, inside, obst, nets, iters: MANHATTAN.iters };
  const res = routeManhattan(spec, internals);
  internals.inspect?.(spec, res);
  return res;
}

/** The COM gap angles in the order the search tries them (part2d.js lines 222 to 235). */
export function comGaps(p: StickPlan, profile: ConstantSource): { gaps: number[]; warnings: BuildWarning[] } {
  const n = p.dirs;
  const comR = constantMm(profile, SEARCH_CONSTANTS.comR);
  const all: number[] = [];
  for (let q = 0; q < n; q++) all.push(angNorm(2 * Math.PI * (q + 0.5) / n));
  // BLOCKS posts and flat pads stay in the floor; only solo pin cups rise into the wall beside the COM column
  const okA = all.filter((a) => p.blocks || p.termKind === "pads" || p.terms.every((t) => Math.hypot(t.x - p.RA * Math.cos(a), t.y - p.RA * Math.sin(a)) >= t.r + comR + p.clr));
  const tc = p.terms.reduce((s, t) => [s[0]! + t.x, s[1]! + t.y], [0, 0]);
  const tAng = Math.atan2(tc[1]!, tc[0]!);
  okA.sort((a, b) => angDist(a, tAng) - angDist(b, tAng));
  const warnings: BuildWarning[] = [];
  if (!okA.length) { warnings.push({ code: "ROUTE_NO_GAP", text: "no sector gap is clear of the terminals for the common column" }); okA.push(all[0]!); }
  return { gaps: okA, warnings };
}

/** Route a stick plan view: first clean try wins (part2d.js routeSearch). */
export function routeSearch(p: StickPlan, profile: ConstantSource, internals: SearchInternals = {}): StickRoute {
  checkPlan(p);
  const k = {
    grid: constantMm(profile, SEARCH_CONSTANTS.grid),
    edgePad: constantMm(profile, SEARCH_CONSTANTS.edgePad),
    leadR: constantMm(profile, SEARCH_CONSTANTS.leadR),
    comR: constantMm(profile, SEARCH_CONSTANTS.comR),
    leadHalf: constantMm(profile, SEARCH_CONSTANTS.leadHalf),
  };
  const layerOpts: (1 | 2)[] = p.route === "1" ? [1] : p.route === "2" ? [2] : [1, 2];
  const { gaps: okA, warnings } = comGaps(p, profile);
  const centres = p.sectors.map((s) => s.c);
  const leadSlack = p.sectors[0]!.half - k.leadHalf / p.Re - SEARCH.slackMargin;
  const attempts: StickTry[] = [];
  let tries = 0;
  for (const layers of layerOpts) {
    const quick = layers === 1 && layerOpts.length > 1;
    for (const phiA of okA.slice(0, SEARCH.gaps)) {
      const asg = assignments(p.terms, centres.concat([phiA])).slice(0, quick ? SEARCH.quickAssignments : SEARCH.assignments);
      for (const A of asg) {
        for (const variant of [0, 1]) {
          const lead = centres.map((c, q) => {
            if (!variant) return c;
            const t = p.terms[A.map[q]!]!;
            const ta = Math.atan2(t.y, t.x);
            let d = angNorm(ta - c); if (d > Math.PI) d -= 2 * Math.PI;
            return c + Math.sign(d) * Math.min(Math.abs(d), Math.max(0, leadSlack)) * SEARCH.bend;
          });
          tries++;
          const res = tryRoute(p, k, layers, lead, phiA, A.map, internals);
          attempts.push({ layers, phiA, lead, map: A.map, ok: res.ok });
          if (res.ok) return { res, layers, lead, phiA, map: A.map, tries, attempts, cached: false, warnings };
        }
      }
    }
  }
  const fallback = assignments(p.terms, centres.concat([okA[0]!]))[0]!;
  warnings.push({ code: "UNROUTED", text: "trace router could not connect every net; widen the body or switch routing to 2 layers" });
  return { res: null, layers: layerOpts[layerOpts.length - 1]!, lead: centres, phiA: okA[0]!, map: fallback.map, tries, attempts, cached: false, warnings };
}

/** A cache of stick routes by plan view (part2d.js lines 207 to 217). */
export function createRouteCache(): RouteCache<StickRoute> {
  return new RouteCache<StickRoute>();
}

/** routeSearch behind the plan view cache; a hit returns the stored route with cached true. */
export function routeAll(p: StickPlan, profile: ConstantSource, cache: RouteCache<StickRoute>, internals: SearchInternals = {}): StickRoute {
  // the profile lengths the search reads are part of the plan it routes
  const constants = Object.values(SEARCH_CONSTANTS).map((id) => [id, profile.constant(id).value]);
  const key = RouteCache.key({ plan: p, constants, float: internals.legacyFloat32 === true ? 32 : 64 });
  const hit = cache.get(key);
  if (hit) return { ...hit, cached: true };
  const val = routeSearch(p, profile, internals);
  cache.put(key, val);
  return val;
}
