// Verbatim port of the COLLAR blank shapes: SHAPES, rrect and ngon, with
// type annotations added and nothing else changed.
// Source: /Users/obsidian/Projects/hackbuild/fab-work-directory/benches/collar-coin/outputs/collar/collar.html
// lines 668 to 721, sha256 ef0864ab66ca40e2930d12aba4cab3159aa470f743eee533d052fc99f844fd46
// (identical to the lineage row collar.bench/collar-7). Defaults from ST at
// lines 643 to 657: dia 44, aspect 0.72, corner 0.3, rim w 2.2, cham 0.5.

export interface ShapeParams {
  readonly aspect: number;
  readonly corner: number;
}

export interface ShapeDef {
  readonly label: string;
  readonly f: (x: number, y: number, R: number, p: ShapeParams) => number;
}

export const ST_DEFAULTS = { dia: 44, cham: 0.5, shape: { aspect: 0.72, corner: 0.3 }, rim: { w: 2.2 } } as const;

export const SHAPES: Record<string, ShapeDef> = {
  round: { label: 'round', f: (x, y, R) => Math.hypot(x, y) - R },
  squircle: {
    label: 'squircle',
    f: (x, y, R) => Math.pow(Math.abs(x / R), 4) + Math.pow(Math.abs(y / R), 4) - 1
  },
  rounded: {
    label: 'rounded square',
    f: (x, y, R, p) => {
      const a = R / Math.SQRT2, rc = Math.min(a, a) * p.corner;
      return rrect(x, y, a, a, rc);
    }
  },
  dogtag: {
    label: 'dog tag',
    f: (x, y, R, p) => {
      const a = R, b = R * p.aspect;
      return rrect(x, y, a, b, b);
    }
  },
  bar: {
    label: 'rounded bar',
    f: (x, y, R, p) => {
      const a = R, b = R * p.aspect;
      return rrect(x, y, a, b, b * p.corner);
    }
  },
  hex: { label: 'hexagon', f: (x, y, R) => ngon(x, y, R, 6) },
  oct: { label: 'octagon', f: (x, y, R) => ngon(x, y, R, 8) },
  tri: { label: 'triangle', f: (x, y, R) => ngon(x, y, R, 3) },
  shield: {
    label: 'shield',
    f: (x, y, R, p) => {
      const a = R * 0.82, top = R * 0.72;
      if (y >= 0) return rrect(x, y - top * 0.35, a, top * 0.65, R * 0.18);
      const t = -y / (R * 1.0);
      const w = a * Math.sqrt(Math.max(0, 1 - t * t * t * 1.05));
      return Math.abs(x) - w;
    }
  }
};
export function rrect(x: number, y: number, a: number, b: number, rc: number): number {
  const qx = Math.abs(x) - (a - rc), qy = Math.abs(y) - (b - rc);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rc;
}
export function ngon(x: number, y: number, R: number, n: number): number {
  let m = -1e9;
  const ap = R * Math.cos(Math.PI / n);
  for (let k = 0; k < n; k++) {
    const a = Math.PI / 2 + 2 * Math.PI * k / n;
    m = Math.max(m, x * Math.cos(a) + y * Math.sin(a) - ap);
  }
  return m;
}
