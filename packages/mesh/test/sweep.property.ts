// M00-T06: a seeded fast-check sweep of designs across the four M00 routes
// (40 percent COLLAR coins on raster, 20 percent each prism, stack and
// revolve at FC_RUNS 100). Each design runs the D-047 stage runner in
// sweep mode, so a pinch healer that does not converge is a failure; every
// body mesh and the solid must pass the audit and liveCount() must be 0
// after every build (D-055). The summary line follows PIP test/sweep.mjs.
//
// The COLLAR label volume is a port of collar.html (originals/collar/files):
// SHAPES, rrect and ngon at lines 668 to 721, shapeR bisection at 722 to
// 732, the LUT normalisation at 898 to 909, EDGES at 761 to 872 with the
// EDGE_PRESETS at 874 to 889, planSlabs and insetAt at 1201 to 1219,
// labelSlab at 1221 to 1258, pixel centres at 1373 to 1378, the mirrored
// back face at 1381 and the merge of equal slabs at 1396 to 1406. Ranges
// and steps are the bench sliders (lines 315 to 452).
//
// Replay: FC_SEED=<s> FC_PATH=<p> FC_FAMILY=<f> npm run sweep -w packages/mesh

import fc from "fast-check";
import { afterAll, describe, expect, it } from "vitest";
import type { BodyDraft, PartDraft, Ring, ShapeDecl, Vec2 } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { audit, liveCount, runStages, type RasterMask, type StageInput } from "../src/index.js";

const FC_RUNS = Number(process.env["FC_RUNS"] ?? 100);
const SEED = Number(process.env["FC_SEED"] ?? 20261004);
const REPLAY_PATH = process.env["FC_PATH"];
const ONLY = process.env["FC_FAMILY"];
const TIMEOUT_MS = 30 * 60 * 1000;

const profile = createProfileLookup(loadProfile());
const FRAME = { originOnAxis: false, carriesOffset: true, pose: "print" } as const;

/** One drawn design: the stage runner input it lowers to. */
interface Design {
  readonly family: string;
  readonly label: string;
  readonly input: () => StageInput;
}

function part(id: string, bodies: BodyDraft[]): PartDraft {
  return { id, name: id, process: "fdm", machine: "ffc5p", frame: FRAME, bodies, features: [] };
}

const step = (min: number, max: number, by: number): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: Math.round((max - min) / by) }).map((k) => Math.round((min + k * by) * 1e6) / 1e6);

// ---- COLLAR (collar.html) ----

type ShapeKind = "round" | "squircle" | "rounded" | "dogtag" | "bar" | "hex" | "oct" | "tri" | "shield";
interface ShapeParams {
  readonly aspect: number;
  readonly corner: number;
}

function rrect(x: number, y: number, a: number, b: number, rc: number): number {
  const qx = Math.abs(x) - (a - rc), qy = Math.abs(y) - (b - rc);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rc;
}

function ngon(x: number, y: number, R: number, n: number): number {
  let m = -1e9;
  const ap = R * Math.cos(Math.PI / n);
  for (let k = 0; k < n; k++) {
    const a = Math.PI / 2 + (2 * Math.PI * k) / n;
    m = Math.max(m, x * Math.cos(a) + y * Math.sin(a) - ap);
  }
  return m;
}

const SHAPES: Readonly<Record<ShapeKind, (x: number, y: number, R: number, p: ShapeParams) => number>> = {
  round: (x, y, R) => Math.hypot(x, y) - R,
  squircle: (x, y, R) => Math.pow(Math.abs(x / R), 4) + Math.pow(Math.abs(y / R), 4) - 1,
  rounded: (x, y, R, p) => {
    const a = R / Math.SQRT2;
    return rrect(x, y, a, a, a * p.corner);
  },
  dogtag: (x, y, R, p) => rrect(x, y, R, R * p.aspect, R * p.aspect),
  bar: (x, y, R, p) => rrect(x, y, R, R * p.aspect, R * p.aspect * p.corner),
  hex: (x, y, R) => ngon(x, y, R, 6),
  oct: (x, y, R) => ngon(x, y, R, 8),
  tri: (x, y, R) => ngon(x, y, R, 3),
  shield: (x, y, R) => {
    const a = R * 0.82, top = R * 0.72;
    if (y >= 0) return rrect(x, y - top * 0.35, a, top * 0.65, R * 0.18);
    const t = -y / R;
    return Math.abs(x) - a * Math.sqrt(Math.max(0, 1 - t * t * t * 1.05));
  },
};

