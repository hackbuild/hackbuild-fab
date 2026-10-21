// M02-T10: prismatic raster sweep, SASH slide. Expected overlap values are
// the bench's own `BENCH.check().lanes` and its own runCheck on shifted wall
// rasters, captured by designs/sash/extract/capture.py from the legacy
// sash.html with one line added; never from the port. Closest approach is
// new, so it is checked against a plain all-pairs distance written here and
// against the bench's side and end clearances (ST.fit, in each fixture).

import { describe, expect, test } from "vitest";
import { prismaticSweep, type PrismaticInput, type PrismaticLaneResult } from "../src/sweep/prismatic.js";
import { decodeRle, loadSashFixture, sashCases, sashInput, sashSlideSweep, type SashFixture } from "../scenes/sash-slide.js";

const DEFAULT = "battery-default";
const BODY = 1;

/** Wall raster of fx moved `cells` rows toward lane 0's slide body (its `dir`), as capture.py's NEGATIVE_JS moves it. */
function shiftedWall(fx: SashFixture, cells: number): Uint8Array {
  const { W, H } = fx.front;
  const wall = decodeRle(fx.wall, W * H);
  const out = new Uint8Array(W * H);
  const d = cells * fx.lanes[0]!.dir;
  for (let j = 0; j < H; j += 1) {
    const js = j - d;
    if (js >= 0 && js < H) out.set(wall.subarray(js * W, js * W + W), j * W);
  }
  return out;
}

/** Wall cell centres sorted by x, mm: the all-pairs scan reads them once per input. */
interface WallCells { readonly x: Float64Array; readonly y: Float64Array }
const wallCells = new WeakMap<PrismaticInput, WallCells>();
function wallOf(input: PrismaticInput): WallCells {
  let w = wallCells.get(input);
  if (w !== undefined) return w;
  const { frame, wall } = input;
  const pts: [number, number][] = [];
  for (let j = 0; j < frame.H; j += 1) for (let i = 0; i < frame.W; i += 1) if (wall[j * frame.W + i]) pts.push([frame.x0 + (i + 0.5) * frame.px, frame.y0 + (j + 0.5) * frame.px]);
  pts.sort((a, b) => a[0] - b[0]);
  w = { x: Float64Array.from(pts, (p) => p[0]), y: Float64Array.from(pts, (p) => p[1]) };
  wallCells.set(input, w);
  return w;
}

/**
 * Every slide body cell against every wall cell at position k: centre distance less half a
 * pitch each side, mm. The wall is scanned outward in x from each body cell and stops once
 * dx squared alone reaches the best squared distance, so no pair that could be nearer is
 * skipped; `bruteForce` scans every pair, and the two are compared on seeded rasters below.
 */
function allPairs(input: PrismaticInput, lane: number, k: number, bruteForce = false): number {
  const { frame } = input;
  const l = input.lanes[lane]!, s = l.slide;
  const w = wallOf(input), n = w.x.length;
  const ox = l.xLeft(k) + l.Ls / 2, oy = l.slideY + (l.dir * l.Ws) / 2;
  let best = Infinity;
  const near = (q: number, x: number, y: number): boolean => {
    const dx = w.x[q]! - x, dx2 = dx * dx;
    if (!bruteForce && dx2 >= best) return false;
    const dy = w.y[q]! - y, d2 = dx2 + dy * dy;
    if (d2 < best) best = d2;
    return true;
  };
  for (let j = 0; j < s.H; j += 1) {
    for (let i = 0; i < s.W; i += 1) {
      if (s.meta[j * s.W + i] !== BODY) continue;
      const x = ox + s.x0 + (i + 0.5) * s.px, y = oy + s.y0 + (j + 0.5) * s.px;
      if (bruteForce) { for (let q = 0; q < n; q += 1) near(q, x, y); continue; }
      let lo = 0, hi = n;
      while (lo < hi) { const m = (lo + hi) >> 1; if (w.x[m]! < x) lo = m + 1; else hi = m; }
      for (let q = lo; q < n && near(q, x, y); q += 1);
      for (let q = lo - 1; q >= 0 && near(q, x, y); q -= 1);
    }
  }
  return Math.sqrt(best) - (s.px + frame.px) / 2;
}

const cases = sashCases();
const runs = new Map<string, { fx: SashFixture; out: PrismaticLaneResult[] }>();
const run = (slug: string): { fx: SashFixture; out: PrismaticLaneResult[] } => {
  let r = runs.get(slug);
  if (!r) {
    r = { fx: loadSashFixture(slug), out: sashSlideSweep(slug) };
    runs.set(slug, r);
  }
  return r;
};

