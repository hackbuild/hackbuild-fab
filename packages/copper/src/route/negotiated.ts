// The one copper router's core (D-092): a two layer grid router with
// PathFinder style negotiated congestion, ported from PIP (pip-controller
// src/router.js at b137deb, lineage router/pip-controller-b137deb; vendored
// in designs/pip/legacy/src/router.js). Terminals are posts through both
// layers and hard obstacles for every other net; traces may cross another
// net's clearance zone at a rising price until none does.
//
// Every cost and the history are Float64 by default, the BAFFLE lesson
// (lineage router/baffle-bench-src, part2.js lines 197 to 199): a Float32
// cost array rounds the running cost and starves the frontier. PIP kept its
// history in a Float32Array; the test-only flag legacyFloat32History keeps
// that array type so the parity run reproduces PIP bit for bit. The flag is
// not part of the public route options (packages/copper/src/route/index.ts).

import type { BuildWarning, Ring, Vec2 } from "@hackbuild/spec";
import { commandError } from "@hackbuild/spec";
import { constantMm, type ConstantSource } from "@hackbuild/geom";
import { Heap } from "./heap.js";
import { BLOCKED, FREE, OUTSIDE, discStencil, gridOf, insideByMargin, markStatic, markStaticRect, type Grid } from "./stencil.js";

/** Profile constants the router reads, mm. */
export const ROUTE_CONSTANTS = {
  /** Extra radius on terminal keepouts and via zones (router.js line 68 `safety`). */
  keepoutPad: "route.keepoutPad",
  /** Extra radius on the trace zone stencil (router.js line 74). */
  zonePad: "route.zonePad",
} as const;

/**
 * Search and negotiation weights, dimensionless, in units of one cell step
 * (router.js lines 31 to 32, 133, 143, 197, 214, 222 to 223; haft-toggle.md 2.5).
 */
export const NEGOTIATION = {
  /** Turn cost when the direction code changes by an odd step (45 or 135 deg). */
  turn45: 0.35,
  /** Turn cost for a change of two direction codes (90 deg). */
  turn90: 0.9,
  /** Turn cost for a reversal. */
  reverse: 4,
  /** Base cost of a via. */
  via: 7,
  /** Present congestion price at iteration 0. */
  presStart: 0.6,
  /** Present price multiplier per iteration. */
  presGrowth: 1.7,
  /** History added to a conflicted cell per iteration. */
  history: 0.8,
  /** Initial heap capacity; the heap doubles from here. */
  heapCap: 1 << 16,
} as const;

/** A terminal post through both layers, mm. */
export interface RouteTerminal {
  readonly x: number;
  readonly y: number;
  /** Post radius, mm. */
  readonly r: number;
  /**
   * A rectangular pad around the post, half extents in mm; its keepout is
   * the rectangle grown by clr + w/2 and the keepout pad, so a square pad's
   * corners keep clearance where a disc of its half width would not.
   */
  readonly pad?: { readonly hx: number; readonly hy: number };
}

/** A net with two or more terminals. */
export interface RouteNet {
  readonly name: string;
  readonly terms: readonly RouteTerminal[];
}

/** Route settings, mm except iters (pip-controller src/layout.js line 28). */
export interface RouteSettings {
  /** Trace width. */
  readonly w: number;
  /** Trace to trace clearance. */
  readonly clr: number;
  /** Grid pitch. */
  readonly grid: number;
  /** Via diameter term of the via zone. */
  readonly via: number;
  /** Keep-in distance from the outline. */
  readonly margin: number;
  /** Negotiation iterations at most. */
  readonly iters: number;
}

export interface RouteInput {
  /** Outline polygons, even-odd, mm. */
  readonly outline: readonly Ring[];
  readonly nets: readonly RouteNet[];
  readonly settings: RouteSettings;
}

export interface RoutedNet {
  readonly name: string;
  /** Per layer polylines (layer 0, layer 1), collinear points removed, mm. */
  readonly polys: readonly [Vec2[][], Vec2[][]];
  /** Exact terminal centre to its grid cell centre, on both layers. */
  readonly stubs: readonly [Vec2, Vec2][];
  readonly vias: readonly Vec2[];
  /** Terminals this net failed to connect. */
  readonly fails: number;
  /** Polyline length over both layers, stubs excluded, mm. */
  readonly len: number;
}