interface EdgeParams {
  R: number;
  readonly thk: number;
  readonly count: number;
  readonly depth: number;
  readonly width: number;
  readonly twist: number;
  readonly gapDeg: number;
}
interface EdgeStyle {
  readonly zDep: boolean;
  readonly r: (t: number, z: number, p: EdgeParams) => number;
}

const val1 = (x: number): number => 1 - Math.min(1, 2 * Math.abs(x - Math.round(x)));

const reeded = (t: number, _z: number, p: EdgeParams): number => {
  const pa = (2 * Math.PI) / p.count;
  const phi = t - Math.round(t / pa) * pa;
  const rc = (p.width * p.width / 4 + p.depth * p.depth) / (2 * p.depth);
  const at = p.R + rc - p.depth;
  const c = Math.cos(phi), disc = at * at * c * c - at * at + rc * rc;
  if (disc <= 0) return p.R;
  return Math.min(p.R, at * c - Math.sqrt(disc));
};

const EDGES: Readonly<Record<string, EdgeStyle>> = {
  plain: { zDep: false, r: (_t, _z, p) => p.R },
  reeded: { zDep: false, r: reeded },
  milled: {
    zDep: false,
    r: (t, _z, p) => {
      const pa = (2 * Math.PI) / p.count;
      const s = (t - Math.round(t / pa) * pa) * p.R;
      const h = p.width / 2;
      return Math.abs(s) >= h ? p.R : p.R - p.depth * (1 - Math.abs(s) / h);
    },
  },
  square: {
    zDep: false,
    r: (t, _z, p) => {
      const pa = (2 * Math.PI) / p.count;
      const s = (t - Math.round(t / pa) * pa) * p.R;
      return Math.abs(s) <= p.width / 2 ? p.R - p.depth : p.R;
    },
  },
  openreed: {
    zDep: false,
    r: (t, z, p) => {
      let a = t + Math.PI / 2;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      if ((Math.abs(a) * 180) / Math.PI < p.gapDeg / 2) return p.R;
      return reeded(t, z, p);
    },
  },
  knurl: {
    zDep: true,
    r: (t, z, p) => {
      const pitch = (2 * Math.PI * p.R) / p.count;
      const T = Math.tan((p.twist * Math.PI) / 180);
      const s = t * p.R;
      return p.R - p.depth * Math.max(val1((s + z * T) / pitch), val1((s - z * T) / pitch));
    },
  },
  rope: {
    zDep: true,
    r: (t, z, p) => {
      const pitch = (2 * Math.PI * p.R) / p.count;
      const T = Math.tan((p.twist * Math.PI) / 180);
      const a = (t * p.R + z * T) / pitch;
      return p.R - p.depth * (0.5 - 0.5 * Math.cos(2 * Math.PI * (a - Math.floor(a))));
    },
  },
  beaded: {
    zDep: true,
    r: (t, z, p) => {
      const pa = (2 * Math.PI) / p.count;
      const s = (t - Math.round(t / pa) * pa) * p.R;
      const rb = Math.max(p.width / 2, 0.2), dz = z - p.thk / 2;
      const q = 1 - (s * s + dz * dz) / (rb * rb);
      return q <= 0 ? p.R : p.R - p.depth * Math.sqrt(q);
    },
  },
  oblique: {
    zDep: true,
    r: (t, z, p) => {
      const pitch = (2 * Math.PI * p.R) / p.count;
      const T = Math.tan((p.twist * Math.PI) / 180);
      return p.R - p.depth * val1((t * p.R + z * T) / pitch);
    },
  },
  wave: { zDep: false, r: (t, _z, p) => p.R - p.depth * (0.5 - 0.5 * Math.cos(p.count * t)) },
  petal: {
    zDep: true,
    r: (t, z, p) => {
      const pa = (2 * Math.PI) / p.count;
      const s = (t - Math.round(t / pa) * pa) * p.R;
      const rb = Math.max(p.width / 2, 0.2), dz = z - p.thk * 0.72;
      const q = 1 - (s * s + dz * dz) / (rb * rb);
      return q <= 0 ? p.R : p.R - p.depth * Math.sqrt(q);
    },
  },
  lobed: { zDep: false, r: (t, _z, p) => p.R - p.depth * (0.5 - 0.5 * Math.cos(p.count * t)) },
};

