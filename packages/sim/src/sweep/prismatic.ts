// Prismatic raster sweep (M02-T10), ported from SASH `runCheck`
// (src/part2.js lines 825 to 840 inside designs/sash/legacy/sash-src.zip,
// lineage sash.run-check/part2). A slide raster moves along its lane in the
// design frame; at every sampled position k the slide body cells (meta 1)
// are mapped into the wall raster by cell centre and floor, and the cells
// that land on wall are counted. The worst count and the first k that
// reaches it are kept, as the bench keeps them.
//
// Closest approach is new here (SASH never computed it): at each k, the
// smallest distance between a slide body cell centre and a wall cell centre,
// less half a cell pitch on each side. It is exact over the two cell sets
// when both rasters share one pitch. Take the closest pair s, w with offset
// v. If |v| is at most half a pitch on both axes, s lands in w's cell, which
// the overlap pass measures. Otherwise one axis has |v| over half a pitch,
// and a step of one pitch along it brings either cell strictly nearer the
// other; the pair is closest only if neither step stays in its set, so both
// are boundary cells (a 4-neighbour outside the set), which the boundary pass
// searches.
//
// The sim measures and never decides: counts and distances are returned and
// the caller's declared expectation turns them into a verdict.

import { commandError } from "@hackbuild/spec";

/** Raster frame: cell (i, j) has its centre at x0 + (i + 0.5) px, y0 + (j + 0.5) px, mm. */
export interface RasterFrame {
  /** Columns, count. */
  readonly W: number;
  /** Rows, count. */
  readonly H: number;
  /** Cell pitch, mm. */
  readonly px: number;
  readonly x0: number;
  readonly y0: number;
}

/** A slide raster in its surface frame (centred on the nominal rect), with SASH meta codes per cell. */
export interface SlideRaster extends RasterFrame {
  /** 0 air, 1 body, 2 beam and bump, 3 tab (composeSlide, part2.js:571 to 640). */
  readonly meta: Uint8Array;
}

export interface PrismaticLane {
  readonly name: string;
  /** Detent positions, count. */
  readonly N: number;
  /** Slide length and width, mm. */
  readonly Ls: number;
  readonly Ws: number;
  /** Design y of the slide's notch edge, mm. */
  readonly slideY: number;
  /** +1 when the slide frame y runs up the design frame, -1 when down. */
  readonly dir: 1 | -1;
  /** Design x of the slide's left corner at position k, mm. */
  readonly xLeft: (k: number) => number;
  readonly slide: SlideRaster;
}

export interface PrismaticInput {
  /** Frame of the wall raster (the shell front grid). */
  readonly frame: RasterFrame;
  /** Wall raster, nonzero where the shell wall is solid, W x H row-major. */
  readonly wall: Uint8Array;
  readonly lanes: readonly PrismaticLane[];
  /** Position increment along the travel, in detent pitches. */
  readonly step: number;
}

export type Point2 = readonly [number, number];

export interface PrismaticClosest {
  /** Closest approach, mm (computed); 0 or less where cells touch or overlap. */
  readonly mm: number;
  /** Position where it occurs, in detent pitches. */
  readonly k: number;
  /** Slide body cell centre and wall cell centre of the closest pair, design frame, mm. */
  readonly slideAt: Point2;
  readonly wallAt: Point2;
}

export interface PrismaticRow {
  readonly k: number;
  /** Slide body cells on wall cells, count (computed). */
  readonly cells: number;
  /** Closest approach at this k, mm (computed); Infinity when the wall raster is empty. */
  readonly mm: number;
}

export interface PrismaticLaneResult {
  readonly name: string;
  /** Positions evaluated, count. */
  readonly poses: number;
  /** Worst overlap over the travel, cells (computed), and the first k that reaches it. */
  readonly overlapCells: number;
  readonly overlapK: number;
  /** Smallest closest approach over the travel; null when the wall raster is empty. */
  readonly closest: PrismaticClosest | null;
  readonly rows: readonly PrismaticRow[];
}

const BODY = 1;
const BUCKET = 8;

function schema(path: string, got: unknown, expected: string): never {
  throw commandError({ code: "E_SCHEMA", path, got, expected, hint: `prismatic sweep input ${path} is ${String(got)}, expected ${expected}`, record: "viewer-sim" });
}

function checkFrame(f: RasterFrame, path: string, cells: number): void {
  if (!(Number.isInteger(f.W) && f.W > 0 && Number.isInteger(f.H) && f.H > 0)) schema(path, `${f.W} x ${f.H}`, "positive integer columns and rows");
  if (!(f.px > 0)) schema(`${path}.px`, f.px, "a pitch over 0 mm");
  if (cells !== f.W * f.H) schema(path, cells, `${f.W * f.H} cells`);
}

/** Cells of set `inSet` with a 4-neighbour outside it or outside the raster, as row-major indices. */
function boundary(W: number, H: number, inSet: (p: number) => boolean): number[] {
  const out: number[] = [];
  for (let j = 0; j < H; j += 1) {
    for (let i = 0; i < W; i += 1) {
      const p = j * W + i;
      if (!inSet(p)) continue;
      if (i === 0 || j === 0 || i === W - 1 || j === H - 1 || !inSet(p - 1) || !inSet(p + 1) || !inSet(p - W) || !inSet(p + W)) out.push(p);
    }
  }
  return out;
}

interface WallIndex {
  readonly nbx: number;
  readonly nby: number;
  readonly size: number;
  readonly buckets: readonly (readonly number[])[];
}

