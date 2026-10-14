// designs/sprue/build.ts
// SPRUE's two colour object (knowledge/designs/sprue.md 4.1): a white body
// and a black inlay that sum to the blank, art on both faces and a stepped
// top edge. The slab plan is SPRUE.build (legacy sprue.html lines 668 to
// 717, lineage sprue.bench/design-build) on vector outlines, as sprue.py's
// build_object (lines 487 to 525) runs it: thickness snapped to whole
// layers, inlay layers clamped to half of them, the bed-face art mirrored in
// X (D-063), a bottom slab, a core, and one top slab per inlay layer whose
// blank steps in by breakStep x j over the last breakL layers.
//
// Every slab is a prism (D-053) and each colour is one csg body over its
// slabs; the mesh kernel unions, partitions and checks them. The browser
// route (text faces, traced masks) is the package parity in
// test/parity.entry.ts: under D-178 a build.ts imports only spec, so the
// raster faces of @hackbuild/inlay reach the design through that page and
// the vector art here is sprue.py's lightning bolt.
//
// The blank outline functions are exported for the parity page, which
// rasterises the same outline the mesh uses: one copy of SPRUE's pick.

import { commandError, defineBuild, qualify, type FaceFrame, type Metric, type Ring, type ShapeDecl } from "@hackbuild/spec";
import { chase, type SprueParams } from "./chase";

type P2 = readonly [number, number];

/** Pick outline, right side at scale 1, mm, tip at the bottom (sprue.html S.pickOutline line 382; sprue.py pick_blank line 445). */
export const PICK_RIGHT: readonly P2[] = [
  [0, 15.35], [5.0, 14.9], [9.5, 12.6], [12.3, 8.6], [12.9, 4.0], [12.2, -1.2], [10.2, -6.2], [7.0, -10.6], [3.4, -13.9], [0, -15.35],
];

/** Catmull-Rom subdivisions per span (sprue.html S.catmull line 365) and coin polygon sides for the browser mask (S.circleOutline line 387). */
export const CATMULL_SUBDIV = 12;
export const COIN_MASK_SIDES = 192;

/** sprue.py motif_bolt (line 312): the pick's lightning bolt, mm, before its 1.22 x 1.18 scale. */
export const BOLT: readonly P2[] = [[2.2, 7.6], [-3.6, -0.6], [-0.6, -0.6], [-2.6, -8.6], [4.1, 0.6], [1.1, 0.6], [3.2, 7.6]];
export const BOLT_SCALE: P2 = [1.22, 1.18];

/** Closed Catmull-Rom through pts (sprue.html S.catmull, lines 364 to 377). */
export function catmullClosed(pts: readonly P2[], subdiv: number = CATMULL_SUBDIV): [number, number][] {
  const n = pts.length, out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!, p1 = pts[i]!, p2 = pts[(i + 1) % n]!, p3 = pts[(i + 2) % n]!;
    for (let s = 0; s < subdiv; s++) {
      const t = s / subdiv, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  return out;
}

/** The 351 pick, about 25.8 x 30.7 mm at scale 1, counter-clockwise (sprue.html S.pickOutline, lines 380 to 385). */
export function pickOutline(scale: number): Ring {
  const left = PICK_RIGHT.slice(1, -1).reverse().map((p): P2 => [-p[0], p[1]]);
  return catmullClosed([...PICK_RIGHT, ...left]).map((p): P2 => [p[0] * scale, p[1] * scale]);
}

/**
 * SPRUE's coin polygon (S.circleOutline, lines 387 to 391), Math.cos and
 * Math.sin as SPRUE has them. Only the browser parity rasterises it; the
 * mesh takes Author ring.circle from the unit-circle table (D-175).
 */
export function coinMaskOutline(r: number, n: number = COIN_MASK_SIDES): Ring {
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    out.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return out;
}

/** The outline SPRUE rasterises for the blank (blankOutline, sprue.html line 996). */
export function blankOutline(p: Pick<SprueParams, "kind" | "coinD" | "pickScale">): Ring {
  return p.kind === "coin" ? coinMaskOutline(p.coinD / 2) : pickOutline(p.pickScale);
}

/** The keyring hole centre over the blank centre, mm (holeSpec, sprue.html line 1003). */
export const holeYOf = (p: Pick<SprueParams, "holeY" | "pickScale">): number => p.holeY * p.pickScale;

/** Signed area, mm2, positive counter-clockwise. */
function area(r: Ring): number {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const q = r[i]!, s = r[(i + 1) % r.length]!;
    a += q[0] * s[1] - s[0] * q[1];
  }
  return a / 2;
}

