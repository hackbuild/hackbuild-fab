// Copper connectivity from shapes (M08-T08 step 2, M08-T12 step 7): the one
// implementation the KiCad readback (CHK-BRD-22) and the island and short
// check (CHK-BRD-21) share. Items are pads (rect as its polygon, oval as
// its rect, circle as a disc), track segments as capsules and vias as
// discs, each on its copper layers; two items of one net that touch on a
// shared layer are one island. A pour joins every item of its net whose
// centre or end lies inside the pour outline and outside every keepout on
// its layer, which stands for the fill a fab or KiCad computes: the pour
// outline is drawn before its clearance, so a pour never counts as copper
// against another net. Two items of different named nets that touch on a
// shared layer are a short.

import type { BoardRecord, CopperLayer, RecordPad } from "@hackbuild/spec";

export type Pt = readonly [number, number];
export type Shape = { readonly kind: "pt"; readonly p: Pt; readonly r: number }
  | { readonly kind: "seg"; readonly a: Pt; readonly b: Pt; readonly r: number }
  | { readonly kind: "poly"; readonly pts: readonly Pt[]; readonly r: 0 };

/** One copper item: its net ("" for netless copper), the layers it sits on, its shape, and a name for messages. */
export interface CopperItem {
  readonly net: string;
  readonly layers: readonly string[];
  readonly shape: Shape;
  /** Pad key "ref.pin" for a pad, absent for tracks and vias. */
  readonly key?: string;
  /** What the item is, for messages: "pad U1.5V", "via at (9.80, 20.00)", "track 5V B.Cu". */
  readonly name: string;
}

export interface CopperPour {
  readonly net: string;
  readonly layers: readonly string[];
  readonly pts: readonly Pt[];
}

export interface CopperKeepout {
  readonly layers: readonly string[];
  readonly pts: readonly Pt[];
}

/** Two shapes touch when their cores come within the sum of their radii plus this, mm. */
export const TOUCH_TOL_MM = 1e-6;

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const dot = (a: Pt, b: Pt): number => a[0] * b[0] + a[1] * b[1];
const len = (a: Pt): number => Math.hypot(a[0], a[1]);

function ptSeg(p: Pt, a: Pt, b: Pt): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  return len(sub(p, [a[0] + ab[0] * t, a[1] + ab[1] * t]));
}

function cross(o: Pt, a: Pt, b: Pt): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function segSeg(a: Pt, b: Pt, c: Pt, d: Pt): number {
  const d1 = cross(a, b, c);
  const d2 = cross(a, b, d);
  const d3 = cross(c, d, a);
  const d4 = cross(c, d, b);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return 0;
  return Math.min(ptSeg(a, c, d), ptSeg(b, c, d), ptSeg(c, a, b), ptSeg(d, a, b));
}

