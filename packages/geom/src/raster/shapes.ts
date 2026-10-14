// COLLAR blank shapes as implicit functions, f <= 0 inside, and the outline
// radius along a ray (collar.html lines 668 to 732, the outline table at 898
// to 909, lineage collar.bench/geom-raster-shapes). Every expression keeps
// the legacy operand order and the table stays Float32Array, so a port that
// reads it labels the same cells. The rounded-box distance is geom's
// rrectDistance, which is the same expression (rrect.ts).

import { rrectDistance } from "../rrect.js";

export type ShapeKind = "round" | "squircle" | "rounded" | "dogtag" | "bar" | "hex" | "oct" | "tri" | "shield";

/** aspect and corner are ratios, unitless. */
export interface ShapeParams {
  readonly aspect: number;
  readonly corner: number;
}

export interface ShapeDef {
  readonly label: string;
  /** Implicit function at (x, y) mm for a blank of nominal radius R mm. */
  readonly f: (x: number, y: number, R: number, p: ShapeParams) => number;
}

const box = (x: number, y: number, a: number, b: number, rc: number): number => rrectDistance({ cx: 0, cy: 0, a, b, rc }, [x, y]);

/** Largest support distance of a regular n-gon of circumradius R, a vertex at the top. */
export function ngon(x: number, y: number, R: number, n: number): number {
  let m = -1e9;
  const ap = R * Math.cos(Math.PI / n);
  for (let k = 0; k < n; k++) {
    const a = Math.PI / 2 + 2 * Math.PI * k / n;
    m = Math.max(m, x * Math.cos(a) + y * Math.sin(a) - ap);
  }
  return m;
}

export const SHAPES: Readonly<Record<ShapeKind, ShapeDef>> = {
  round: { label: "round", f: (x, y, R) => Math.hypot(x, y) - R },
  squircle: { label: "squircle", f: (x, y, R) => Math.pow(Math.abs(x / R), 4) + Math.pow(Math.abs(y / R), 4) - 1 },
  rounded: {
    label: "rounded square",
    f: (x, y, R, p) => {
      const a = R / Math.SQRT2, rc = Math.min(a, a) * p.corner;
      return box(x, y, a, a, rc);
    },
  },
  dogtag: {
    label: "dog tag",
    f: (x, y, R, p) => {
      const a = R, b = R * p.aspect;
      return box(x, y, a, b, b);
    },
  },
  bar: {
    label: "rounded bar",
    f: (x, y, R, p) => {
      const a = R, b = R * p.aspect;
      return box(x, y, a, b, b * p.corner);
    },
  },
  hex: { label: "hexagon", f: (x, y, R) => ngon(x, y, R, 6) },
  oct: { label: "octagon", f: (x, y, R) => ngon(x, y, R, 8) },
  tri: { label: "triangle", f: (x, y, R) => ngon(x, y, R, 3) },
  shield: {
    label: "shield",
    f: (x, y, R) => {
      const a = R * 0.82, top = R * 0.72;
      if (y >= 0) return box(x, y - top * 0.35, a, top * 0.65, R * 0.18);
      const t = -y / (R * 1.0);
      const w = a * Math.sqrt(Math.max(0, 1 - t * t * t * 1.05));
      return Math.abs(x) - w;
    },
  },
};

/** Outline radius in mm along angle theta (radians) by 26 bisection steps between 0 and 1.05 R. */
export function shapeR(kind: ShapeKind, p: ShapeParams, R: number, theta: number): number {
  const sh = SHAPES[kind];
  if (kind === "round") return R;
  const c = Math.cos(theta), s = Math.sin(theta);
  let lo = 0, hi = R * 1.05;
  for (let i = 0; i < 26; i++) {
    const m = (lo + hi) / 2;
    if (sh.f(m * c, m * s, R, p) <= 0) lo = m; else hi = m;
  }
  return lo;
}

/** Angular samples in the outline table (collar.html LUT_N). */
export const OUTLINE_LUT_N = 8192;

/**
 * Outline radius at n angles from -pi, scaled so the widest point is dia / 2
 * (collar.html baseLUT): a squircle or a shield never pokes past the size asked for.
 */
export function outlineLUT(kind: ShapeKind, p: ShapeParams, dia: number, n: number = OUTLINE_LUT_N): Float32Array {
  const R = dia / 2;
  const out = new Float32Array(n);
  let mx = 0;
  for (let i = 0; i < n; i++) {
    out[i] = shapeR(kind, p, R, (i / n) * 2 * Math.PI - Math.PI);
    if (out[i]! > mx) mx = out[i]!;
  }
  if (mx > 0) {
    const k = R / mx;
    for (let i = 0; i < n; i++) out[i] = out[i]! * k;
  }
  return out;
}

/** Smallest outline radius in the table, mm (collar.html shapeMinR). */
export function outlineMinR(lut: Float32Array): number {
  let m = 1e9;
  for (const v of lut) if (v < m) m = v;
  return m;
}
