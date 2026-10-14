// The buried trace layers of a routed part, per net (M05-T10, D-084,
// D-085, C-06). Port of PIP's conductor pass, pip-controller src/model.js
// lines 27 and 33 to 48 at b137deb (vendored in designs/pip/legacy/src,
// lineage pip.model/pip-controller-b137deb-trace-layer), with the stroke of
// src/geom.js lines 100 to 114 and the circle of lines 77 to 82.
//
// Each trace layer of a net is one 2D region: the strokes of its polylines
// on that layer, its stubs, and a disc at every terminal post and via,
// unioned and then closed by +route.regionClose and -route.regionClose with
// Miter joins, so tangent pieces fuse instead of pinching (the CHK-NET-11
// rule; PIP's sweep found a union of capsules leaving lumps). A post or via
// whose radius lies within route.postSep of half the trace width moves to
// w/2 + route.postSep (model.js line 27), because a round cap and a post of
// nearly one radius on one centre leave sliver triangles.
//
// Bleed (D-084) is applied here and only here: the drawn trace is the
// routed width less the bleed, each region edge moved in by half of it
// after the close. The profile default is 0 with tier inferred, so a PIP
// stack emits 1.40 mm traces (published PIP draws no bleed; the 0.15 bleed
// and 1.25 drawn trace of unpublished HAFT are retired, PROFILE.md 6.2).
//
// The regions are computed off the grid, as PIP computes them: every
// stroke, disc, union and close runs on unsnapped coordinates and the
// emitted rings are not snapped. The mesh kernel snaps a ring once, when it
// meshes it (D-054). Snapping here moved the PIP default stack by 0.148
// mm3 (869.836 against the original's 869.688, computed): a 1.40 mm trace
// on PIP's 0.5 mm route grid has its edges at 0.7 mm off the centre line,
// 716.8 grid steps, and the snap rounds both edges outward. Each region is
// placed on its band of the buried stack (traceStack, layout.js lines 166
// to 171 on the profile stack rows, D-085). Posts run from half a layer into trace
// layer 1 up to half a layer under the top of layer 2 for a via, and to
// route.postOverlap past the pad plane for a terminal (model.js lines 46
// and 48). Points of every circle come from the committed unit-circle
// table (D-175), at PIP's half-step rotation, so no vertex lands on a
// shared support line.

import type { Mm, Ring, Vec2 } from "@hackbuild/spec";
import { commandError } from "@hackbuild/spec";
import { constantMm, ringArea2, unitCircle, type ConstantSource, type Geom, type Section } from "@hackbuild/geom";
import type { RouteNet, RoutedNet } from "../route/negotiated.js";

/** Section entry and exit off the grid: the emit computes PIP's own regions. */
const OFF_GRID = { snap: false } as const;

/** Profile constants the emit reads, mm. */
export const TRACE_LAYER_CONSTANTS = {
  /** model.js line 27: radius gap kept between a post and half the trace width. */
  postSep: "route.postSep",
  /** model.js lines 41 and 42: a post's layer disc is this wider than the post. */
  discPad: "route.discPad",
  /** model.js line 43: each region closed by +this then -this, Miter. */
  regionClose: "route.regionClose",
  /** model.js lines 8 and 48 (EZ): a terminal post runs this past the pad plane. */
  postOverlap: "route.postOverlap",
} as const;

/** Profile stack rows the buried stack reads, mm (PROFILE.md 6.1, D-085). */
export const TRACE_STACK_CONSTANTS = {
  skin: "stack.skin",
  trace: "stack.trace",
  iso: "stack.iso",
  overL2: "stack.overL2",
} as const;

/** The buried stack in z, mm from the bed: two trace layers, the pad plane and the floor. */
export interface TraceStack {
  readonly l1: readonly [Mm, Mm];
  readonly l2: readonly [Mm, Mm];
  /** The pad plane over layer 2, iso above it, up to the floor. */
  readonly pads: readonly [Mm, Mm];
  /** The lowest button floor; pads are flush here. */
  readonly floor: Mm;
  /** Layer height the posts step half of, mm (the machine preset). */
  readonly layer: Mm;
}

/**
 * layout.js lines 166 to 171 at b137deb on the profile stack rows: layer 1
 * on the skin, iso over it, layer 2, then overL2 (iso plus the pad floor)
 * up to the floor. PIP defaults give L1 0.72 to 1.44, L2 2.40 to 3.12,
 * pads 4.08 to 4.80 (computed).
 */
