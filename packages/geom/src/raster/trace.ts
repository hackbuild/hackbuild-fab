// Mask to loops, ported from SPRUE (sprue.html lines 400 to 527, lineage
// sprue.bench/geom-trace): `trace` walks pixel edges into closed loops,
// `simplify` drops collinear points and runs Douglas Peucker on a canonical
// start and orientation, `group` pairs outers (counter-clockwise) with the
// holes (clockwise) they contain. SPRUE's ear clipper (sprue.html lines 531
// to 624) is not ported: caps go through the geom earcut wrapper (D-163).
//
// Coordinates: trace returns pixel corners in image space, x right and y
// down, corner (x, y) the top left of cell (x, y). A mask row 0 is the top
// row, the order SPRUE stores masks in (fill.ts RowOrder "top").

/** A 2D point; trace gives pixel corners, group takes mm. */
export type Pt = readonly [number, number];

/** A 0 or 1 mask, w x h cells, row 0 at the top. */
export interface TraceMask {
  readonly w: number;
  readonly h: number;
  readonly d: Uint8Array;
}

/** SPRUE's simplify tolerance, px (sprue.html line 1233, `tol: 0.75`). */
export const TRACE_TOLERANCE_PX = 0.75;

/**
 * Boundary loops along pixel edges. Each filled cell contributes the sides
 * that face an empty cell or the grid edge, walked clockwise on screen. At
 * a corner with two outgoing edges the clockwise turn wins, which splits
 * diagonal contacts (4-connectivity). Loops shorter than 4 points are dropped.
 */
export function trace(m: TraceMask): Pt[][] {
  const { w, h, d } = m;
  const W = w + 1;
  const ex0: number[] = [], ey0: number[] = [], ex1: number[] = [], ey1: number[] = [];
  const outAt = new Map<number, number[]>();
  const edge = (x0: number, y0: number, x1: number, y1: number): void => {
    const id = ex0.length;
    ex0.push(x0); ey0.push(y0); ex1.push(x1); ey1.push(y1);
    const k = y0 * W + x0;
    const l = outAt.get(k);
    if (l) l.push(id);
    else outAt.set(k, [id]);
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!d[y * w + x]) continue;
    if (y === 0 || !d[(y - 1) * w + x]) edge(x, y, x + 1, y);
    if (x === w - 1 || !d[y * w + x + 1]) edge(x + 1, y, x + 1, y + 1);
    if (y === h - 1 || !d[(y + 1) * w + x]) edge(x + 1, y + 1, x, y + 1);
    if (x === 0 || !d[y * w + x - 1]) edge(x, y + 1, x, y);
  }
  const used = new Uint8Array(ex0.length);
  const loops: Pt[][] = [];
  for (let s = 0; s < ex0.length; s++) {
    if (used[s]) continue;
    const loop: Pt[] = [];
    let e = s;
    while (!used[e]) {
      used[e] = 1;
      loop.push([ex0[e]!, ey0[e]!]);
      const dx = ex1[e]! - ex0[e]!, dy = ey1[e]! - ey0[e]!;
      const cands = outAt.get(ey1[e]! * W + ex1[e]!) ?? [];
      let next = -1;
      if (cands.length === 1) next = cands[0]!;
      else {
        for (const c of cands) {
          if (used[c]) continue;
          const cdx = ex1[c]! - ex0[c]!, cdy = ey1[c]! - ey0[c]!;
          // above 0 is the clockwise turn on screen
          if (dx * cdy - dy * cdx > 0) { next = c; break; }
          if (next < 0) next = c;
        }
      }
      if (next < 0 || used[next]) break;
      e = next;
    }
    if (loop.length >= 4) loops.push(loop);
  }
  return loops;
}

/** Signed area, positive counter-clockwise in a y-up frame (clockwise on screen). */
export function loopArea(p: readonly Pt[]): number {
  let a = 0;
  const n = p.length;
  for (let i = 0; i < n; i++) {
    const q = p[i]!, r = p[(i + 1) % n]!;
    a += q[0] * r[1] - r[0] * q[1];
  }
  return a / 2;
}

/** Douglas Peucker over an open polyline; both ends kept. */
export function douglasPeucker(pts: readonly Pt[], tol: number): Pt[] {
  if (pts.length <= 2) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [i0, i1] = stack.pop()!;
    if (i1 - i0 < 2) continue;
    const [ax, ay] = pts[i0]!, [bx, by] = pts[i1]!;
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
    let mx = -1, mi = -1;
    for (let i = i0 + 1; i < i1; i++) {
      const dist = Math.abs((pts[i]![0] - ax) * dy - (pts[i]![1] - ay) * dx) / len;
      if (dist > mx) { mx = dist; mi = i; }
    }
    if (mx > tol) {
      keep[mi] = 1;
      stack.push([i0, mi], [mi, i1]);
    }
  }
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]!);
  return out;
}