describe("SASH runCheck fixtures", () => {
  test("22 fixtures: the battery preset plus the 21 cases of sweep.py, one per file", () => {
    expect(cases).toHaveLength(22);
    expect(cases).toContain(DEFAULT);
    const names = cases.map((c) => loadSashFixture(c).case);
    expect(new Set(names).size).toBe(22);
    expect(cases.filter((c) => loadSashFixture(c).js === "")).toEqual([DEFAULT]);
  });

  test.each(cases)("%s: overlapCells and overlapK equal the bench's runCheck, closest approach reported", (slug) => {
    const { fx, out } = run(slug);
    expect(out.map((l) => l.name)).toEqual(fx.check.map((c) => c.name));
    expect(out.map((l) => [l.overlapCells, l.overlapK])).toEqual(fx.check.map((c) => [c.overlapCells, c.overlapK]));
    // sweep.py fails a case on any overlap; every captured case is clear.
    expect(out.every((l) => l.overlapCells === 0)).toBe(true);
    for (const [n, l] of out.entries()) {
      expect(l.poses).toBe(fx.lanes[n]!.xLeft.length);
      expect(l.rows.map((r) => r.k)).toEqual(fx.lanes[n]!.xLeft.map(([k]) => k));
      expect(l.closest).not.toBeNull();
      const c = l.closest!;
      expect(c.mm).toBeGreaterThan(0);
      expect(c.mm).toBe(Math.min(...l.rows.map((r) => r.mm)));
      // The slide sits in a rectangular cavity cy from its sides and cx from its ends; the
      // nearest wall is at most one cell nearer or farther than the smaller of the two.
      const px = fx.front.px;
      expect(Math.abs(c.mm - Math.min(fx.fit.cy, fx.fit.cx))).toBeLessThanOrEqual(px + 1e-9);
      console.log(`${slug} lane ${n + 1} ${l.name}: closest approach ${c.mm.toFixed(3)} mm at k ${c.k} (computed), ${l.poses} positions`);
    }
  });
});

describe("negative fixture: battery wall raster shifted into the slide path", () => {
  const fx = loadSashFixture(DEFAULT);

  test("port equals the bench's runCheck on every recorded shift", () => {
    expect(fx.negative?.map((n) => n.shiftCells)).toEqual([1, 2, 3, 4]);
    for (const n of fx.negative!) {
      const out = prismaticSweep(sashInput(fx, shiftedWall(fx, n.shiftCells)));
      expect(out.map((l) => ({ overlapCells: l.overlapCells, overlapK: l.overlapK }))).toEqual(n.lanes.map((l) => ({ overlapCells: l.overlapCells, overlapK: l.overlapK })));
    }
  });

  test("shifted one cell past the side clearance, the slide overlaps at a stated k", () => {
    // One cell (0.1 mm at 10 px per mm) sits inside the 0.2 mm side clearance, where the
    // bench's runCheck reports 0; the first shift that reaches the body is cy / px + 1 cells.
    const cells = Math.round(fx.fit.cy / fx.front.px) + 1;
    expect(cells).toBe(3);
    const out = prismaticSweep(sashInput(fx, shiftedWall(fx, cells)));
    const l = out[0]!;
    expect(l.overlapCells).toBeGreaterThan(0);
    expect(l.closest!.mm).toBeLessThanOrEqual(0);
    expect(l.rows.every((r) => r.cells > 0)).toBe(true);
    console.log(`negative shift ${cells} cells: ${l.overlapCells} cells at k ${l.overlapK}, closest approach ${l.closest!.mm.toFixed(3)} mm (computed)`);
  });
});