interface EdgeDecl {
  readonly style: string;
  readonly count: number;
  readonly depth: number;
  readonly width: number;
  readonly twist: number;
  readonly gapDeg: number;
}

/** EDGE_PRESETS (collar.html lines 874 to 889) over the bench default edge (line 650). */
const EDGE_DEFAULT: EdgeDecl = { style: "reeded", count: 40, depth: 1.0, width: 2.8, twist: 35, gapDeg: 0 };
const EDGE_PRESETS: readonly EdgeDecl[] = [
  { style: "plain" },
  { style: "reeded", count: 72, depth: 0.7, width: 1.5 },
  { style: "reeded", count: 40, depth: 1.0, width: 2.8 },
  { style: "reeded", count: 24, depth: 1.4, width: 4.4 },
  { style: "milled", count: 44, depth: 1.1, width: 3.0 },
  { style: "square", count: 32, depth: 1.0, width: 2.0 },
  { style: "openreed", count: 40, depth: 1.0, width: 2.8, gapDeg: 70 },
  { style: "knurl", count: 28, depth: 0.9, width: 2.4, twist: 40 },
  { style: "rope", count: 26, depth: 0.9, twist: 30 },
  { style: "beaded", count: 30, depth: 0.9, width: 2.6 },
  { style: "oblique", count: 60, depth: 0.8, twist: 55 },
  { style: "wave", count: 18, depth: 1.2 },
  { style: "petal", count: 26, depth: 1.0, width: 3.0 },
  { style: "lobed", count: 12, depth: 2.2 },
].map((e) => ({ ...EDGE_DEFAULT, ...e }));

/** Drawn face art for the inlay bands, standing in for the composer: a disc, a ring or a star, clipped to the art radius. */
interface ArtDecl {
  readonly kind: "none" | "disc" | "ring" | "star";
  /** Fraction of the art radius, count. */
  readonly size: number;
  readonly slot: number;
}

interface CoinDecl {
  readonly shape: ShapeKind;
  readonly aspect: number;
  readonly corner: number;
  readonly dia: number;
  readonly thk: number;
  readonly cham: number;
  readonly inlay: number;
  readonly layer: number;
  readonly rimOn: boolean;
  readonly rimW: number;
  readonly edge: EdgeDecl;
  readonly front: ArtDecl;
  readonly back: ArtDecl;
  /** Raster grid, cells per side; below the bench range 384 to 1536 so 100 designs run in a push job. */
  readonly res: number;
}

const LUT_N = 8192;
const RIM_SLOT = 3, BODY_SLOT = 1, ART_KEEP = 1.4;