/**
 * A convex ring moved in by d, mm, returned counter-clockwise (SPRUE's
 * pick runs clockwise and is read reversed): the ring clipped by every
 * edge's half-plane shifted d inward, which for a convex outline is its
 * erosion by a disc of radius d with mitred corners. SPRUE erodes the blank
 * mask by the same distance (S.erode) and sprue.py buffers it
 * (blank.buffer(-inset)). Edges shorter than the inset drop out at the
 * pick's tip. Refused when the outline is not convex or nothing is left.
 */
export function insetConvex(input: Ring, d: number): Ring {
  const ring = area(input) < 0 ? [...input].reverse() : input;
  const refuse = (got: unknown, what: string): never => {
    throw commandError({ code: "E_KERNEL", path: "/margin", got, record: "mesh-kernel", hint: `${what}; the blank inset needs a convex outline wider than twice the inset` });
  };
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[(i - 1 + n) % n]!, b = ring[i]!, c = ring[(i + 1) % n]!;
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) < 0) refuse(i, `the blank outline turns right at vertex ${i}`);
  }
  let poly: P2[] = [...ring];
  for (let i = 0; i < n && poly.length > 0; i++) {
    const a = ring[i]!, b = ring[(i + 1) % n]!;
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    // signed distance inside the shifted edge: cross(e, p - a) / |e| - d
    const side = (p: P2): number => (dx * (p[1] - a[1]) - dy * (p[0] - a[0])) / len - d;
    const out: P2[] = [];
    for (let j = 0; j < poly.length; j++) {
      const p = poly[j]!, q = poly[(j + 1) % poly.length]!;
      const sp = side(p), sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) {
        const t = sp / (sp - sq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    poly = out;
  }
  if (poly.length < 3 || !(area(poly) > 1e-9)) refuse(d, `nothing of the blank is left at an inset of ${d} mm`);
  return poly;
}

const prism = (outline: readonly Ring[], z: readonly [number, number]): ShapeDecl => ({ route: "prism", outline, z });
const csg = (op: "union" | "difference" | "intersection", of: readonly ShapeDecl[]): ShapeDecl => (of.length === 1 && op === "union" ? of[0]! : { route: "csg", op, of });

/** A slab of one colour: its shape at a z range and a key, equal for slabs SPRUE would merge. */
interface Slab {
  readonly key: string;
  readonly z0: number;
  readonly z1: number;
  readonly make: (z: readonly [number, number]) => ShapeDecl;
}

/** Consecutive slabs with one key and touching z merge (sprue.html:696 to 702). */
function merge(slabs: readonly Slab[]): Slab[] {
  const out: Slab[] = [];
  for (const s of slabs) {
    const last = out[out.length - 1];
    if (last !== undefined && last.key === s.key && Math.abs(last.z1 - s.z0) < 1e-9) out[out.length - 1] = { ...last, z1: s.z1 };
    else out.push(s);
  }
  return out;
}

export const build = defineBuild(chase, (p, k) => {
  const m = k.machine("ffc5p");
  const L = m.layerHeight;
  const coin = p.kind === "coin";
  const want = coin ? p.coinThk : p.pickThk;
  const n = Math.max(1, Math.round(want / L));
  const thk = n * L;
  const inlay = Math.max(0, Math.min(p.inlay, Math.floor(n / 2)));
  const D = inlay * L;
  if (inlay < p.inlay) {
    k.warn("CLAMP", `inlay layers ${p.inlay} clamped to ${inlay}, half of the ${n} layers of a ${thk.toFixed(2)} mm blank (computed)`, { param: "/inlay" });
  }
  if (Math.abs(m.firstLayer - L) > 1e-9) {
    k.warn("LAYER_GRID", `slabs sit on a uniform ${L} mm grid as sprue does; the ${m.id} first layer is ${m.firstLayer} mm, so slab tops sit ${(m.firstLayer - L).toFixed(2)} mm under the sliced tops (vendor preset)`);
  }
  const breakStep = coin ? p.breakStepCoin : p.breakStepPick;
  const R = p.coinD / 2;
  // Coin circles take SPRUE's side count (S.circleOutline, sprue.html:388) from the unit-circle table.
  const circle = (r: number): Ring => k.ring.circle(r, [0, 0], COIN_MASK_SIDES);
  const blank: Ring = coin ? circle(R) : pickOutline(p.pickScale);
  const hasHole = !coin && p.pickHole;
  const holeY = holeYOf(p);
  const holes: Ring[] = hasHole ? [k.ring.circle(p.holeD / 2, [0, holeY])] : [];
  const insetBlank = (d: number): Ring => (coin ? circle(R - d) : insetConvex(blank, d));

  // The art zone (geo, sprue.html:1024 to 1031) and the coin ring.
  const ringOn = coin && p.ring;
  const zoneOutline: Ring = coin ? circle(ringOn ? R - p.ringIn - p.ringW - p.keep : R - p.margin) : insetBlank(p.margin);
  const zone = (z: readonly [number, number]): ShapeDecl =>
    (hasHole ? csg("difference", [prism([zoneOutline], z), prism([k.ring.circle(p.holeD / 2 + p.keep, [0, holeY])], z)]) : prism([zoneOutline], z));
  const bolt = (mirror: boolean): Ring => {
    const r = BOLT.map((q): P2 => [q[0] * BOLT_SCALE[0] * (mirror ? -1 : 1), q[1] * BOLT_SCALE[1]]);
    return area(r) < 0 ? [...r].reverse() : r;
  };
  /** The black of one face at z: the art inside the zone, plus the coin ring; null when the face carries nothing. */
  const black = (art: "bolt" | "none", mirror: boolean): ((z: readonly [number, number]) => ShapeDecl) | null => {
    const parts: ((z: readonly [number, number]) => ShapeDecl)[] = [];
    if (art === "bolt") parts.push((z) => csg("intersection", [prism([bolt(mirror)], z), zone(z)]));
    if (ringOn) parts.push((z) => prism([circle(R - p.ringIn), circle(R - p.ringIn - p.ringW)], z));
    return parts.length === 0 ? null : (z) => csg("union", parts.map((f) => f(z)));
  };
  const front = black(p.front, false);
  const back = black(p.back, true);

  const white: Slab[] = [], dark: Slab[] = [];
  const whiteOf = (outline: Ring, cut: typeof front, key: string, z0: number, z1: number): Slab => ({
    key, z0, z1,
    make: (z) => (cut === null ? prism([outline, ...holes], z) : csg("difference", [prism([outline, ...holes], z), cut(z)])),
  });
  if (inlay > 0) {
    if (back !== null) dark.push({ key: "back", z0: 0, z1: D, make: back });
    white.push(whiteOf(blank, back, back === null ? "blank" : "blank-back", 0, D));
  }
  if (thk - 2 * D > 1e-6) white.push(whiteOf(blank, null, "blank", D, thk - D));
  for (let kk = 0; kk < inlay; kk++) {
    const z0 = thk - D + kk * L, z1 = z0 + L;
    const j = kk - (inlay - p.breakL) + 1;
    const inset = j > 0 ? breakStep * j : 0;
    const bk = inset > 0 ? insetBlank(inset) : blank;
    if (front !== null) dark.push({ key: "front", z0, z1, make: front });
    white.push(whiteOf(bk, front, `${inset > 0 ? `inset-${inset}` : "blank"}${front === null ? "" : "-front"}`, z0, z1));
  }
  const bodyOf = (slabs: readonly Slab[]): ShapeDecl => csg("union", merge(slabs).map((s) => s.make([s.z0, s.z1])));
  const bodies = [k.body("white", { role: "body", slot: 1, base: bodyOf(white) })];
  if (dark.length > 0) bodies.push(k.body("black", { role: "art", slot: 2, base: bodyOf(dark) }));

  const q = qualify([]);
  const metrics: Metric[] = [
    { id: "sprue.thickness", value: Number(thk.toFixed(6)), unit: "mm", ...q, note: "thickness snapped to whole layers", drivenBy: [coin ? "/coinThk" : "/pickThk"], gate: "informational", group: "sprue" },
    { id: "sprue.layers", value: n, unit: "count", ...q, note: "layers through the blank", drivenBy: [coin ? "/coinThk" : "/pickThk"], gate: "informational", group: "sprue" },
    { id: "sprue.inlayDepth", value: Number(D.toFixed(6)), unit: "mm", ...q, note: "black depth on each face, inlay layers x layer height", drivenBy: ["/inlay"], gate: "informational", group: "sprue" },
  ];
  const top: FaceFrame = { origin: [0, 0, thk], normal: [0, 0, 1], u: [1, 0, 0] };
  const bed: FaceFrame = { origin: [0, 0, 0], normal: [0, 0, -1], u: [-1, 0, 0] };
  return k.part({
    id: p.kind, name: coin ? "sprue coin" : "sprue pick", process: "fdm", machine: "ffc5p",
    bodies, features: [], metrics, assertions: [],
    faces: [k.face("white.top", top), k.face("white.bed", bed)],
  });
});
