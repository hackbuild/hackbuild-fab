// designs/collar/build.ts
// A headless port of the COLLAR slab planner and labeller
// (designs/collar/legacy/collar.html, sha256 in legacy/sha256.txt): blank
// shapes (SHAPES, rrect, ngon, shapeR, lines 668 to 732), the 8192-entry
// outline and edge tables (baseLUT, edgeLUT, lines 898 to 918), the edge
// registry (EDGES, lines 760 to 872), planSlabs (1201), insetAt (1215),
// labelSlab (1221) and the per pixel radius and angle tables of buildMesh
// (1373 to 1378). The output is a raster ShapeDecl: one label grid per Z
// slab, raster in XY, exact in Z (knowledge/designs/collar.md 4.6).
//
// Parity rests on the arithmetic order: the tables are Float32Array as in
// the legacy, and every expression keeps the legacy operand order, so the
// labels are the same cell for cell (tools/parity/collar.test.ts).
//
// Face art needs a canvas and moves with the art pipeline at M03; the faces
// here are empty, so the art grids are all zero. Conditionals live in this
// file, never in chase.ts (D-178).

import { defineBuild, type Author, type BodyDraft, type PartDraft } from "@hackbuild/spec";
import type { RasterMask, RasterVolume } from "@hackbuild/mesh";
import { chase, type CollarParams } from "./chase";

export const LUT_N = 8192;

export type ShapeKind = "round" | "squircle" | "rounded" | "dogtag" | "bar" | "hex" | "oct" | "tri" | "shield";
export type EdgeStyle = "plain" | "reeded" | "milled" | "square" | "openreed" | "knurl" | "rope" | "beaded" | "oblique" | "wave" | "petal" | "lobed";

/** The legacy ST fields the geometry reads, mm and degrees as in collar.html line 643. */
export interface CollarState {
  readonly dia: number;
  readonly thk: number;
  readonly cham: number;
  readonly inlay: number;
  readonly layer: number;
  /** Grid cells across the diameter, count. */
  readonly res: number;
  readonly nSlots: number;
  readonly base: number;
  readonly shape: { readonly kind: ShapeKind; readonly aspect: number; readonly corner: number };
  readonly edge: { readonly style: EdgeStyle; readonly count: number; readonly depth: number; readonly width: number; readonly twist: number; readonly gapDeg: number };
  readonly rim: {
    readonly on: boolean; readonly w: number; readonly slot: number; readonly dashOn: boolean; readonly dashN: number;
    readonly dashDuty: number; readonly dashSlot: number; readonly dashAlt: boolean; readonly dashSlot2: number; readonly dashPhase: number;
  };
  readonly nfc: { readonly on: boolean; readonly dia: number; readonly depth: number; readonly tag: number };
}

// ---- blank shapes (collar.html lines 668 to 732) ----

function rrect(x: number, y: number, a: number, b: number, rc: number): number {
  const qx = Math.abs(x) - (a - rc), qy = Math.abs(y) - (b - rc);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rc;
}

function ngon(x: number, y: number, R: number, n: number): number {
  let m = -1e9;
  const ap = R * Math.cos(Math.PI / n);
  for (let k = 0; k < n; k++) {
    const a = Math.PI / 2 + 2 * Math.PI * k / n;
    m = Math.max(m, x * Math.cos(a) + y * Math.sin(a) - ap);
  }
  return m;
}

type ShapeFn = (x: number, y: number, R: number, p: CollarState["shape"]) => number;