/**
 * Drop collinear points, start at the lexicographically smallest point
 * with positive orientation so a loop and its reverse simplify alike, split
 * at the point farthest from the start and run Douglas Peucker on both
 * halves. The result keeps the input's orientation; null when fewer than 3
 * points remain.
 */
export function simplifyLoop(loop: readonly Pt[], tol: number = TRACE_TOLERANCE_PX): Pt[] | null {
  let pts: Pt[] = [];
  const n = loop.length;
  for (let i = 0; i < n; i++) {
    const a = loop[(i - 1 + n) % n]!, b = loop[i]!, c = loop[(i + 1) % n]!;
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (cross !== 0) pts.push(b);
  }
  if (pts.length < 3) return null;
  let mi = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i]![0] < pts[mi]![0] || (pts[i]![0] === pts[mi]![0] && pts[i]![1] < pts[mi]![1])) mi = i;
  }
  pts = pts.slice(mi).concat(pts.slice(0, mi));
  let reversed = false;
  if (loopArea(pts) < 0) {
    pts = [pts[0]!].concat(pts.slice(1).reverse());
    reversed = true;
  }
  let far = 1, best = -1;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i]![0] - pts[0]![0], dy = pts[i]![1] - pts[0]![1];
    const dd = dx * dx + dy * dy;
    if (dd > best) { best = dd; far = i; }
  }
  const a = douglasPeucker(pts.slice(0, far + 1), tol);
  const b = douglasPeucker(pts.slice(far).concat([pts[0]!]), tol);
  let out = a.slice(0, -1).concat(b.slice(0, -1));
  if (reversed) out = [out[0]!].concat(out.slice(1).reverse());
  if (out.length < 3) return null;
  return out;
}

/** Even-odd point in polygon. */
export function pointInLoop(p: Pt, poly: readonly Pt[]): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = poly[i]!, [xj, yj] = poly[j]!;
    if (((yi > p[1]) !== (yj > p[1])) && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

/** One outer loop and its holes, mm, y up. */
export interface LoopGroup {
  /** counter-clockwise */
  readonly outer: Pt[];
  /** |area| of the outer, mm2 */
  readonly area: number;
  /** clockwise */
  readonly holes: Pt[][];
}

/**
 * Outers are the counter-clockwise loops, holes the clockwise ones; each
 * hole goes to the smallest larger outer that contains its first point. A
 * hole no outer contains is dropped, as SPRUE drops it. Loops of area under
 * 1e-9 are skipped.
 */
export function groupLoops(loops: readonly Pt[][]): LoopGroup[] {
  const outers: { pts: Pt[]; area: number }[] = [], holes: { pts: Pt[]; area: number }[] = [];
  for (const l of loops) {
    const a = loopArea(l);
    if (Math.abs(a) < 1e-9) continue;
    (a > 0 ? outers : holes).push({ pts: l, area: Math.abs(a) });
  }
  const polys = outers.map((o) => ({ outer: o.pts, area: o.area, holes: [] as Pt[][] }));
  for (const hl of holes) {
    let best: (typeof polys)[number] | null = null;
    for (const p of polys) {
      if (p.area <= hl.area) continue;
      if (pointInLoop(hl.pts[0]!, p.outer) && (!best || p.area < best.area)) best = p;
    }
    if (best) best.holes.push(hl.pts);
  }
  return polys;
}

/**
 * A mask as grouped loops in mm, y up, origin at the grid centre: trace,
 * simplify at tol px, map (px, py) to ((px - w / 2) / ppm, (h / 2 - py) /
 * ppm) and reverse, which restores counter-clockwise outers after the y
 * flip, then group (sprue.html slabMesh lines 628 to 636).
 */
export function maskLoops(m: TraceMask, ppm: number, tol: number = TRACE_TOLERANCE_PX): LoopGroup[] {
  const cx = m.w / 2, cy = m.h / 2;
  const loops: Pt[][] = [];
  for (const l of trace(m)) {
    const s = simplifyLoop(l, tol);
    if (!s) continue;
    loops.push(s.map((p): Pt => [(p[0] - cx) / ppm, (cy - p[1]) / ppm]).reverse());
  }
  return groupLoops(loops);
}

/** Cap area of grouped loops, mm2: outers plus their (negative) holes, as slabMesh's `want`. */
export function groupsArea(groups: readonly LoopGroup[]): number {
  let a = 0;
  for (const g of groups) a += loopArea(g.outer) + g.holes.reduce((s, h) => s + loopArea(h), 0);
  return a;
}