describe("closest approach against all pairs", () => {
  const slug = "res-6-6-copies";

  test("the x-pruned scan equals every pair on seeded random rasters", () => {
    // A brute-force scan of res-6-6-copies costs about 1.4 s per position (measured, Apple M1,
    // load about 13), which is what timed the two tests below out at 5000 ms; the pruned scan
    // costs about 26 ms. The pruning is checked here on rasters small enough to scan whole.
    let seed = 12345;
    const rnd = (): number => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32);
    for (let t = 0; t < 40; t += 1) {
      const W = 30 + Math.floor(rnd() * 30), H = 20 + Math.floor(rnd() * 20), sw = 4 + Math.floor(rnd() * 10), sh = 2 + Math.floor(rnd() * 6);
      const wall = Uint8Array.from({ length: W * H }, () => (rnd() < 0.05 ? 1 : 0));
      const meta = Uint8Array.from({ length: sw * sh }, () => (rnd() < 0.6 ? BODY : 0));
      meta[0] = BODY;
      wall[Math.floor(rnd() * W * H)] = 1;
      const input: PrismaticInput = {
        frame: { W, H, px: 0.5, x0: -3, y0: 1 }, wall, step: 1,
        lanes: [{ name: "r", N: 3, Ls: sw * 0.5, Ws: sh * 0.5, slideY: H * 0.25, dir: t % 2 === 0 ? 1 : -1, xLeft: (k) => 2 + 3.7 * k, slide: { W: sw, H: sh, px: 0.5, x0: -sw * 0.25, y0: -sh * 0.25, meta } }],
      };
      for (const k of [0, 1, 2]) expect(allPairs(input, 0, k)).toBe(allPairs(input, 0, k, true));
    }
  });

  test("clear: equals the all-pairs distance at every fourth position", () => {
    const fx = loadSashFixture(slug);
    const input = sashInput(fx);
    const out = prismaticSweep(input)[0]!;
    for (const r of out.rows.filter((_, i) => i % 4 === 0)) expect(r.mm).toBeCloseTo(allPairs(input, 0, r.k), 9);
  });

  test("overlapping: equals the all-pairs distance at every fourth position from k 0.5", () => {
    const fx = loadSashFixture(slug);
    const input = sashInput(fx, shiftedWall(fx, Math.round(fx.fit.cy / fx.front.px) + 2));
    const out = prismaticSweep(input)[0]!;
    expect(out.overlapCells).toBeGreaterThan(0);
    for (const r of out.rows.filter((_, i) => i % 4 === 1)) expect(r.mm).toBeCloseTo(allPairs(input, 0, r.k), 9);
  });
});

describe("synthetic comb: binds only between stations", () => {
  // A slide body with a gap every pitch rides past one wall pillar: at each station the pillar
  // sits in a gap, half a pitch on it lands on body.
  const px = 1, p = 4, N = 3, W = 24, H = 6;
  const meta = new Uint8Array(12 * 2);
  for (let i = 0; i < 12; i += 1) for (let j = 0; j < 2; j += 1) meta[j * 12 + i] = i % p === 1 ? 0 : BODY;
  const wall = new Uint8Array(W * H);
  wall[2 * W + 14] = 1;
  const input: PrismaticInput = {
    frame: { W, H, px, x0: 0, y0: 0 },
    wall,
    step: 0.5,
    lanes: [{ name: "comb", N, Ls: 12, Ws: 2, slideY: 2, dir: 1, xLeft: (k) => 1 + (N - 1 - k) * p, slide: { W: 12, H: 2, px, x0: -6, y0: -1, meta } }],
  };

  test("half steps catch it; whole steps would not", () => {
    const out = prismaticSweep(input)[0]!;
    expect(out.rows.map((r) => [r.k, r.cells])).toEqual([[0, 0], [0.5, 1], [1, 0], [1.5, 1], [2, 0]]);
    expect([out.overlapCells, out.overlapK]).toEqual([1, 0.5]);
    expect(out.closest!.mm).toBeLessThanOrEqual(0);
    expect(out.rows.filter((r) => r.cells === 0).map((r) => r.mm)).toEqual([0, 0, 1]);
    const whole = prismaticSweep({ ...input, step: 1 })[0]!;
    expect(whole.overlapCells).toBe(0);
  });
});

describe("synthetic block: wall wholly inside the slide body", () => {
  // Every boundary cell of the slide is three cells from the wall, while body and wall
  // centres coincide inside; closest approach is the coincident pair, less one pitch.
  test("closest approach is -1 pitch, overlap 9 cells", () => {
    const W = 15, H = 15, meta = new Uint8Array(9 * 9).fill(BODY), wall = new Uint8Array(W * H);
    for (let j = 6; j < 9; j += 1) for (let i = 6; i < 9; i += 1) wall[j * W + i] = 1;
    const out = prismaticSweep({
      frame: { W, H, px: 1, x0: 0, y0: 0 },
      wall,
      step: 0.5,
      lanes: [{ name: "block", N: 1, Ls: 9, Ws: 9, slideY: 3, dir: 1, xLeft: () => 3, slide: { W: 9, H: 9, px: 1, x0: -4.5, y0: -4.5, meta } }],
    })[0]!;
    expect([out.overlapCells, out.overlapK, out.poses]).toEqual([9, 0, 1]);
    expect(out.closest).toEqual({ mm: -1, k: 0, slideAt: [6.5, 6.5], wallAt: [6.5, 6.5] });
  });
});