function baseLUT(c: CoinDecl): Float64Array {
  const f = SHAPES[c.shape];
  const R = c.dia / 2;
  const out = new Float64Array(LUT_N);
  let mx = 0;
  for (let i = 0; i < LUT_N; i++) {
    const theta = (i / LUT_N) * 2 * Math.PI - Math.PI;
    let r = R;
    if (c.shape !== "round") {
      const cs = Math.cos(theta), sn = Math.sin(theta);
      let lo = 0, hi = R * 1.05;
      for (let k = 0; k < 26; k++) {
        const m = (lo + hi) / 2;
        if (f(m * cs, m * sn, R, c) <= 0) lo = m;
        else hi = m;
      }
      r = lo;
    }
    out[i] = r;
    if (r > mx) mx = r;
  }
  if (mx > 0) for (let i = 0; i < LUT_N; i++) out[i] = out[i]! * (R / mx);
  return out;
}

function planSlabs(c: CoinDecl): [number, number][] {
  const zs = new Set([0, c.thk]);
  const push = (z: number): void => {
    if (z > 1e-6 && z < c.thk - 1e-6) zs.add(Math.round(z * 1e4) / 1e4);
  };
  push(c.inlay);
  push(c.thk - c.inlay);
  const nCh = Math.max(0, Math.ceil((c.cham - 1e-9) / c.layer));
  for (let i = 1; i <= nCh; i++) {
    push(i * c.layer);
    push(c.thk - i * c.layer);
  }
  if (EDGES[c.edge.style]!.zDep) for (let z = c.layer; z < c.thk; z += c.layer) push(z);
  const arr = [...zs].sort((a, b) => a - b);
  const out: [number, number][] = [];
  for (let i = 0; i < arr.length - 1; i++) if (arr[i + 1]! - arr[i]! > 1e-6) out.push([arr[i]!, arr[i + 1]!]);
  return out;
}

function insetAt(c: CoinDecl, z: number): number {
  if (c.cham <= 0) return 0;
  return Math.max(0, c.cham - z, c.cham - (c.thk - z));
}

function artMask(a: ArtDecl, res: number, mm: number, rArt: number): Uint8Array {
  const L = new Uint8Array(res * res);
  if (a.kind === "none") return L;
  const r = rArt * a.size;
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const x = (i + 0.5 - res / 2) * mm, y = (j + 0.5 - res / 2) * mm;
      const d = Math.hypot(x, y);
      if (d > rArt) continue;
      const inside = a.kind === "disc" ? d <= r : a.kind === "ring" ? d <= r && d >= r * 0.6 : ngon(x, y, r, 5) <= 0 && ngon(-x, -y, r, 5) > 0;
      if (inside) L[j * res + i] = a.slot;
    }
  }
  return L;
}

