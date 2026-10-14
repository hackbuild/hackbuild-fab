// The router's Manhattan mode (D-092), ported from TOGGLE's buried trace
// router (toggle src/src/part2c.js lines 31 to 205, lineage
// router/toggle-part2c): grid A* on one or two layers, 4-connected moves
// with a turn price, vias between layers, and negotiated congestion over
// per net occupancy masks dilated by a square of cells. Vinyl copper uses
// it when 45 degree lanes are not wanted.
//
// TOGGLE kept g and the history in Float32Array; the test-only flag
// legacyFloat32 keeps both so the parity run reproduces TOGGLE's tries bit
// for bit. The default is Float64 for both (the BAFFLE lesson, lineage
// router/baffle-bench-src). The occupancy counts are Uint16 where TOGGLE
// had Uint8, so more than 255 nets on one cell cannot wrap; below that the
// two are the same.

import type { BuildWarning, Vec2 } from "@hackbuild/spec";
import { commandError } from "@hackbuild/spec";
import { Heap } from "./heap.js";

/** Search and negotiation weights of the Manhattan mode, in cell steps (part2c.js lines 68, 88, 153, 169, 173; part2d.js line 203). */
export const MANHATTAN = {
  /** Price of one turn. */
  turn: 2.5,
  /** Base price of a via when the input gives none. */
  via: 30,
  /** Present congestion price at iteration 0. */
  presStart: 0.6,
  /** Present price multiplier per iteration. */
  presGrowth: 1.7,
  /** History added to a conflicted cell per iteration. */
  history: 1.5,
  /** Heap pops per search before it gives up. */
  popCap: 400000,
  /** Negotiation iterations TOGGLE's route search asks for. */
  iters: 22,
} as const;

/** A disc the grid keeps out of, on the listed layers, mm; `net` -1 blocks every net, else that net may enter it. */
export interface ManhattanObstacle {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly layers: readonly number[];
  readonly net: number;
}

/** A two terminal net: the source sits on the top layer, the target on any layer. */
export interface ManhattanNet {
  readonly src: { readonly x: number; readonly y: number };
  readonly tgt: { readonly x: number; readonly y: number };
}

export interface ManhattanInput {
  /** Cell (i, j) centre is (x0 + i g, y0 + j g), mm. */
  readonly g: number;
  readonly x0: number;
  readonly y0: number;
  readonly W: number;
  readonly H: number;
  readonly layers: 1 | 2;
  /** Layer the sources sit on. */
  readonly top: number;
  /** Trace width and clearance, mm. */
  readonly w: number;
  readonly clr: number;
  /** Keep-in test per layer at a cell centre, mm. */
  readonly inside: (x: number, y: number, l: number) => boolean;
  readonly obst: readonly ManhattanObstacle[];
  readonly nets: readonly ManhattanNet[];
  readonly iters: number;
  /** Via price in cell steps; MANHATTAN.via when absent. */
  readonly viaCost?: number;
}

/** One run of a routed net on one layer, corner points only, mm. */
export interface ManhattanRun {
  readonly l: number;
  readonly pts: Vec2[];
}

export interface ManhattanNetResult {
  readonly runs: readonly ManhattanRun[];
  readonly vias: readonly { readonly x: number; readonly y: number }[];
  /** Manhattan length over every run, mm. */
  readonly len: number;
}

export interface ManhattanResult {
  /** Every net found and no centreline inside another net's mask. */
  readonly ok: boolean;
  /** Nets whose search failed in the last pass, by index. */
  readonly failed: readonly number[];
  readonly layers: number;
  readonly nets: readonly (ManhattanNetResult | null)[];
  /** UNROUTED or ROUTE_CONFLICT when not ok, for Part IR (D-049). */
  readonly warnings: readonly BuildWarning[];
}

/** Test-only switches; never part of the public route options. */
export interface ManhattanInternals {
  /** Keep TOGGLE's Float32 g and history arrays, for the parity run only. */
  readonly legacyFloat32?: boolean;
}

function checkInput(spec: ManhattanInput): void {
  const bad = (path: string, got: unknown, expected: string): never => {
    throw commandError({ code: "E_SCHEMA", path, got, expected, hint: `set ${path.slice(1)} to ${expected}` });
  };
  if (!(Number.isFinite(spec.g) && spec.g > 0)) bad("/g", spec.g, "a positive pitch in mm");
  for (const k of ["w", "clr"] as const) if (!(Number.isFinite(spec[k]) && spec[k] >= 0)) bad(`/${k}`, spec[k], "a length in mm, 0 or more");
  if (!(Number.isInteger(spec.W) && spec.W > 0 && Number.isInteger(spec.H) && spec.H > 0)) bad("/W", [spec.W, spec.H], "positive whole cell counts");
  if (spec.layers !== 1 && spec.layers !== 2) bad("/layers", spec.layers, "1 or 2");
  if (!(Number.isInteger(spec.top) && spec.top >= 0 && spec.top < spec.layers)) bad("/top", spec.top, "a layer index below layers");
  if (!(Number.isInteger(spec.iters) && spec.iters >= 1)) bad("/iters", spec.iters, "an integer, 1 or more");
}