/** Implicit blank outlines, f <= 0 inside (SHAPES). */
export const SHAPES: Readonly<Record<ShapeKind, { readonly label: string; readonly f: ShapeFn }>> = {
  round: { label: "round", f: (x, y, R) => Math.hypot(x, y) - R },
  squircle: { label: "squircle", f: (x, y, R) => Math.pow(Math.abs(x / R), 4) + Math.pow(Math.abs(y / R), 4) - 1 },
  rounded: {
    label: "rounded square",
    f: (x, y, R, p) => {
      const a = R / Math.SQRT2, rc = Math.min(a, a) * p.corner;
      return rrect(x, y, a, a, rc);
    },
  },
  dogtag: {
    label: "dog tag",
    f: (x, y, R, p) => {
      const a = R, b = R * p.aspect;
      return rrect(x, y, a, b, b);
    },
  },
  bar: {
    label: "rounded bar",
    f: (x, y, R, p) => {
      const a = R, b = R * p.aspect;
      return rrect(x, y, a, b, b * p.corner);
    },
  },
  hex: { label: "hexagon", f: (x, y, R) => ngon(x, y, R, 6) },
  oct: { label: "octagon", f: (x, y, R) => ngon(x, y, R, 8) },
  tri: { label: "triangle", f: (x, y, R) => ngon(x, y, R, 3) },
  shield: {
    label: "shield",
    f: (x, y, R) => {
      const a = R * 0.82, top = R * 0.72;
      if (y >= 0) return rrect(x, y - top * 0.35, a, top * 0.65, R * 0.18);
      const t = -y / (R * 1.0);
      const w = a * Math.sqrt(Math.max(0, 1 - t * t * t * 1.05));
      return Math.abs(x) - w;
    },
  },
};

const radius = (st: CollarState): number => st.dia / 2;

/** Outline radius along a ray by 26 bisection steps between 0 and 1.05 R (shapeR). */
export function shapeR(st: CollarState, theta: number): number {
  const sh = SHAPES[st.shape.kind] ?? SHAPES.round, Rr = radius(st);
  if (st.shape.kind === "round") return Rr;
  const c = Math.cos(theta), s = Math.sin(theta);
  let lo = 0, hi = Rr * 1.05;
  for (let i = 0; i < 26; i++) {
    const m = (lo + hi) / 2;
    if (sh.f(m * c, m * s, Rr, st.shape) <= 0) lo = m; else hi = m;
  }
  return lo;
}

// ---- edge styles (EDGES, collar.html lines 758 to 872) ----

interface EdgeP { R: number; readonly thk: number; readonly count: number; readonly depth: number; readonly width: number; readonly twist: number; readonly gapDeg: number }

const val1 = (x: number): number => { const d = Math.abs(x - Math.round(x)); return 1 - Math.min(1, 2 * d); };

const reeded = (t: number, _z: number, p: EdgeP): number => {
  const pa = 2 * Math.PI / p.count;
  const phi = t - Math.round(t / pa) * pa;
  const rc = (p.width * p.width / 4 + p.depth * p.depth) / (2 * p.depth);
  const at = p.R + rc - p.depth;
  const c = Math.cos(phi), disc = at * at * c * c - at * at + rc * rc;
  if (disc <= 0) return p.R;
  return Math.min(p.R, at * c - Math.sqrt(disc));
};