/** The COLLAR label volume: one label grid per merged slab, cell (0, 0) low corner at (-dia/2, -dia/2). */
function coinVolume(c: CoinDecl): { readonly slabs: { labels: Uint8Array; z: [number, number] }[]; readonly mm: number } {
  const res = c.res, n = res * res, mm = c.dia / res, half = res / 2;
  const base = baseLUT(c);
  let minR = Infinity;
  for (const v of base) minR = Math.min(minR, v);
  const rRimIn = c.rimOn ? minR - c.rimW : minR;
  const rArt = Math.max(2, rRimIn - ART_KEEP);
  const D2 = new Float64Array(n), TH = new Float64Array(n);
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const x = (i + 0.5 - half) * mm, y = (j + 0.5 - half) * mm;
      D2[j * res + i] = Math.hypot(x, y);
      TH[j * res + i] = Math.atan2(y, x);
    }
  }
  const artF = artMask(c.front, res, mm, rArt);
  const backRaw = artMask(c.back, res, mm, rArt);
  // the bed face is read from the other side, so it is mirrored in the model
  const artB = new Uint8Array(n);
  for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) artB[j * res + i] = backRaw[j * res + (res - 1 - i)]!;
  const style = EDGES[c.edge.style]!;
  const slabs = planSlabs(c).map(([z0, z1]) => {
    const zm = (z0 + z1) / 2;
    const p: EdgeParams = { R: c.dia / 2, thk: c.thk, count: c.edge.count, depth: c.edge.depth, width: c.edge.width, twist: c.edge.twist, gapDeg: c.edge.gapDeg };
    const cut = new Float64Array(LUT_N);
    for (let i = 0; i < LUT_N; i++) {
      p.R = base[i]!;
      cut[i] = style.r((i / LUT_N) * 2 * Math.PI - Math.PI, zm, p);
    }
    const inset = insetAt(c, zm);
    const topBand = zm >= c.thk - c.inlay, botBand = zm <= c.inlay;
    const L = new Uint8Array(n);
    for (let q = 0; q < n; q++) {
      const d = D2[q]!;
      if (d > c.dia / 2) continue;
      let idx = (((TH[q]! + Math.PI) / (2 * Math.PI)) * LUT_N) | 0;
      if (idx < 0) idx = 0;
      else if (idx >= LUT_N) idx = LUT_N - 1;
      if (d > cut[idx]! - inset) continue;
      let lab = BODY_SLOT;
      if (c.rimOn && d >= base[idx]! - c.rimW) lab = RIM_SLOT;
      else if (topBand && artF[q]) lab = artF[q]!;
      else if (botBand && artB[q]) lab = artB[q]!;
      L[q] = lab;
    }
    return { labels: L, z: [z0, z1] as [number, number] };
  });
  // consecutive slabs with equal labels merge so walls come out tall
  const merged = [slabs[0]!];
  for (const cur of slabs.slice(1)) {
    const prev = merged[merged.length - 1]!;
    let same = true;
    for (let q = 0; q < n; q++) {
      if (prev.labels[q] !== cur.labels[q]) {
        same = false;
        break;
      }
    }
    if (same) prev.z[1] = cur.z[1];
    else merged.push(cur);
  }
  return { slabs: merged, mm };
}

function coinInput(c: CoinDecl, id: string): StageInput {
  const { slabs, mm } = coinVolume(c);
  const masks = new Map<string, RasterMask>();
  const used = new Set<number>();
  const layers = slabs.map((s, k) => {
    const uri = `hbf://sweep/${id}/${k}`;
    masks.set(uri, { width: c.res, height: c.res, labels: s.labels, origin: [-c.dia / 2, -c.dia / 2] });
    for (const v of s.labels) if (v !== 0) used.add(v);
    return { mask: uri, z: s.z };
  });
  const base: ShapeDecl = { route: "raster", layers, res: mm };
  const bodies: BodyDraft[] = [...used].sort((a, b) => a - b).map((slot) => ({
    id: `slot${slot}`, role: slot === BODY_SLOT ? "body" : "art", slot, material: "petg", base,
  }));
  return {
    draft: part(id, bodies), profile, mode: "sweep",
    mask: (uri) => {
      const m = masks.get(uri);
      if (m === undefined) throw new Error(`mask ${uri} missing`);
      return m;
    },
  };
}

const artArb: fc.Arbitrary<ArtDecl> = fc.record({
  kind: fc.constantFrom("none", "disc", "ring", "star"),
  size: step(0.3, 1, 0.05),
  slot: fc.constantFrom(2, 3),
});

const coinArb: fc.Arbitrary<CoinDecl> = fc
  .record({
    shape: fc.constantFrom<ShapeKind>("round", "squircle", "rounded", "dogtag", "bar", "hex", "oct", "tri", "shield"),
    aspect: step(0.3, 1, 0.02),
    corner: step(0.02, 1, 0.02),
    dia: step(20, 60, 0.5),
    thk: step(2.4, 5, 0.2),
    cham: step(0, 1, 0.1),
    inlay: step(0.2, 1.2, 0.2),
    layer: fc.constantFrom(0.2, 0.24),
    rimOn: fc.boolean(),
    rimW: step(0.6, 6, 0.1),
    edge: fc.constantFrom(...EDGE_PRESETS),
    front: artArb,
    back: artArb,
    res: fc.constantFrom(96, 128),
  });