export function traceStack(profile: ConstantSource, layer: Mm): TraceStack {
  if (!(Number.isFinite(layer) && layer > 0)) throw commandError({ code: "E_SCHEMA", path: "/layer", got: layer, expected: "a positive layer height in mm", hint: "pass the machine preset layer height" });
  const c = (id: string): Mm => constantMm(profile, id);
  const skin = c(TRACE_STACK_CONSTANTS.skin), trace = c(TRACE_STACK_CONSTANTS.trace);
  const iso = c(TRACE_STACK_CONSTANTS.iso), overL2 = c(TRACE_STACK_CONSTANTS.overL2);
  if (!(overL2 > iso)) {
    throw commandError({ code: "E_SCHEMA", path: `/constants/${TRACE_STACK_CONSTANTS.overL2}`, got: overL2, expected: `more than stack.iso ${iso} mm`, hint: "overL2 is the isolation plus the pad floor over layer 2" });
  }
  const l1 = [skin, skin + trace] as const;
  const l2 = [l1[1] + iso, l1[1] + iso + trace] as const;
  const pads = [l2[1] + iso, l2[1] + overL2] as const;
  return { l1, l2, pads, floor: pads[1], layer };
}

/** Construction values of PIP's geometry, not physical lengths (src/geom.js and src/model.js at b137deb). */
export const TRACE_LAYER_GEOMETRY = {
  /** geom.js line 103: half width of the thin spine a stroke offsets from, mm. */
  spineHalf: 0.04,
  /** geom.js line 104: consecutive stroke points closer than this collapse, mm. */
  dedupe: 1e-4,
  /** model.js line 9 (GEO.SEG.n = P.seg || 40, PIP's default seg 40): the segsFor scale. */
  segScale: 40,
  /** model.js lines 41 and 42: sides of a post or via disc on a layer. */
  discSides: 24,
  /** model.js lines 46 and 48 (cyl(..., 20)): sides of a post or via. */
  postSides: 20,
  /** model.js line 43: Miter limit of the close. */
  miterLimit: 2,
} as const;

/** One post through the layers: a terminal or a via, as emitted. */
export interface TracePost {
  readonly kind: "terminal" | "via";
  readonly at: Vec2;
  /** The radius the router was given (terminal r, or route via), mm. */
  readonly r: Mm;
  /** The radius emitted after the postSep rule, mm. */
  readonly drawnR: Mm;
  /** True when the postSep rule moved it. */
  readonly moved: boolean;
  /** Bottom and top of the post, mm. */
  readonly z: readonly [Mm, Mm];
  /** The post's plan ring, postSides at half-step rotation, counter-clockwise, off the grid. */
  readonly ring: Ring;
}

/** One trace layer of one net: its region, as outer rings with their holes. */
export interface TraceLayer {
  readonly layer: 0 | 1;
  /** Band of the layer, mm (TraceStack l1 or l2). */
  readonly z: readonly [Mm, Mm];
  readonly regions: readonly { readonly outer: Ring; readonly holes: readonly Ring[] }[];
  /** Area of the emitted rings, mm2 (computed). */
  readonly areaMm2: number;
}

export interface TraceNet {
  readonly name: string;
  readonly layers: readonly [TraceLayer, TraceLayer];
  /** Terminal posts first, in terminal order, then vias in route order. */
  readonly posts: readonly TracePost[];
}

export interface TraceLayerInput {
  /** The router's nets, with polylines, stubs and vias. */
  readonly routed: readonly Pick<RoutedNet, "name" | "polys" | "stubs" | "vias">[];
  /** The route input's nets: terminal posts and their radii. */
  readonly nets: readonly RouteNet[];
  /** Routed trace width, mm (profile stack.traceWidth on the PIP stack). */
  readonly w: Mm;
  /** The router's via term, the via post radius before the postSep rule (PIP route.via), mm. */
  readonly via: Mm;
  /** Profile bleed for the (machine, material pair), mm; 0 by default (D-084). */
  readonly bleed: Mm;
  readonly stack: TraceStack;
}

/** geom.js line 72: PIP's segment count for a round of radius r. */
export function segsFor(r: Mm): number {
  const n = TRACE_LAYER_GEOMETRY.segScale;
  return Math.max(12, Math.min(96, Math.round(n * Math.sqrt(Math.max(r, 0.2) / 3))));
}

/** model.js line 27: a radius within postSep of w/2 moves to w/2 + postSep. */
export function postRadius(r: Mm, w: Mm, postSep: Mm): Mm {
  return Math.abs(r - w / 2) < postSep ? w / 2 + postSep : r;
}

/** geom.js lines 77 to 82: n points at half-step rotation, counter-clockwise, from the D-175 table. */
function discRing(r: Mm, at: Vec2, n: number): Ring {
  return Array.from({ length: n }, (_, i): Vec2 => {
    const [c, s] = unitCircle(2 * i + 1, 2 * n);
    return [at[0] + r * c, at[1] + r * s];
  });
}