/** One record per style: label, zDep (forces a slab per layer), the params it reads, r(theta, z). */
export const EDGES: Readonly<Record<EdgeStyle, {
  readonly label: string; readonly zDep: boolean; readonly uses: readonly string[]; readonly r: (t: number, z: number, p: EdgeP) => number;
}>> = {
  plain: { label: "plain", zDep: false, uses: [], r: (_t, _z, p) => p.R },
  reeded: { label: "reeded", zDep: false, uses: ["count", "depth", "width"], r: reeded },
  milled: {
    label: "milled V", zDep: false, uses: ["count", "depth", "width"],
    r: (t, _z, p) => {
      const pa = 2 * Math.PI / p.count;
      const s = (t - Math.round(t / pa) * pa) * p.R;
      const h = p.width / 2;
      return Math.abs(s) >= h ? p.R : p.R - p.depth * (1 - Math.abs(s) / h);
    },
  },
  square: {
    label: "square groove", zDep: false, uses: ["count", "depth", "width"],
    r: (t, _z, p) => {
      const pa = 2 * Math.PI / p.count;
      const s = (t - Math.round(t / pa) * pa) * p.R;
      return Math.abs(s) <= p.width / 2 ? p.R - p.depth : p.R;
    },
  },
  openreed: {
    label: "open reed", zDep: false, uses: ["count", "depth", "width", "gapDeg"],
    r: (t, z, p) => {
      let a = t + Math.PI / 2;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      if (Math.abs(a) * 180 / Math.PI < p.gapDeg / 2) return p.R;
      return reeded(t, z, p);
    },
  },
  knurl: {
    label: "diamond knurl", zDep: true, uses: ["count", "depth", "width", "twist"],
    r: (t, z, p) => {
      const pitch = 2 * Math.PI * p.R / p.count;
      const T = Math.tan(p.twist * Math.PI / 180);
      const s = t * p.R;
      const a = (s + z * T) / pitch, b = (s - z * T) / pitch;
      return p.R - p.depth * Math.max(val1(a), val1(b));
    },
  },
  rope: {
    label: "rope", zDep: true, uses: ["count", "depth", "twist"],
    r: (t, z, p) => {
      const pitch = 2 * Math.PI * p.R / p.count;
      const T = Math.tan(p.twist * Math.PI / 180);
      const a = (t * p.R + z * T) / pitch;
      return p.R - p.depth * (0.5 - 0.5 * Math.cos(2 * Math.PI * (a - Math.floor(a))));
    },
  },
  beaded: {
    label: "beaded", zDep: true, uses: ["count", "depth", "width"],
    r: (t, z, p) => {
      const pa = 2 * Math.PI / p.count;
      const s = (t - Math.round(t / pa) * pa) * p.R;
      const rb = Math.max(p.width / 2, 0.2), dz = z - p.thk / 2;
      const q = 1 - (s * s + dz * dz) / (rb * rb);
      return q <= 0 ? p.R : p.R - p.depth * Math.sqrt(q);
    },
  },
  oblique: {
    label: "oblique line", zDep: true, uses: ["count", "depth", "twist"],
    r: (t, z, p) => {
      const pitch = 2 * Math.PI * p.R / p.count;
      const T = Math.tan(p.twist * Math.PI / 180);
      const a = (t * p.R + z * T) / pitch;
      return p.R - p.depth * val1(a);
    },
  },
  wave: { label: "wave", zDep: false, uses: ["count", "depth"], r: (t, _z, p) => p.R - p.depth * (0.5 - 0.5 * Math.cos(p.count * t)) },
  petal: {
    label: "petal cut", zDep: true, uses: ["count", "depth", "width"],
    r: (t, z, p) => {
      const pa = 2 * Math.PI / p.count;
      const s = (t - Math.round(t / pa) * pa) * p.R;
      const rb = Math.max(p.width / 2, 0.2), dz = z - p.thk * 0.72;
      const q = 1 - (s * s + dz * dz) / (rb * rb);
      return q <= 0 ? p.R : p.R - p.depth * Math.sqrt(q);
    },
  },
  lobed: { label: "scalloped blank", zDep: false, uses: ["count", "depth"], r: (t, _z, p) => p.R - p.depth * (0.5 - 0.5 * Math.cos(p.count * t)) },
};

// ---- angular tables (baseLUT, edgeLUT) ----

const baseCache = new Map<string, Float32Array>();

/** Outline radius at LUT_N angles from -pi, scaled so the widest point is the nominal radius. Cached by shape, dia, aspect, corner. */
export function baseLUT(st: CollarState): Float32Array {
  const key = `${st.shape.kind}|${st.dia}|${st.shape.aspect}|${st.shape.corner}`;
  const hit = baseCache.get(key);
  if (hit !== undefined) return hit;
  const out = new Float32Array(LUT_N);
  let mx = 0;
  for (let i = 0; i < LUT_N; i++) { out[i] = shapeR(st, (i / LUT_N) * 2 * Math.PI - Math.PI); if (out[i]! > mx) mx = out[i]!; }
  if (mx > 0) { const k = radius(st) / mx; for (let i = 0; i < LUT_N; i++) out[i] = out[i]! * k; }
  baseCache.set(key, out);
  return out;
}