/** A cell still inside another net's zone after the last iteration. */
export interface HotCell {
  readonly net: string;
  readonly l: 0 | 1;
  readonly x: number;
  readonly y: number;
}

export interface RouteResult {
  readonly nets: readonly RoutedNet[];
  /** Conflicted cells after the last iteration. */
  readonly conflicts: number;
  readonly hot: readonly HotCell[];
  /** Terminals left unconnected over every net. */
  readonly unrouted: number;
  /** PIP's count: the converging iteration plus one, or iters plus one when it never converged. */
  readonly iters: number;
  readonly grid: { readonly nx: number; readonly ny: number; readonly gp: number };
  /** UNROUTED and ROUTE_CONFLICT warnings for Part IR (D-049), read by CHK-NET-12. */
  readonly warnings: readonly BuildWarning[];
}

/** Test-only switches; never part of the public route options. */
export interface RouteInternals {
  /** Keep PIP's Float32 history array, for the b137deb parity run only. */
  readonly legacyFloat32History?: boolean;
  /** Called once after the last iteration with the history arrays. */
  readonly inspect?: (state: { readonly hist: readonly [Float32Array | Float64Array, Float32Array | Float64Array] }) => void;
}

const DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, 1, 1, 1, 0, -1, -1, -1];
const DC = [1, Math.SQRT2, 1, Math.SQRT2, 1, Math.SQRT2, 1, Math.SQRT2];

function checkInput(input: RouteInput): void {
  const s = input.settings;
  for (const k of ["w", "clr", "grid", "via", "margin"] as const) {
    if (!(Number.isFinite(s[k]) && s[k] >= 0) || (k === "grid" && s[k] === 0)) {
      throw commandError({ code: "E_SCHEMA", path: `/settings/${k}`, got: s[k], expected: k === "grid" ? "a positive pitch in mm" : "a length in mm, 0 or more", hint: `set route ${k} to a finite length in mm` });
    }
  }
  if (!Number.isInteger(s.iters) || s.iters < 1) {
    throw commandError({ code: "E_SCHEMA", path: "/settings/iters", got: s.iters, expected: "an integer, 1 or more", hint: "set route iters to a whole number of iterations" });
  }
  if (!input.outline.some((p) => p.length >= 3)) {
    throw commandError({ code: "E_SCHEMA", path: "/outline", got: input.outline.length, expected: "at least one ring of 3 or more points", hint: "give the router the body outline" });
  }
  input.nets.forEach((n, k) => {
    n.terms.forEach((t, q) => {
      if (t.pad !== undefined && !(Number.isFinite(t.pad.hx) && t.pad.hx >= 0 && Number.isFinite(t.pad.hy) && t.pad.hy >= 0)) {
        throw commandError({ code: "E_SCHEMA", path: `/nets/${k}/terms/${q}/pad`, got: t.pad, expected: "half extents in mm, 0 or more", hint: `give net ${n.name} terminal ${q} a pad of finite half extents` });
      }
    });
    if (n.terms.length < 2) {
      throw commandError({ code: "E_SCHEMA", path: `/nets/${k}/terms`, got: n.terms.length, expected: "2 or more terminals", hint: `net ${n.name} has one terminal; drop it or add its other end` });
    }
  });
}

/**
 * Route every net on two layers. Port of PIP's route(L, opts) with L's
 * outline, nets and inside test passed as data; `profile` supplies the
 * keepout and zone pads.
 */
