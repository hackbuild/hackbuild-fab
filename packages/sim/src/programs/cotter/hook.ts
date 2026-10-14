// COTTER peg clip in side view (M02-T09), ported from hook_fit.py
// `hook_centreline`, `clip_poly` and `board` (designs/cotter/legacy/tools/
// hook_fit.py lines 13 to 42, lineage cotter.hook-fit/r5). A round rod in a
// round hole reduces to discs in the mid plane (the file's docstring), so
// the side view is the whole insertion problem.
//
// shapely's LineString.buffer(r, resolution=16) is the Minkowski sum of the
// centreline and a disc; here it is the union of the hulls of consecutive
// circle pairs, each circle a manifold CrossSection with bufferSegments
// sides. The two outlines differ at the vertex level only (the oracle golden
// holds shapely's area and bounds beside the port's). Every dimension comes
// in through ClipConstants, read from profile hook.* and hookFit.* rows.
//
// The closed form that gives d, Rb and sweep from hole and board
// (`design_full`, lines 93 to 100) is ported once, as mech/hook-rule in
// @hackbuild/constraints, which sim may not import (tools/tiers.json); a
// case therefore carries its dims, and the oracle golden checks them.

import type { CrossSection, SimplePolygon } from "manifold-3d";
import { kernel, loadManifold, scope } from "@hackbuild/mesh";
import type { Vec2 } from "@hackbuild/spec";

/** Hook dims of one clip, as design_full returns them. */
export interface HookDims {
  /** Rod diameter, mm. */
  readonly d: number;
  /** Bend radius of the centreline, mm. */
  readonly Rb: number;
  /** Arc sweep, deg. */
  readonly sweep: number;
  /** Straight tail after the arc, mm. */
  readonly ext: number;
  /** Run behind the board back face before the bend, mm. */
  readonly gap: number;
}

/** Clip and board constants, each a profile row (ids in CLIP_CONSTANT_IDS). */
export interface ClipConstants {
  readonly pegPitch: number;
  readonly runFront: number;
  readonly arcSegments: number;
  readonly bufferSegments: number;
  readonly stubLenMax: number;
  readonly spineDepth: number;
  readonly spineHeadOver: number;
  readonly spineDrop: number;
  readonly boardRowsLo: number;
  readonly boardRowsHi: number;
  readonly boardInset: number;
  readonly boardReach: number;
}

/** The profile constant id behind each ClipConstants field. */
export const CLIP_CONSTANT_IDS: { readonly [K in keyof ClipConstants]: string } = {
  pegPitch: "hook.pegPitch",
  runFront: "hook.runFront",
  arcSegments: "hook.arcSegments",
  bufferSegments: "hook.bufferSegments",
  stubLenMax: "hook.stubLenMax",
  spineDepth: "hook.spineDepth",
  spineHeadOver: "hook.spineHeadOver",
  spineDrop: "hook.spineDrop",
  boardRowsLo: "hookFit.boardRows.lo",
  boardRowsHi: "hookFit.boardRows.hi",
  boardInset: "hookFit.boardInset",
  boardReach: "hookFit.boardReach",
};

const rad = (deg: number): number => (deg * Math.PI) / 180;

/** hook_centreline: straight run through the board, an arc turning up behind it, a straight tail. */
export function hookCentreline(tb: number, dims: HookDims, c: Pick<ClipConstants, "runFront" | "arcSegments">): Vec2[] {
  const { gap, Rb, sweep, ext } = dims;
  const n = c.arcSegments;
  const x0 = -(tb + gap);
  const pts: Vec2[] = [[c.runFront, 0], [x0, 0]];
  const cx = x0;
  const cy = Rb;
  for (let k = 1; k <= n; k++) {
    const a = (rad(sweep) * k) / n;
    pts.push([cx - Rb * Math.sin(a), cy - Rb * Math.cos(a)]);
  }
  const a = rad(sweep);
  const tx = -Math.cos(a);
  const ty = Math.sin(a);
  const last = pts[pts.length - 1]!;
  pts.push([last[0] + tx * ext, last[1] + ty * ext]);
  return pts;
}