/** The bare outline and the outline with the edge cut, at height z. */
export function edgeLUT(st: CollarState, z: number): { readonly base: Float32Array; readonly cut: Float32Array } {
  const f = EDGES[st.edge.style].r;
  const p: EdgeP = { R: radius(st), thk: st.thk, count: st.edge.count, depth: st.edge.depth, width: st.edge.width, twist: st.edge.twist, gapDeg: st.edge.gapDeg };
  const base = baseLUT(st), out = new Float32Array(LUT_N);
  for (let i = 0; i < LUT_N; i++) {
    p.R = base[i]!;
    out[i] = f((i / LUT_N) * 2 * Math.PI - Math.PI, z, p);
  }
  return { base, cut: out };
}

/** Smallest outline radius (shapeMinR). */
export function shapeMinR(st: CollarState): number {
  let m = 1e9;
  for (const v of baseLUT(st)) if (v < m) m = v;
  return m;
}

/** Pocket floor: centred in the solid core, rounded to a layer boundary (NFC_Z0). */
export function nfcZ0(st: CollarState): number {
  const c0 = st.inlay, c1 = st.thk - st.inlay;
  const z = (c0 + c1) / 2 - st.nfc.depth / 2;
  return Math.max(c0, Math.round(z / st.layer) * st.layer);
}

// ---- slab plan and labels ----

/** Z breaks at both faces, the inlay bands, each layer in the chamfer, the pocket and, for a zDep edge, every layer (planSlabs). */
export function planSlabs(st: CollarState): [number, number][] {
  const zs = new Set<number>([0, st.thk]);
  const push = (z: number): void => { if (z > 1e-6 && z < st.thk - 1e-6) zs.add(Math.round(z * 1e4) / 1e4); };
  push(st.inlay); push(st.thk - st.inlay);
  const step = st.layer;
  const nCh = Math.max(0, Math.ceil((st.cham - 1e-9) / step));
  for (let i = 1; i <= nCh; i++) { push(i * step); push(st.thk - i * step); }
  if (st.nfc.on) { push(nfcZ0(st)); push(nfcZ0(st) + st.nfc.depth); }
  if (EDGES[st.edge.style].zDep) for (let z = step; z < st.thk; z += step) push(z);
  const arr = Array.from(zs).sort((a, b) => a - b);
  const out: [number, number][] = [];
  for (let i = 0; i < arr.length - 1; i++) if (arr[i + 1]! - arr[i]! > 1e-6) out.push([arr[i]!, arr[i + 1]!]);
  return out;
}

/** The 45 degree edge break as a per slab inset, mm (insetAt). */
export function insetAt(st: CollarState, z: number): number {
  if (st.cham <= 0) return 0;
  const a = st.cham - z, b = st.cham - (st.thk - z);
  return Math.max(0, a, b);
}

/** Per pixel centre radius and angle, Float32 as buildMesh keeps them (collar.html lines 1373 to 1378). */
export interface PixelGrid { readonly D2: Float32Array; readonly TH: Float32Array }

export function pixelGrid(st: CollarState): PixelGrid {
  const res = st.res, n = res * res, mm = st.dia / res, half = res / 2;
  const D2 = new Float32Array(n), TH = new Float32Array(n);
  for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
    const x = (i + 0.5 - half) * mm, y = (j + 0.5 - half) * mm;
    const p = j * res + i;
    D2[p] = Math.hypot(x, y); TH[p] = Math.atan2(y, x);
  }
  return { D2, TH };
}

/** Face art and holes as slot grids, res x res, row 0 at the bottom; the back grid is already mirrored. Empty until M03. */
export interface FaceGrids { readonly artF: Uint8Array; readonly artB: Uint8Array; readonly holes: Uint8Array | null }

export function emptyFaces(st: CollarState): FaceGrids {
  const n = st.res * st.res;
  return { artF: new Uint8Array(n), artB: new Uint8Array(n), holes: null };
}