export function routeNegotiated(input: RouteInput, profile: ConstantSource, internals: RouteInternals = {}): RouteResult {
  checkInput(input);
  const R = input.settings;
  const safety = constantMm(profile, ROUTE_CONSTANTS.keepoutPad);
  const zonePad = constantMm(profile, ROUTE_CONSTANTS.zonePad);
  const grid: Grid = gridOf(input.outline, R.grid);
  const { x0, y0, nx, ny, gp } = grid;
  const N = nx * ny;
  const cx = (i: number): number => x0 + i * gp, cy = (j: number): number => y0 + j * gp;
  const cellOf = (x: number, y: number): number => { const i = Math.round((x - x0) / gp), j = Math.round((y - y0) / gp); return j * nx + i; };
  const nets = input.nets;
  const nN = nets.length;
  const stat = new Int16Array(N).fill(FREE);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (!insideByMargin(input.outline, cx(i), cy(j), R.margin)) stat[j * nx + i] = OUTSIDE;
  }
  nets.forEach((n, k) => {
    for (const t of n.terms) {
      markStatic(stat, grid, t.x, t.y, t.r + R.clr + R.w / 2 + safety, k);
      if (t.pad) markStaticRect(stat, grid, t.x, t.y, t.pad.hx, t.pad.hy, R.clr + R.w / 2 + safety, k);
    }
  });
  const tcell = nets.map((n) => n.terms.map((t) => cellOf(t.x, t.y)));
  // Trace to trace: centrelines w + clr apart with no extra margin, or
  // parallel lanes on the 2.54 mm pad pitch read as conflicts (router.js
  // lines 72 to 73).
  const zoneSt = discStencil(R.w + R.clr + zonePad, gp);
  const viaSt = discStencil(R.via + R.clr + R.w / 2 + safety, gp);
  const zone = [new Uint8Array(N), new Uint8Array(N)] as const;
  const hist = (internals.legacyFloat32History === true
    ? [new Float32Array(N), new Float32Array(N)]
    : [new Float64Array(N), new Float64Array(N)]) as [Float32Array | Float64Array, Float32Array | Float64Array];
  const stamp = [new Int32Array(N), new Int32Array(N)] as const;
  let stampId = 1;
  const S = 2 * N * 9;
  const g = new Float64Array(S), par = new Int32Array(S), seen = new Int32Array(S);
  let seenId = 1;
  const heap = new Heap(NEGOTIATION.heapCap);
  interface Sol { paths: [number, number][][]; vias: number[]; fails: number }
  const sols: (Sol | null)[] = nets.map(() => null);
  const blocks = (st: number, own: number): boolean => st === OUTSIDE || st === BLOCKED || (st >= 0 && st !== own);

  function applyZone(k: number, sign: number): void {
    const s = sols[k];
    if (!s) return;
    stampId++;
    const mark = (l: 0 | 1, c: number, st: readonly [number, number][]): void => {
      const i0 = c % nx, j0 = (c / nx) | 0;
      const zl = zone[l], sl = stamp[l];
      for (const [di, dj] of st) {
        const i = i0 + di, j = j0 + dj;
        if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
        const cc = j * nx + i;
        if (sl[cc] === stampId) continue;
        sl[cc] = stampId;
        zl[cc] = zl[cc]! + sign;
      }
    };
    for (const p of s.paths) for (const [l, c] of p) mark(l as 0 | 1, c, zoneSt);
    for (const v of s.vias) { mark(0, v, viaSt); mark(1, v, viaSt); }
  }

  function astar(k: number, srcSet: readonly [number, number][], goalSet: ReadonlySet<number>, goalXY: readonly [number, number], pres: number): number | null {
    seenId++;
    heap.clear();
    const hx = goalXY[0], hy = goalXY[1];
    const hfun = (c: number): number => { const dx = Math.abs((c % nx) - hx), dy = Math.abs(((c / nx) | 0) - hy); return (Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)); };
    for (const [l, c] of srcSet) {
      const s = (l * N + c) * 9 + 8;
      seen[s] = seenId; g[s] = 0; par[s] = -1;
      heap.push(hfun(c), s);
    }
    const own = k;
    while (heap.n) {
      const s = heap.pop();
      const d = s % 9, lc = (s - d) / 9, l = lc >= N ? 1 : 0, c = lc - l * N;
      const gs = g[s]!;
      if (goalSet.has(l * N + c)) return s;
      const i0 = c % nx, j0 = (c / nx) | 0;
      const hl = hist[l], zl = zone[l];
      for (let m = 0; m < 8; m++) {
        const i = i0 + DX[m]!, j = j0 + DY[m]!;
        if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
        const cc = j * nx + i;
        const st = stat[cc]!;
        const isGoal = goalSet.has(l * N + cc);
        if (!isGoal && blocks(st, own)) continue;
        if (m % 2 === 1) {
          // no corner cutting through blocked cells
          if (blocks(stat[j0 * nx + i]!, own) && blocks(stat[j * nx + i0]!, own)) continue;
        }
        let cost = DC[m]! + hl[cc]! + pres * zl[cc]!;
        if (d !== 8 && d !== m) {
          const t = Math.abs(d - m) % 8;
          cost += (t === 4 ? NEGOTIATION.reverse : t === 2 || t === 6 ? NEGOTIATION.turn90 : NEGOTIATION.turn45);
        }
        const ns = ((l * N + cc) * 9) + m;
        const ng = gs + cost;
        if (seen[ns] === seenId && g[ns]! <= ng) continue;
        seen[ns] = seenId; g[ns] = ng; par[ns] = s;
        heap.push(ng + hfun(cc), ns);
      }
      const ol = 1 - l;
      const vcost = NEGOTIATION.via + pres * (zone[ol as 0 | 1][c]! + zl[c]!) * 0.5 + hist[ol as 0 | 1][c]!;
      const ns = ((ol * N + c) * 9) + 8;
      const ng = gs + vcost;
      if (!(seen[ns] === seenId && g[ns]! <= ng)) { seen[ns] = seenId; g[ns] = ng; par[ns] = s; heap.push(ng + hfun(c), ns); }
    }
    return null;
  }

  function routeNet(k: number, pres: number): Sol {
    const tc = tcell[k]!;
    const pts = nets[k]!.terms;
    // Prim order over the terminals
    const order = [0], left = new Set(tc.map((_, i) => i));
    left.delete(0);
    while (left.size) {
      let best = -1, bd = 1e18;
      for (const i of left) for (const j of order) {
        const d = (pts[i]!.x - pts[j]!.x) ** 2 + (pts[i]!.y - pts[j]!.y) ** 2;
        if (d < bd) { bd = d; best = i; }
      }
      order.push(best); left.delete(best);
    }
    const tree = new Set<number>();
    const addTree = (l: number, c: number): void => { tree.add(l * N + c); };
    const t0c = tc[order[0]!]!;
    addTree(0, t0c); addTree(1, t0c);
    const paths: [number, number][][] = [], vias: number[] = [];
    let fails = 0;
    for (let q = 1; q < order.length; q++) {
      const ti = order[q]!, c = tc[ti]!;
      // goal: the tree; heuristic toward the nearest connected terminal
      let nearest = order[0]!, nd = 1e18;
      for (let r = 0; r < q; r++) {
        const j = order[r]!;
        const d = (pts[ti]!.x - pts[j]!.x) ** 2 + (pts[ti]!.y - pts[j]!.y) ** 2;
        if (d < nd) { nd = d; nearest = j; }
      }
      const gc = tc[nearest]!;
      const end = astar(k, [[0, c], [1, c]], tree, [gc % nx, (gc / nx) | 0], pres);
      if (end === null) { fails++; continue; }
      const seq: [number, number][] = [];
      let s = end;
      while (s >= 0) { const d = s % 9, lc = (s - d) / 9, l = lc >= N ? 1 : 0; seq.push([l, lc - l * N]); s = par[s]!; }
      seq.reverse();
      // split into per layer runs, record vias
      let run: [number, number][] = [seq[0]!];
      for (let i = 1; i < seq.length; i++) {
        const [l, cc] = seq[i]!;
        if (l !== run[run.length - 1]![0]) { vias.push(cc); paths.push(run); run = [seq[i]!]; } else run.push(seq[i]!);
      }
      paths.push(run);
      for (const [l, cc] of seq) addTree(l, cc);
      addTree(0, c); addTree(1, c);
    }
    return { paths, vias, fails };
  }

  function countConf(k: number, addHist: boolean): number {
    const s = sols[k];
    if (!s) return 0;
    // a net's own zone is out while its conflicts are counted
    applyZone(k, -1);
    let n = 0;
    for (const p of s.paths) for (const [l, c] of p) {
      if (zone[l as 0 | 1][c]! > 0) { n++; if (addHist) hist[l as 0 | 1][c] = hist[l as 0 | 1][c]! + NEGOTIATION.history; }
    }
    for (const v of s.vias) {
      if (zone[0][v]! > 0 || zone[1][v]! > 0) {
        n++;
        if (addHist) { hist[0][v] = hist[0][v]! + NEGOTIATION.history; hist[1][v] = hist[1][v]! + NEGOTIATION.history; }
      }
    }
    applyZone(k, +1);
    return n;
  }

  // shortest nets first, by bounding box half perimeter
  const hp = nets.map((n) => {
    const xs = n.terms.map((t) => t.x), ys = n.terms.map((t) => t.y);
    return (Math.max(...xs) - Math.min(...xs)) + (Math.max(...ys) - Math.min(...ys));
  });
  const idx = nets.map((_, i) => i).sort((a, b) => hp[a]! - hp[b]!);
  let pres: number = NEGOTIATION.presStart;
  let conflicts = 0, iter = 0;
  for (iter = 0; iter < R.iters; iter++) {
    for (const k of idx) {
      if (iter > 0 && !(countConf(k, false) > 0)) continue;
      applyZone(k, -1);
      sols[k] = routeNet(k, pres);
      applyZone(k, +1);
    }
    conflicts = 0;
    for (let k = 0; k < nN; k++) conflicts += countConf(k, true);
    if (conflicts === 0) break;
    pres *= NEGOTIATION.presGrowth;
  }
  internals.inspect?.({ hist });

  const hot: HotCell[] = [];
  for (let k = 0; k < nN; k++) {
    const s = sols[k];
    if (!s) continue;
    applyZone(k, -1);
    for (const p of s.paths) for (const [l, c] of p) if (zone[l as 0 | 1][c]! > 0) hot.push({ net: nets[k]!.name, l: l as 0 | 1, x: cx(c % nx), y: cy((c / nx) | 0) });
    applyZone(k, +1);
  }

  const out: RoutedNet[] = nets.map((n, k) => {
    const s = sols[k]!;
    const polys: [Vec2[][], Vec2[][]] = [[], []];
    for (const run of s.paths) {
      const l = run[0]![0] as 0 | 1;
      const pts: Vec2[] = run.map(([, c]) => [cx(c % nx), cy((c / nx) | 0)]);
      const simp: Vec2[] = [pts[0]!];
      for (let i = 1; i < pts.length - 1; i++) {
        const a = simp[simp.length - 1]!, b = pts[i]!, c = pts[i + 1]!;
        const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
        if (Math.abs(cr) > 1e-9) simp.push(b);
      }
      if (pts.length > 1) simp.push(pts[pts.length - 1]!);
      polys[l].push(simp);
    }
    const stubs = n.terms.map((t): [Vec2, Vec2] => { const c = cellOf(t.x, t.y); return [[t.x, t.y], [cx(c % nx), cy((c / nx) | 0)]]; });
    const vias = s.vias.map((c): Vec2 => [cx(c % nx), cy((c / nx) | 0)]);
    let len = 0;
    for (const l of [0, 1] as const) for (const p of polys[l]) for (let i = 1; i < p.length; i++) len += Math.hypot(p[i]![0] - p[i - 1]![0], p[i]![1] - p[i - 1]![1]);
    return { name: n.name, polys, stubs, vias, fails: s.fails, len };
  });
  const unrouted = out.reduce((a, n) => a + n.fails, 0);
  // warning text of pip-controller src/model.js lines 18 to 19
  const warnings: BuildWarning[] = [];
  if (unrouted) warnings.push({ code: "UNROUTED", text: `${unrouted} connections could not be routed, widen the body or move groups apart` });
  if (conflicts) warnings.push({ code: "ROUTE_CONFLICT", text: `routing left ${conflicts} tight spots under the clearance, raise iterations or loosen the grid` });
  return { nets: out, conflicts, hot, unrouted, iters: iter + 1, grid: { nx, ny, gp }, warnings };
}