// ---- prism fixtures ----

const ngonRing = (cx: number, cy: number, r: number, n: number, phase: number): Ring =>
  Array.from({ length: n }, (_, k): Vec2 => [cx + r * Math.cos(phase + (2 * Math.PI * k) / n), cy + r * Math.sin(phase + (2 * Math.PI * k) / n)]);
const reversed = (r: Ring): Ring => [...r].reverse();
const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

interface PrismDeclDrawn {
  readonly n: number;
  readonly r: number;
  readonly phase: number;
  readonly holes: number;
  readonly h: number;
  readonly conductor: boolean;
  readonly cw: number;
}

const prismArb: fc.Arbitrary<PrismDeclDrawn> = fc.record({
  n: fc.integer({ min: 5, max: 16 }),
  r: fc.double({ min: 4, max: 40, noNaN: true }),
  phase: fc.double({ min: 0, max: Math.PI, noNaN: true }),
  holes: fc.integer({ min: 0, max: 3 }),
  h: fc.double({ min: 0.4, max: 8, noNaN: true }),
  conductor: fc.boolean(),
  cw: fc.double({ min: 0.1, max: 0.2, noNaN: true }),
});

function prismInput(d: PrismDeclDrawn, id: string): StageInput {
  // holes ring at 0.5 r with radius 0.18 r stay inside the inradius (cos 36 degrees r for n 5) and clear of the centre insert
  // The bound also keeps holes off the outer ring, where toManifold lets a raw ManifoldError escape E_KERNEL:
  // knowledge/03-diagnostics.md, M00-T06 fault C (OPEN). Widen it as part of that fix.
  const holes = Array.from({ length: d.holes }, (_, k) => reversed(ngonRing(0.5 * d.r * Math.cos((2 * Math.PI * k) / Math.max(1, d.holes)), 0.5 * d.r * Math.sin((2 * Math.PI * k) / Math.max(1, d.holes)), 0.18 * d.r / Math.max(1, d.holes / 2), 12, 0)));
  const outline = [ngonRing(0, 0, d.r, d.n, d.phase), ...holes];
  const bodies: BodyDraft[] = [{ id: "plate", role: "body", slot: 1, material: "petg", base: { route: "prism", outline, z: [0, d.h] } }];
  if (d.conductor) {
    const w = d.cw * d.r;
    bodies.push({ id: "trace", role: "conductor", slot: 2, material: "cpla", base: { route: "prism", outline: [rect(-w, -w / 2, w, w / 2)], z: [d.h / 2, d.h] } });
  }
  return { draft: part(id, bodies), profile, mode: "sweep" };
}

// ---- stack fixtures ----

interface BandDrawn {
  readonly n: number;
  readonly r: number;
  readonly dx: number;
  readonly hole: number;
  readonly h: number;
  /** Overlap with the band below in grid steps of 1/1024 mm; 11 to 20 is 0.0107 to 0.0195 mm (computed). */
  readonly ov: number;
}

const bandArb: fc.Arbitrary<BandDrawn> = fc.record({
  n: fc.integer({ min: 3, max: 24 }),
  r: fc.double({ min: 3, max: 25, noNaN: true }),
  dx: fc.double({ min: -0.3, max: 0.3, noNaN: true }),
  hole: fc.constantFrom(0, 0, 0.3, 0.5),
  h: fc.double({ min: 0.3, max: 4, noNaN: true }),
  ov: fc.integer({ min: 11, max: 20 }),
});
const stackArb = fc.array(bandArb, { minLength: 2, maxLength: 4 });