/** Label every cell of the slab [z0, z1] at its middle height: air, rim band and spots, face art, body, pocket (labelSlab). */
export function labelSlab(st: CollarState, z0: number, z1: number, faces: FaceGrids, grid: PixelGrid): Uint8Array {
  const { artF, artB, holes } = faces;
  const { D2, TH } = grid;
  const res = st.res, n = res * res, L = new Uint8Array(n);
  const zm = (z0 + z1) / 2;
  const lut = edgeLUT(st, zm), inset = insetAt(st, zm);
  const base = lut.base, cut = lut.cut;
  const rimOn = st.rim.on, rimW = st.rim.w, rimSlot = st.rim.slot, body = st.base;
  const topBand = zm >= st.thk - st.inlay, botBand = zm <= st.inlay;
  const nfcOn = st.nfc.on, nfcR = st.nfc.dia / 2;
  const nz0 = nfcZ0(st), nz1 = nz0 + st.nfc.depth;
  const inPocketZ = nfcOn && zm > nz0 && zm < nz1;
  const Rmax = radius(st);
  const dash = st.rim.on && st.rim.dashOn && st.nSlots > 1, dN = Math.max(1, st.rim.dashN | 0);
  const dPitch = 2 * Math.PI / dN, dDuty = st.rim.dashDuty / 100;
  const dPhase = (st.rim.dashPhase || 0) * Math.PI / 180;
  const dSlot = st.rim.dashSlot, dAlt = st.rim.dashAlt, dSlot2 = st.rim.dashSlot2;
  for (let p = 0; p < n; p++) {
    const d = D2[p]!;
    if (d > Rmax) continue;
    let idx = ((TH[p]! + Math.PI) / (2 * Math.PI) * LUT_N) | 0;
    if (idx < 0) idx = 0; else if (idx >= LUT_N) idx = LUT_N - 1;
    if (d > cut[idx]! - inset) continue;
    if (holes !== null && holes[p]) continue;
    let lab = body;
    if (rimOn && d >= base[idx]! - rimW) {
      lab = rimSlot;
      if (dash) {
        const a = TH[p]! + Math.PI + dPhase;
        const k = Math.floor(a / dPitch);
        const f = a / dPitch - k;
        if (f < dDuty) lab = (dAlt && (k & 1)) ? dSlot2 : dSlot;
      }
    } else if (topBand && artF[p]) lab = artF[p]!;
    else if (botBand && artB[p]) lab = artB[p]!;
    if (inPocketZ && d <= nfcR) lab = 0;
    L[p] = lab;
  }
  return L;
}

/** One labelled slab. */
export interface Band { readonly z0: number; readonly z1: number; readonly labels: Uint8Array }

/** Every planSlabs band labelled, before any merge. `zOf` maps each bound before labelling (identity for the legacy run). */
export function labelBands(st: CollarState, zOf: (z: number) => number = (z) => z, faces: FaceGrids = emptyFaces(st)): Band[] {
  const grid = pixelGrid(st);
  return planSlabs(st).map(([a, b]) => {
    const z0 = zOf(a), z1 = zOf(b);
    return { z0, z1, labels: labelSlab(st, z0, z1, faces, grid) };
  });
}

/** Consecutive bands with equal labels merged, so walls come out tall (collar.html lines 1396 to 1406). */
export function mergeBands(bands: readonly Band[]): Band[] {
  const out: Band[] = [];
  for (const b of bands) {
    const prev = out[out.length - 1];
    if (prev !== undefined && prev.labels.length === b.labels.length && prev.labels.every((v, i) => v === b.labels[i])) {
      out[out.length - 1] = { z0: prev.z0, z1: b.z1, labels: prev.labels };
    } else out.push(b);
  }
  return out;
}

/** Cell size, mm (computed: dia / res; 0.0859375 at 44 / 512, already on the 1/1024 mm grid). */
export const cellMm = (st: CollarState): number => st.dia / st.res;

/** The low corner of raster cell (0, 0) on x and on y, mm: -dia/2. rasterVolume() and masks() both read it. */
export function originOf(st: CollarState): number {
  return -(st.res / 2) * cellMm(st);
}