/** Wall boundary cell centres binned into square buckets of BUCKET cells, as flat x, y pairs. */
function indexWall(frame: RasterFrame, wall: Uint8Array): WallIndex {
  const { W, H, px, x0, y0 } = frame;
  const nbx = Math.ceil(W / BUCKET), nby = Math.ceil(H / BUCKET);
  const buckets: number[][] = Array.from({ length: nbx * nby }, () => []);
  for (const p of boundary(W, H, (q) => wall[q] !== 0)) {
    const i = p % W, j = (p - i) / W;
    buckets[Math.floor(j / BUCKET) * nbx + Math.floor(i / BUCKET)]!.push(x0 + (i + 0.5) * px, y0 + (j + 0.5) * px);
  }
  return { nbx, nby, size: BUCKET * px, buckets };
}

interface Best {
  d2: number;
  sx: number;
  sy: number;
  wx: number;
  wy: number;
}

/** Tighten best with the wall boundary centres nearest (x, y), searching bucket rings outward. */
function nearestBoundary(index: WallIndex, frame: RasterFrame, x: number, y: number, best: Best): void {
  const { nbx, nby, size, buckets } = index;
  const bx = Math.floor((x - frame.x0) / size), by = Math.floor((y - frame.y0) / size);
  const maxR = Math.max(bx, by, nbx - 1 - bx, nby - 1 - by);
  for (let r = 0; r <= maxR; r += 1) {
    const reach = (r - 1) * size;
    if (reach > 0 && reach * reach > best.d2) return;
    for (let cy = by - r; cy <= by + r; cy += 1) {
      if (cy < 0 || cy >= nby) continue;
      const edge = cy === by - r || cy === by + r;
      for (let cx = bx - r; cx <= bx + r; cx += edge ? 1 : 2 * r) {
        if (cx >= 0 && cx < nbx) {
          const b = buckets[cy * nbx + cx]!;
          for (let q = 0; q < b.length; q += 2) {
            const dx = b[q]! - x, dy = b[q + 1]! - y, d2 = dx * dx + dy * dy;
            if (d2 < best.d2) Object.assign(best, { d2, sx: x, sy: y, wx: b[q]!, wy: b[q + 1]! });
          }
        }
        if (r === 0) break;
      }
    }
  }
}

function sweepLane(input: PrismaticInput, index: WallIndex, lane: PrismaticLane, path: string): PrismaticLaneResult {
  const { frame, wall, step } = input;
  const { W, H, px, x0, y0 } = frame;
  const sg = lane.slide;
  checkFrame(sg, `${path}.slide`, sg.meta.length);
  if (sg.px !== px) schema(`${path}.slide.px`, sg.px, `the wall pitch ${px} mm`);
  const body: number[] = [];
  for (let p = 0; p < sg.meta.length; p += 1) if (sg.meta[p] === BODY) body.push(p);
  const edge = boundary(sg.W, sg.H, (p) => sg.meta[p] === BODY);
  const halfPitches = (sg.px + px) / 2;
  const rows: PrismaticRow[] = [];
  let worst = 0, worstK = 0;
  let closest: PrismaticClosest | null = null;
  for (let k = 0; k <= lane.N - 1; k += step) {
    const ox = lane.xLeft(k) + lane.Ls / 2, oy = lane.slideY + (lane.dir * lane.Ws) / 2;
    const best: Best = { d2: Infinity, sx: 0, sy: 0, wx: 0, wy: 0 };
    let n = 0;
    for (const p of body) {
      const i = p % sg.W, j = (p - i) / sg.W;
      const x = ox + sg.x0 + (i + 0.5) * sg.px, y = oy + sg.y0 + (j + 0.5) * sg.px;
      const ii = Math.floor((x - x0) / px), jj = Math.floor((y - y0) / px);
      if (ii < 0 || jj < 0 || ii >= W || jj >= H || !wall[jj * W + ii]) continue;
      n += 1;
      const wx = x0 + (ii + 0.5) * px, wy = y0 + (jj + 0.5) * px, dx = wx - x, dy = wy - y, d2 = dx * dx + dy * dy;
      if (d2 < best.d2) Object.assign(best, { d2, sx: x, sy: y, wx, wy });
    }
    for (const p of edge) {
      const i = p % sg.W, j = (p - i) / sg.W;
      nearestBoundary(index, frame, ox + sg.x0 + (i + 0.5) * sg.px, oy + sg.y0 + (j + 0.5) * sg.px, best);
    }
    if (n > worst) {
      worst = n;
      worstK = k;
    }
    const mm = Math.sqrt(best.d2) - halfPitches;
    rows.push({ k, cells: n, mm });
    if (Number.isFinite(mm) && (closest === null || mm < closest.mm)) closest = { mm, k, slideAt: [best.sx, best.sy], wallAt: [best.wx, best.wy] };
  }
  return { name: lane.name, poses: rows.length, overlapCells: worst, overlapK: worstK, closest, rows };
}

/** Sweep each lane's slide through the wall raster; one result per lane, in lane order. */
export function prismaticSweep(input: PrismaticInput): PrismaticLaneResult[] {
  checkFrame(input.frame, "frame", input.wall.length);
  if (!(input.step > 0 && input.step <= 1)) schema("step", input.step, "a fraction of a pitch over 0 and at most 1");
  const index = indexWall(input.frame, input.wall);
  return input.lanes.map((lane, i) => sweepLane(input, index, lane, `lanes[${i}]`));
}