/** Ray-cast point in polygon; the ring is closed implicitly. */
export function insideRing(p: Pt, poly: readonly Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const edges = (poly: readonly Pt[]): (readonly [Pt, Pt])[] => poly.map((p, i) => [p, poly[(i + 1) % poly.length]!] as const);

/** Core distance between two shapes, radii not subtracted. */
function coreDist(s: Shape, t: Shape): number {
  if (s.kind === "poly" && t.kind !== "poly") return coreDist(t, s);
  if (s.kind === "pt") {
    if (t.kind === "pt") return len(sub(s.p, t.p));
    if (t.kind === "seg") return ptSeg(s.p, t.a, t.b);
    return insideRing(s.p, t.pts) ? 0 : Math.min(...edges(t.pts).map(([a, b]) => ptSeg(s.p, a, b)));
  }
  if (s.kind === "seg") {
    if (t.kind === "pt") return ptSeg(t.p, s.a, s.b);
    if (t.kind === "seg") return segSeg(s.a, s.b, t.a, t.b);
    if (insideRing(s.a, t.pts) || insideRing(s.b, t.pts)) return 0;
    return Math.min(...edges(t.pts).map(([a, b]) => segSeg(s.a, s.b, a, b)));
  }
  const tp = (t as Extract<Shape, { kind: "poly" }>).pts;
  if (s.pts.some((p) => insideRing(p, tp)) || tp.some((p) => insideRing(p, s.pts))) return 0;
  return Math.min(...edges(s.pts).flatMap(([a, b]) => edges(tp).map(([c, d]) => segSeg(a, b, c, d))));
}

/** Copper gap between two shapes, mm; zero or less means they touch. */
export function gapBetween(s: Shape, t: Shape): number {
  return coreDist(s, t) - s.r - t.r;
}

export const touches = (s: Shape, t: Shape): boolean => gapBetween(s, t) <= TOUCH_TOL_MM;

function anchors(s: Shape): readonly Pt[] {
  return s.kind === "pt" ? [s.p] : s.kind === "seg" ? [s.a, s.b] : [s.pts.reduce<Pt>((a, p) => [a[0] + p[0] / s.pts.length, a[1] + p[1] / s.pts.length], [0, 0])];
}

/** A pad's shape in the board frame: a circle as a disc, anything else as its rotated rectangle. */
export function padShape(p: { readonly shape: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly rot: number }): Shape {
  const hw = p.w / 2;
  const hh = p.h / 2;
  if (p.shape === "circle") return { kind: "pt", p: [p.x, p.y], r: hw };
  const a = (p.rot * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { kind: "poly", r: 0, pts: ([[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]] as Pt[]).map(([x, y]) => [p.x + x * c - y * s, p.y + x * s + y * c] as Pt) };
}

const ALL_CU = (record: Pick<BoardRecord, "board">): CopperLayer[] =>
  record.board.copperLayers === 4 ? ["F.Cu", "In1.Cu", "In2.Cu", "B.Cu"] : ["F.Cu", "B.Cu"];

const padLayers = (record: Pick<BoardRecord, "board">, p: RecordPad): readonly string[] =>
  p.through ? ALL_CU(record) : [p.side === "top" ? "F.Cu" : "B.Cu"];

const f2 = (v: number): string => v.toFixed(2);

/** The copper of a record as items, pours and keepouts. */
export function recordCopper(record: BoardRecord): { readonly items: readonly CopperItem[]; readonly pours: readonly CopperPour[]; readonly keepouts: readonly CopperKeepout[] } {
  const items: CopperItem[] = [];
  for (const p of record.pads) items.push({ net: p.net, layers: padLayers(record, p), shape: padShape(p), key: `${p.ref}.${p.pin}`, name: `pad ${p.ref}.${p.pin}` });
  for (const v of record.vias) {
    items.push({ net: v.net, layers: ALL_CU(record), shape: { kind: "pt", p: [v.x, v.y], r: v.pad / 2 }, name: `via ${v.net} at (${f2(v.x)}, ${f2(v.y)})` });
  }
  for (const t of record.tracks) {
    for (let i = 1; i < t.pts.length; i += 1) {
      const a = t.pts[i - 1]!;
      const b = t.pts[i]!;
      items.push({ net: t.net, layers: [t.layer], shape: { kind: "seg", a, b, r: t.width / 2 }, name: `track ${t.net} ${t.layer} (${f2(a[0])}, ${f2(a[1])}) to (${f2(b[0])}, ${f2(b[1])})` });
    }
  }
  const pours = (record.zones ?? []).map((z) => ({ net: z.net, layers: [z.layer], pts: z.outline }));
  const keepouts = (record.keepouts ?? []).filter((k) => k.forbids.includes("pour") || k.forbids.includes("copper")).map((k) => ({ layers: k.layers, pts: k.outline }));
  return { items, pours, keepouts };
}

export interface CopperShort {
  /** The two nets, sorted. */
  readonly nets: readonly [string, string];
  readonly layer: string;
  /** The two items that touch. */
  readonly between: readonly [string, string];
  /** Copper gap between them, mm; zero or less. */
  readonly gap: number;
}

export interface Connectivity {
  /** Islands per named net: the count of connected groups its pads fall in. */
  readonly islands: ReadonlyMap<string, number>;
  /** Item pairs of different named nets that touch, one per item pair. */
  readonly shorts: readonly CopperShort[];
}

/**
 * Connected islands per net and the shorts between nets. A net's island
 * count counts its keyed items (pads) only; tracks and vias join them.
 * Netless items ("") join nothing and short nothing.
 */
export function connectivity(items: readonly CopperItem[], pours: readonly CopperPour[], keepouts: readonly CopperKeepout[]): Connectivity {
  const parent = items.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  const join = (a: number, b: number): void => {
    parent[find(a)] = find(b);
  };
  const shorts: CopperShort[] = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i]!;
      const b = items[j]!;
      if (a.net === "" || b.net === "") continue;
      const layer = a.layers.find((l) => b.layers.includes(l));
      if (layer === undefined) continue;
      const gap = gapBetween(a.shape, b.shape);
      if (gap > TOUCH_TOL_MM) continue;
      if (a.net === b.net) join(i, j);
      else {
        const nets = (a.net < b.net ? [a.net, b.net] : [b.net, a.net]) as [string, string];
        shorts.push({ nets, layer, between: [a.name, b.name], gap });
      }
    }
  }
  for (const z of pours) {
    const inZone = items.map((it, i) => ({ it, i })).filter(({ it }) => it.net === z.net && it.layers.some((l) => z.layers.includes(l))
      && anchors(it.shape).some((p) => insideRing(p, z.pts) && !keepouts.some((k) => k.layers.some((l) => z.layers.includes(l)) && insideRing(p, k.pts))));
    for (let k = 1; k < inZone.length; k += 1) join(inZone[0]!.i, inZone[k]!.i);
  }
  const roots = new Map<string, Set<number>>();
  items.forEach((it, i) => {
    if (it.key === undefined || it.net === "") return;
    const s = roots.get(it.net) ?? new Set<number>();
    s.add(find(i));
    roots.set(it.net, s);
  });
  return { islands: new Map([...roots].map(([n, s]) => [n, s.size] as const)), shorts };
}