/** Route every net of `spec` (part2c.js T.route). */
export function routeManhattan(spec: ManhattanInput, internals: ManhattanInternals = {}): ManhattanResult {
  checkInput(spec);
  const { g, x0, y0, W, H, layers, top, w, clr } = spec;
  const NC = W * H, NS = NC * layers;
  const R = Math.max(1, Math.ceil((w + clr) / g - 1e-9) - 1);
  const nets = spec.nets;
  const stat: Int16Array[] = [];
  for (let l = 0; l < layers; l++) {
    const a = new Int16Array(NC);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (!spec.inside(x0 + i * g, y0 + j * g, l)) a[j * W + i] = -1;
    stat.push(a);
  }
  for (const o of spec.obst) {
    const v = o.net >= 0 ? o.net + 1 : -1;
    const i0 = Math.max(0, Math.floor((o.x - o.r - x0) / g)), i1 = Math.min(W - 1, Math.ceil((o.x + o.r - x0) / g));
    const j0 = Math.max(0, Math.floor((o.y - o.r - y0) / g)), j1 = Math.min(H - 1, Math.ceil((o.y + o.r - y0) / g));
    for (const l of o.layers) {
      if (l < 0 || l >= layers) continue;
      const a = stat[l]!;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        if (Math.hypot(x0 + i * g - o.x, y0 + j * g - o.y) >= o.r) continue;
        const c = j * W + i, s = a[c]!;
        if (v === -1 || s === -1) a[c] = -1;
        else if (s === 0) a[c] = v;
        else if (s !== v) a[c] = -2;
      }
    }
  }
  const cellOf = (p: { x: number; y: number }): number => Math.round((p.y - y0) / g) * W + Math.round((p.x - x0) / g);
  const blocked = (l: number, c: number, n: number): boolean => { const s = stat[l]![c]!; return s < 0 || (s > 0 && s !== n + 1); };

  const legacy = internals.legacyFloat32 === true;
  const occ: Uint16Array[] = [], hist: (Float32Array | Float64Array)[] = [];
  for (let l = 0; l < layers; l++) { occ.push(new Uint16Array(NC)); hist.push(legacy ? new Float32Array(NC) : new Float64Array(NC)); }
  const masks: (Uint8Array[] | null)[] = nets.map(() => null), paths: (number[] | null)[] = nets.map(() => null);
  const gcost = legacy ? new Float32Array(NS) : new Float64Array(NS);
  const parent = new Int32Array(NS), stamp = new Int32Array(NS), closed = new Int32Array(NS);
  let run = 0;
  const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
  const src = nets.map((n) => cellOf(n.src)), tgt = nets.map((n) => cellOf(n.tgt));
  const viaCost = spec.viaCost ?? MANHATTAN.via, turn = MANHATTAN.turn;
  const hq = new Heap(1 << 12);

  function search(n: number, pres: number): number[] | null {
    run++;
    const cs = src[n]!, ct = tgt[n]!;
    if (cs < 0 || cs >= NC || ct < 0 || ct >= NC) return null;
    if (blocked(top, cs, n)) return null;
    let tBlocked = true;
    for (let l = 0; l < layers; l++) if (!blocked(l, ct, n)) tBlocked = false;
    if (tBlocked) return null;
    const ti = ct % W, tj = (ct / W) | 0;
    hq.clear();
    const s0 = top * NC + cs;
    stamp[s0] = run; gcost[s0] = 0; parent[s0] = -1;
    hq.push(0, s0);
    let found = -1, pops = 0;
    while (hq.n) {
      const s = hq.pop();
      if (closed[s] === run) continue;
      closed[s] = run;
      if (++pops > MANHATTAN.popCap) break;
      const l = (s / NC) | 0, c = s - l * NC;
      if (c === ct) { found = s; break; }
      const i = c % W, j = (c / W) | 0;
      const p = parent[s]!;
      let pd = -1;
      if (p >= 0) { const pc = p % NC; if (pc !== c) { const pi = pc % W, pj = (pc / W) | 0; pd = i > pi ? 0 : i < pi ? 1 : j > pj ? 2 : 3; } }
      const base = gcost[s]!;
      for (let d = 0; d < 4; d++) {
        const ni = i + DX[d]!, nj = j + DY[d]!;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const nc = nj * W + ni;
        if (blocked(l, nc, n)) continue;
        const ns = l * NC + nc;
        if (closed[ns] === run) continue;
        const cong = occ[l]![nc]! * pres + hist[l]![nc]!;
        const cost = base + 1 + (pd >= 0 && pd !== d ? turn : 0) + cong;
        if (stamp[ns] !== run || cost < gcost[ns]!) {
          stamp[ns] = run; gcost[ns] = cost; parent[ns] = s;
          hq.push(cost + Math.abs(ni - ti) + Math.abs(nj - tj), ns);
        }
      }
      for (let l2 = 0; l2 < layers; l2++) {
        if (l2 === l || blocked(l2, c, n)) continue;
        const ns = l2 * NC + c;
        if (closed[ns] === run) continue;
        const cost = base + viaCost + occ[l2]![c]! * pres + hist[l2]![c]!;
        if (stamp[ns] !== run || cost < gcost[ns]!) {
          stamp[ns] = run; gcost[ns] = cost; parent[ns] = s;
          hq.push(cost + Math.abs(i - ti) + Math.abs(j - tj), ns);
        }
      }
    }
    if (found < 0) return null;
    const out: number[] = [];
    for (let s = found; s >= 0; s = parent[s]!) out.push(s);
    out.reverse();
    return out;
  }

  function commit(n: number, path: number[]): void {
    const m: Uint8Array[] = [];
    for (let l = 0; l < layers; l++) m.push(new Uint8Array(NC));
    for (const s of path) {
      const l = (s / NC) | 0, c = s - l * NC, i = c % W, j = (c / W) | 0;
      const a = m[l]!;
      for (let jj = Math.max(0, j - R); jj <= Math.min(H - 1, j + R); jj++) {
        const row = jj * W;
        for (let ii = Math.max(0, i - R); ii <= Math.min(W - 1, i + R); ii++) a[row + ii] = 1;
      }
    }
    for (let l = 0; l < layers; l++) { const o = occ[l]!, a = m[l]!; for (let c = 0; c < NC; c++) o[c] = o[c]! + a[c]!; }
    masks[n] = m; paths[n] = path;
  }
  function ripup(n: number): void {
    const mk = masks[n];
    if (!mk) return;
    for (let l = 0; l < layers; l++) { const o = occ[l]!, a = mk[l]!; for (let c = 0; c < NC; c++) o[c] = o[c]! - a[c]!; }
    masks[n] = null; paths[n] = null;
  }

  // shortest straight distance first (part2c.js lines 148 to 152)
  const order = nets.map((_, k) => k).sort((a, b) => {
    const da = Math.hypot(nets[a]!.src.x - nets[a]!.tgt.x, nets[a]!.src.y - nets[a]!.tgt.y);
    const db = Math.hypot(nets[b]!.src.x - nets[b]!.tgt.x, nets[b]!.src.y - nets[b]!.tgt.y);
    return da - db;
  });
  let pres: number = MANHATTAN.presStart, ok = false, failed: number[] = [];
  for (let it = 0; it < spec.iters; it++) {
    failed = [];
    for (const n of order) {
      ripup(n);
      const p = search(n, pres);
      if (!p) { failed.push(n); continue; }
      commit(n, p);
    }
    // a failed search ends the negotiation at once (part2c.js line 163)
    if (failed.length) break;
    let conflicts = 0;
    const bad = new Set<number>();
    for (const n of order) {
      for (const s of paths[n]!) {
        const l = (s / NC) | 0, c = s - l * NC;
        if (occ[l]![c]! - masks[n]![l]![c]! > 0) { conflicts++; hist[l]![c] = hist[l]![c]! + MANHATTAN.history; bad.add(n); }
      }
    }
    if (!conflicts) { ok = true; break; }
    pres *= MANHATTAN.presGrowth;
    // the conflicted nets reroute first next round
    order.sort((a, b) => (bad.has(b) ? 1 : 0) - (bad.has(a) ? 1 : 0));
  }
  const out: (ManhattanNetResult | null)[] = nets.map((_, n) => {
    const path = paths[n];
    if (!path) return null;
    const pts = path.map((s) => { const l = (s / NC) | 0, c = s - l * NC; return { l, x: x0 + (c % W) * g, y: y0 + ((c / W) | 0) * g }; });
    const runs: { l: number; pts: Vec2[] }[] = [], vias: { x: number; y: number }[] = [];
    let cur: { l: number; pts: Vec2[] } | null = null;
    for (const p of pts) {
      if (!cur || cur.l !== p.l) {
        if (cur) vias.push({ x: p.x, y: p.y });
        cur = { l: p.l, pts: [[p.x, p.y]] };
        runs.push(cur);
        continue;
      }
      const P = cur.pts;
      if (P.length >= 2) {
        const a = P[P.length - 2]!, b = P[P.length - 1]!;
        const col = (Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(b[0] - p.x) < 1e-9) || (Math.abs(a[1] - b[1]) < 1e-9 && Math.abs(b[1] - p.y) < 1e-9);
        if (col) { P[P.length - 1] = [p.x, p.y]; continue; }
      }
      P.push([p.x, p.y]);
    }
    let len = 0;
    for (const r of runs) for (let k = 1; k < r.pts.length; k++) len += Math.abs(r.pts[k]![0] - r.pts[k - 1]![0]) + Math.abs(r.pts[k]![1] - r.pts[k - 1]![1]);
    return { runs, vias, len };
  });
  const warnings: BuildWarning[] = [];
  if (failed.length) warnings.push({ code: "UNROUTED", text: `${failed.length} nets could not be routed, widen the body or switch routing to 2 layers` });
  else if (!ok) warnings.push({ code: "ROUTE_CONFLICT", text: `routing left traces inside another net's clearance after ${spec.iters} iterations, widen the body or switch routing to 2 layers` });
  return { ok, failed, layers, nets: out, warnings };
}