/** geom.js lines 100 to 114: a polyline stroked at width w with round joins and caps from one Round offset of a thin spine. */
export function stroke(geom: Geom, pts: readonly Vec2[], w: Mm): Section {
  const { spineHalf: e, dedupe } = TRACE_LAYER_GEOMETRY;
  const clean: Vec2[] = [pts[0]!];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]!, last = clean[clean.length - 1]!;
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > dedupe) clean.push(p);
  }
  if (clean.length === 1) return geom.fromRings([discRing(w / 2, clean[0]!, segsFor(w / 2))], OFF_GRID);
  const parts: Section[] = [];
  for (let i = 1; i < clean.length; i++) {
    const a = clean[i - 1]!, b = clean[i]!;
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    const ux = (dx / L) * e, uy = (dy / L) * e, nx = -uy, ny = ux;
    // geom.js GEO.poly: counter-clockwise, as Positive fill needs.
    parts.push(geom.fromOutline([[a[0] - ux + nx, a[1] - uy + ny], [a[0] - ux - nx, a[1] - uy - ny], [b[0] + ux - nx, b[1] + uy - ny], [b[0] + ux + nx, b[1] + uy + ny]], [], OFF_GRID));
  }
  return geom.union(parts).offset(w / 2 - e, { join: "Round", miterLimit: 2, segments: segsFor(w / 2) + 8 });
}

/**
 * The trace layers and posts of every routed net. E_REF when a routed net
 * has no terminals in `nets`; E_SCHEMA on a width, via or bleed that is not
 * a length, or a bleed that would close the trace.
 */
export function emitTraceLayers(geom: Geom, input: TraceLayerInput, profile: ConstantSource): TraceNet[] {
  const { w, via, bleed } = input;
  for (const [k, v] of [["w", w], ["via", via]] as const) {
    if (!(Number.isFinite(v) && v > 0)) throw commandError({ code: "E_SCHEMA", path: `/${k}`, got: v, expected: "a positive length in mm", hint: `give the trace layer emit a positive ${k}` });
  }
  if (!(Number.isFinite(bleed) && bleed >= 0 && bleed < w)) {
    throw commandError({ code: "E_SCHEMA", path: "/bleed", got: bleed, expected: `a length in mm from 0 to under the ${w} mm trace`, hint: "read bleed from profile.bleed(machine, a, b); the default is 0 (D-084)" });
  }
  const postSep = constantMm(profile, TRACE_LAYER_CONSTANTS.postSep);
  const discPad = constantMm(profile, TRACE_LAYER_CONSTANTS.discPad);
  const close = constantMm(profile, TRACE_LAYER_CONSTANTS.regionClose);
  const overlap = constantMm(profile, TRACE_LAYER_CONSTANTS.postOverlap);
  const { stack } = input;
  const postFoot = stack.l1[0] + stack.layer / 2;
  const viaZ = [postFoot, stack.l2[1] - stack.layer / 2] as const;
  const termZ = [postFoot, stack.floor + overlap] as const;
  const { discSides, postSides, miterLimit } = TRACE_LAYER_GEOMETRY;
  const postRing = (r: Mm, at: Vec2): Ring => discRing(r, at, postSides);
  const termsOf = new Map(input.nets.map((n) => [n.name, n.terms] as const));

  return input.routed.map((rn, k): TraceNet => {
    const terms = termsOf.get(rn.name);
    if (terms === undefined) {
      throw commandError({ code: "E_REF", path: `/routed/${k}/name`, got: rn.name, didYouMean: [], hint: `routed net ${rn.name} has no terminals in the route input; emit from the same input the router read` });
    }
    const posts: TracePost[] = [
      ...terms.map((t): TracePost => {
        const drawnR = postRadius(t.r, w, postSep);
        return { kind: "terminal", at: [t.x, t.y], r: t.r, drawnR, moved: drawnR !== t.r, z: termZ, ring: postRing(drawnR, [t.x, t.y]) };
      }),
      ...rn.vias.map((v): TracePost => {
        const drawnR = postRadius(via, w, postSep);
        return { kind: "via", at: [v[0], v[1]], r: via, drawnR, moved: drawnR !== via, z: viaZ, ring: postRing(drawnR, [v[0], v[1]]) };
      }),
    ];
    const layerOf = (l: 0 | 1): TraceLayer => {
      const cs: Section[] = rn.polys[l].filter((p) => p.length > 1).map((p) => stroke(geom, p, w));
      for (const st of rn.stubs) cs.push(stroke(geom, st, w));
      for (const p of posts) cs.push(geom.fromRings([discRing(p.drawnR + discPad, p.at, discSides)], OFF_GRID));
      let u = geom.union(cs)
        .offset(close, { join: "Miter", miterLimit })
        .offset(-close, { join: "Miter", miterLimit });
      if (bleed > 0) u = u.offset(-bleed / 2, { join: "Miter", miterLimit });
      const regions = u.components(OFF_GRID);
      // Area of the rings as emitted, off the grid.
      const areaMm2 = regions.reduce((t, g) => t + (ringArea2(g.outer) + g.holes.reduce((h, r) => h + ringArea2(r), 0)) / 2, 0);
      return { layer: l, z: l === 0 ? stack.l1 : stack.l2, regions, areaMm2 };
    };
    return { name: rn.name, layers: [layerOf(0), layerOf(1)], posts };
  });
}