export interface ClipInfo {
  /** Rod radius, mm. */
  readonly r: number;
  /** End of the tail, mm. */
  readonly tip: Vec2;
  /** Highest point of the rod at the tip, mm: tip y + r. */
  readonly top: number;
  /** Stub length, mm. */
  readonly sl: number;
  readonly cl: readonly Vec2[];
}

export interface ClipSection {
  /** The clip outline as CrossSection polygons. */
  readonly polygons: SimplePolygon[];
  /** mm2 (computed). */
  readonly area: number;
  /** [minX, minY, maxX, maxY], mm (computed). */
  readonly bounds: readonly [number, number, number, number];
  readonly info: ClipInfo;
}

/** A polyline swept by a disc: the union of hulls of consecutive circles (round caps and joins). */
function sweptDisc(pts: readonly Vec2[], r: number, segments: number): CrossSection {
  const CS = kernel().CrossSection;
  const circles = pts.map(([x, y]) => CS.circle(r, segments).translate(x, y));
  const links = circles.slice(1).map((c, i) => CS.hull([circles[i]!, c]));
  return CS.union(links);
}

const rect = (x0: number, y0: number, x1: number, y1: number): SimplePolygon => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

const boundsOf = (cs: CrossSection): [number, number, number, number] => {
  const b = cs.bounds();
  return [b.min[0], b.min[1], b.max[0], b.max[1]];
};

/** clip_poly: rod along the centreline, stub one pitch below, spine box in front of the board. */
export async function clipSection(tb: number, dims: HookDims, c: ClipConstants): Promise<ClipSection> {
  await loadManifold();
  const r = dims.d / 2;
  const cl = hookCentreline(tb, dims, c);
  const sl = Math.min(tb, c.stubLenMax);
  const rs = r;
  return scope(() => {
    const CS = kernel().CrossSection;
    const rod = sweptDisc(cl, r, c.bufferSegments);
    const stub = sweptDisc([[c.runFront, -c.pegPitch], [-(sl - rs), -c.pegPitch]], rs, c.bufferSegments);
    const spine = new CS([rect(0, -c.pegPitch - c.spineDrop, c.spineDepth + c.spineHeadOver, r)], "Positive");
    const g = CS.union([rod, stub, spine]);
    const tip = cl[cl.length - 1]!;
    return { polygons: g.toPolygons(), area: g.area(), bounds: boundsOf(g), info: { r, tip, top: tip[1] + r, sl, cl } };
  });
}

export interface BoardSection {
  /** The board less its holes, inset by boardInset, as CrossSection polygons. */
  readonly polygons: SimplePolygon[];
  /** mm2 (computed). */
  readonly area: number;
  readonly bounds: readonly [number, number, number, number];
}

/** board, inset: the board of thickness tb, y from -boardReach to boardReach less the holes of rows boardRowsLo to boardRowsHi, shrunk by boardInset. */
export async function boardSection(tb: number, hole: number, c: ClipConstants): Promise<BoardSection> {
  await loadManifold();
  return scope(() => {
    const CS = kernel().CrossSection;
    const ys: number[] = [];
    for (let k = c.boardRowsLo; k <= c.boardRowsHi; k++) ys.push(k * c.pegPitch);
    const edges = [-c.boardReach, ...ys.flatMap((y) => [y - hole / 2, y + hole / 2]), c.boardReach];
    const boxes: SimplePolygon[] = [];
    for (let i = 0; i < edges.length; i += 2) boxes.push(rect(-tb, edges[i]!, 0, edges[i + 1]!));
    const inset = new CS(boxes, "Positive").offset(-c.boardInset, "Miter");
    return { polygons: inset.toPolygons(), area: inset.area(), bounds: boundsOf(inset) };
  });
}