function stackInput(bands: readonly BandDrawn[], id: string): StageInput {
  let top = 0;
  const decl = bands.map((b, i) => {
    const z0 = i === 0 ? 0 : top - b.ov / 1024;
    const z1 = (i === 0 ? 0 : top) + b.h;
    top = z1;
    // each band overlaps the one below in plan: its centre sits inside the smaller of the two footprints
    const cx = b.dx * Math.min(b.r, bands[Math.max(0, i - 1)]!.r);
    const outer = ngonRing(cx, 0, b.r, b.n, 0);
    // the hole is a fraction of the inradius r cos(pi / n), at most 0.5, so it never touches the outer ring; a hole
    // touching the inradius trips knowledge/03-diagnostics.md, M00-T06 fault C (OPEN). Widen it as part of that fix.
    const outline = b.hole > 0 ? [outer, reversed(ngonRing(cx, 0, b.r * Math.cos(Math.PI / b.n) * b.hole, 16, 0))] : [outer];
    return { outline, z: [z0, z1] as const };
  });
  return { draft: part(id, [{ id: "stack", role: "body", slot: 1, material: "petg", base: { route: "stack", bands: decl } }]), profile, mode: "sweep" };
}

// ---- revolve fixtures ----

interface RevolveDrawn {
  readonly kind: "pin" | "stepped" | "cone" | "tube";
  readonly r: number;
  readonly h: number;
  readonly k: number;
  readonly segments: number;
  readonly thread: boolean;
  readonly pitch: number;
  readonly starts: number;
}

const revolveArb: fc.Arbitrary<RevolveDrawn> = fc.record({
  kind: fc.constantFrom("pin", "stepped", "cone", "tube"),
  r: fc.double({ min: 2, max: 20, noNaN: true }),
  h: fc.double({ min: 3, max: 20, noNaN: true }),
  k: fc.double({ min: 0.4, max: 0.8, noNaN: true }),
  segments: fc.integer({ min: 24, max: 200 }),
  thread: fc.boolean(),
  pitch: fc.double({ min: 0.8, max: 2, noNaN: true }),
  starts: fc.integer({ min: 1, max: 2 }),
});

function revolveInput(d: RevolveDrawn, id: string): StageInput {
  const { r, h, k } = d;
  // thread section on the outer wall, rows every pitch / 16 so the field is sampled (TENON rows)
  const z0 = 0.2 * h, z1 = 0.8 * h;
  const side = (rr: number, za: number, zb: number): Vec2[] => {
    const rows: Vec2[] = [];
    const n = d.thread ? Math.max(1, Math.ceil((zb - za) / (d.pitch / 16))) : 1;
    for (let i = 0; i <= n; i++) rows.push([rr, za + ((zb - za) * i) / n]);
    return rows;
  };
  let profileRows: Vec2[];
  if (d.kind === "pin") profileRows = [[0, 0], ...side(r, 0, h), [0, h]];
  else if (d.kind === "stepped") profileRows = [[0, 0], ...side(r, 0, h / 2), [r * k, h / 2], [r * k, h], [0, h]];
  else if (d.kind === "cone") profileRows = [[0, 0], [r, 0], [r * k, h], [0, h]];
  else profileRows = [[r * k, 0], ...side(r, 0, h), [r * k, h]];
  const threaded = d.thread && d.kind !== "cone";
  const zTop = d.kind === "stepped" ? h / 2 : z1;
  const depth = Math.min(0.3 * d.pitch, 0.25 * r * (d.kind === "tube" ? 1 - k : 1));
  const base: ShapeDecl = {
    route: "revolve", profile: profileRows, segments: d.segments,
    ...(threaded ? { field: { id: "tenon.thread.external", params: { z0: Math.min(z0, zTop * 0.5), z1: zTop * 0.9, pitch: d.pitch, starts: d.starts, depth, chamferLo: 1, chamferHi: 1 } } } : {}),
  };
  return { draft: part(id, [{ id: "turned", role: "body", slot: 1, material: "petg", base }]), profile, mode: "sweep" };
}

// ---- the sweep ----

interface Tally {
  designs: number;
  failures: number;
  warned: number;
}
const tally: Tally = { designs: 0, failures: 0, warned: 0 };
const t0 = Date.now();