/** A label volume for packages/mesh raster(), cell (0, 0) low corner at (-dia/2, -dia/2). */
export function rasterVolume(st: CollarState, bands: readonly Band[], zGrid: "dyadic" | "given" = "dyadic"): RasterVolume {
  const x0 = originOf(st);
  return {
    width: st.res, height: st.res, px: cellMm(st), x0, y0: x0, zGrid,
    slabs: bands.map((b) => ({ labels: b.labels.slice(), z: [b.z0, b.z1] as const })),
  };
}

/** Set cells per slot summed over bands, count. */
export function cellCounts(bands: readonly Band[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of bands) for (const l of b.labels) if (l !== 0) out[String(l)] = (out[String(l)] ?? 0) + 1;
  return out;
}

// ---- params to state, the build and its masks ----

/** The legacy ST from chase params (field ids follow the legacy keys; the rim slot is rimSlot, the pocket fields carry nfc). */
export function stateOf(p: CollarParams): CollarState {
  return {
    dia: p.dia, thk: p.thk, cham: p.cham, inlay: p.inlay, layer: p.layer, res: p.res, nSlots: p.nSlots, base: p.base,
    shape: { kind: p.shape, aspect: p.aspect, corner: p.corner },
    edge: { style: p.style, count: p.count, depth: p.depth, width: p.width, twist: p.twist, gapDeg: p.gapDeg },
    rim: {
      on: p.on, w: p.w, slot: p.rimSlot, dashOn: p.dashOn, dashN: p.dashN, dashDuty: p.dashDuty,
      dashSlot: p.dashSlot, dashAlt: p.dashAlt, dashSlot2: p.dashSlot2, dashPhase: p.dashPhase,
    },
    nfc: { on: p.nfcOn, dia: p.nfcDia, depth: p.nfcDepth, tag: p.tag },
  };
}

const bandCache = new Map<string, Band[]>();

/** Merged bands for a param set, computed once per process for build() and masks(). */
function bandsOf(p: CollarParams): Band[] {
  const key = JSON.stringify(stateOf(p));
  let hit = bandCache.get(key);
  if (hit === undefined) {
    hit = mergeBands(labelBands(stateOf(p)));
    bandCache.clear();
    bandCache.set(key, hit);
  }
  return hit;
}

const maskUri = (k: number): string => `collar://band/${k}`;

/** Raster masks for every band uri build() names (core load-build masksOf). */
export function masks(values: Record<string, unknown>): Record<string, RasterMask> {
  const p = values as unknown as CollarParams;
  const st = stateOf(p);
  const x0 = originOf(st);
  return Object.fromEntries(bandsOf(p).map((b, k) => [maskUri(k), { width: st.res, height: st.res, labels: b.labels, origin: [x0, x0] as const }]));
}

/** Slot labels from the chase materials, for body ids. */
const slotLabel = (slot: number): string => chase.materials.find((m) => m.slot === slot)?.label ?? `slot${slot}`;

/** The COLLAR part: one raster body per slot the labels carry, the body slot in role body and the others in role art. */
export function buildCollar(p: CollarParams, k: Author): PartDraft {
  const st = stateOf(p);
  const bands = bandsOf(p);
  const used = Object.keys(cellCounts(bands)).map(Number).sort((a, b) => a - b);
  const base = { route: "raster" as const, layers: bands.map((b, i) => ({ mask: maskUri(i), z: [b.z0, b.z1] as const })), res: cellMm(st) };
  const bodies: BodyDraft[] = used.map((slot) => k.body(slotLabel(slot), { role: slot === st.base ? "body" : "art", slot, base }));
  const m = k.machine("ffc5p");
  if (Math.abs(m.layerHeight - st.layer) > 1e-9) {
    k.warn("LAYER_PRESET", `layer ${st.layer} mm written under the ${m.layerHeight} mm process preset; slab bounds and the pause layer follow ${st.layer}, set layer to ${m.layerHeight}`);
  }
  return k.part({
    id: "coin", name: "COLLAR", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: true, carriesOffset: false, pose: "print" },
    bodies, features: [],
  });
}

export const build = defineBuild(chase, (p, k) => buildCollar(p, k));