/** One design: build, audit every body and the solid, and require live count 0. Returns the problems found. */
async function check(design: Design): Promise<string[]> {
  const out = await runStages(design.input());
  const bad: string[] = [];
  for (const b of out.bodies) {
    const a = audit(b.mesh);
    if (!a.ok) bad.push(`body ${b.draft.id}: open edges ${a.openEdges}, raw open edges ${a.openEdgesRaw}, winding errors ${a.windingErrors}, degenerate ${a.degenerate}, non-manifold vertices ${a.nonManifoldVertices}, volume ${a.signedVolumeMm3} mm3 (computed)`);
  }
  const s = audit(out.solid);
  if (!s.ok) bad.push(`solid: open edges ${s.openEdges}, winding errors ${s.windingErrors}, degenerate ${s.degenerate}, non-manifold vertices ${s.nonManifoldVertices} (computed)`);
  for (const w of out.warnings) if (w.code === "AUDIT" || w.code === "HEAL_NOT_CONVERGED") bad.push(`${w.code}: ${w.text}`);
  if (liveCount() !== 0) bad.push(`live objects ${liveCount()} after the build, legal 0`);
  if (bad.length === 0 && out.warnings.length > 0) tally.warned++;
  return bad;
}

interface Family {
  readonly name: string;
  /** Share of FC_RUNS, percent. */
  readonly share: number;
  readonly arb: fc.Arbitrary<Design>;
}

const FAMILIES: readonly Family[] = [
  { name: "collar", share: 40, arb: coinArb.map((c) => ({ family: "collar", label: JSON.stringify(c), input: () => coinInput(c, "collar") })) },
  { name: "prism", share: 20, arb: prismArb.map((p) => ({ family: "prism", label: JSON.stringify(p), input: () => prismInput(p, "prism") })) },
  { name: "stack", share: 20, arb: stackArb.map((s) => ({ family: "stack", label: JSON.stringify(s), input: () => stackInput(s, "stack") })) },
  { name: "revolve", share: 20, arb: revolveArb.map((r) => ({ family: "revolve", label: JSON.stringify(r), input: () => revolveInput(r, "revolve") })) },
];

describe("100-design sweep (M00-T06)", () => {
  afterAll(() => {
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`${tally.designs} designs, ${tally.failures} failures, ${tally.warned} with warnings, ${secs} s, live objects ${liveCount()}`);
  });

  for (const fam of FAMILIES) {
    const runs = Math.round((FC_RUNS * fam.share) / 100);
    const skip = runs === 0 || (ONLY !== undefined && ONLY !== fam.name);
    it.skipIf(skip)(`${fam.name}: ${runs} designs build clean with live count 0`, async () => {
      let shrinking = false;
      const prop = fc.asyncProperty(fam.arb, async (design) => {
        if (!shrinking) tally.designs++;
        let bad: string[];
        try {
          bad = await check(design);
        } catch (e) {
          const hbf = (e as { hbf?: unknown }).hbf;
          bad = [`threw ${hbf === undefined ? String(e) : JSON.stringify(hbf)}`];
        }
        if (bad.length > 0) {
          if (!shrinking) tally.failures++;
          shrinking = true;
          throw new Error(`${design.family} ${design.label}: ${bad.join("; ")}`);
        }
      });
      const details = await fc.check(prop, {
        seed: SEED, numRuns: runs, endOnFailure: REPLAY_PATH !== undefined,
        ...(REPLAY_PATH === undefined ? {} : { path: REPLAY_PATH }),
      });
      if (details.failed) {
        console.log(`sweep failure, replay with FC_SEED=${details.seed} FC_PATH=${details.counterexamplePath ?? ""} FC_FAMILY=${fam.name} npm run sweep -w packages/mesh`);
        console.log(String(details.errorInstance instanceof Error ? details.errorInstance.message : details.errorInstance));
      }
      expect(details.failed).toBe(false);
    }, TIMEOUT_MS);
  }
});
