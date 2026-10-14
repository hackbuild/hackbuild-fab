// The TUMBLER geometry kit, ported from the canonical original
// (originals/tumbler/files/tumbler.html, lineage tumbler.bench/harvest)
// lines 186 to 359, 452 to 570: the point-list builders, the part model,
// partWarnings as sheetAudit, packSheet and the shared mechanism shapes.
// Float64 throughout and the legacy arithmetic order kept term for term,
// so every vertex reproduces the original's bit for bit (M06-T02 step 3).
// The SVG string builders and the ISO painter stay in the original; the
// viewer arrives in M09.

/** A 2D point, mm. */
export type Pt = readonly [number, number];
/** A closed (outer, hole) or open (score) point list, mm. */
export type Pts = readonly Pt[];

export const TAU = Math.PI * 2;
export const D2R = Math.PI / 180;

/** Round to 0.001, the original's r2 (line 187); readouts print through it. */
export const r2 = (n: number): number => Math.round(n * 1000) / 1000;
export const cl = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const ease = (t: number): number => {
  t = cl(t, 0, 1);
  return t * t * (3 - 2 * t);
};

export const rectPts = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

export function circPts(cx: number, cy: number, r: number, n?: number): Pt[] {
  const k = n || 26;
  const o: Pt[] = [];
  for (let i = 0; i < k; i++) {
    const a = (i * TAU) / k;
    o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return o;
}

export function slotPts(cx: number, cy: number, len: number, w: number, ang?: number): Pt[] {
  const r = Math.max(w / 2, 0.05);
  const L = Math.max(len / 2 - r, 0.01);
  const o: Pt[] = [];
  for (let i = 0; i <= 7; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 7;
    o.push([L + r * Math.cos(a), r * Math.sin(a)]);
  }
  for (let i = 0; i <= 7; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 7;
    o.push([-L + r * Math.cos(a), r * Math.sin(a)]);
  }
  const s = Math.sin((ang || 0) * D2R);
  const c = Math.cos((ang || 0) * D2R);
  return o.map((p) => [cx + p[0] * c - p[1] * s, cy + p[0] * s + p[1] * c]);
}

export const movePts = (pts: Pts, dx: number, dy: number): Pt[] => pts.map((p) => [p[0] + dx, p[1] + dy]);

export function scalePtsC(pts: Pts, s: number): Pt[] {
  let cx = 0;
  let cy = 0;
  pts.forEach((p) => {
    cx += p[0];
    cy += p[1];
  });
  cx /= pts.length;
  cy /= pts.length;
  return pts.map((p) => [cx + (p[0] - cx) * s, cy + (p[1] - cy) * s]);
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export function bboxPts(pts: Pts): Box {
  const a = [1e9, 1e9];
  const b = [-1e9, -1e9];
  pts.forEach((p) => {
    a[0] = Math.min(a[0]!, p[0]);
    a[1] = Math.min(a[1]!, p[1]);
    b[0] = Math.max(b[0]!, p[0]);
    b[1] = Math.max(b[1]!, p[1]);
  });
  return { x: a[0]!, y: a[1]!, w: b[0]! - a[0]!, h: b[1]! - a[1]! };
}

export function keyedBorePts(cx: number, cy: number, r: number, kw: number, kd: number): Pt[] {
  const dA = Math.asin(cl(kw / 2 / r, 0, 0.9));
  const a0 = Math.PI * 1.5;
  const inNotch = (a: number): boolean => Math.abs(((a - a0 + Math.PI * 3) % TAU) - Math.PI) < dA;
  // The notch sits at the top (-y); the key slot is part of the same hole (record 4.1).
  const p1: Pt = [cx + r * Math.cos(a0 - dA), cy + r * Math.sin(a0 - dA)];
  const p2: Pt = [cx + r * Math.cos(a0 + dA), cy + r * Math.sin(a0 + dA)];
  const res: Pt[] = [];
  let done = false;
  for (let i = 0; i < 28; i++) {
    const a = (i * TAU) / 28;
    if (inNotch(a)) {
      if (!done) {
        res.push(p1, [p1[0], p1[1] - kd], [p2[0], p2[1] - kd], p2);
        done = true;
      }
      continue;
    }
    res.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  if (!done) res.push(p1, [p1[0], p1[1] - kd], [p2[0], p2[1] - kd], p2);
  return res;
}

export function ratchetPts(teethIn: number, rad: number, depth: number, rake: number, cx: number, cy: number): Pt[] {
  const teeth = Math.max(4, Math.round(teethIn));
  const pts: Pt[] = [];
  for (let i = 0; i < teeth; i++) {
    const a0 = (i * TAU) / teeth;
    const a1 = ((i + 1) * TAU) / teeth;
    const ar = a0 + (a1 - a0) * cl(rake / 90, 0.02, 0.9);
    pts.push([cx + rad * Math.cos(a0), cy + rad * Math.sin(a0)]);
    pts.push([cx + (rad - depth) * Math.cos(ar), cy + (rad - depth) * Math.sin(ar)]);
  }
  return pts;
}

export interface Gear {
  readonly pts: Pt[];
  /** Pitch, tip, root and base radii, mm. */
  readonly rp: number;
  readonly ra: number;
  readonly rd: number;
  readonly rb: number;
}

/** Involute spur outline (line 264): rp = m z / 2, ra = rp + m, rd = rp - 1.25 m, inv(a) = tan a - a. */
export function gearPts(teethIn: number, mod: number, pa: number, cx: number, cy: number): Gear {
  const teeth = Math.max(6, Math.round(teethIn));
  const rp = (mod * teeth) / 2;
  const rb = rp * Math.cos(pa * D2R);
  const ra = rp + mod;
  const rd = rp - 1.25 * mod;
  const inv = (r: number): number => {
    const al = Math.acos(cl(rb / r, -1, 1));
    return Math.tan(al) - al;
  };
  const th = (r: number): number => inv(Math.max(r, rb)) - inv(rp);
  const half = Math.PI / (2 * teeth);
  const rs = Math.max(rb + 1e-4, Math.min(rd, rp));
  const N = 8;
  const pts: Pt[] = [];
  const put = (r: number, a: number): void => {
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  };
  for (let i = 0; i < teeth; i++) {
    const c = (i * TAU) / teeth;
    put(rd, c - half * 1.6);
    put(rs, c - half + th(rs));
    for (let j = 1; j <= N; j++) {
      const r = lerp(rs, ra, j / N);
      const a = c - half + th(r);
      const am = c + half - th(r);
      put(r, Math.min(a, (a + am) / 2));
    }
    for (let j = N; j >= 1; j--) {
      const r = lerp(rs, ra, j / N);
      const a = c + half - th(r);
      const am = c - half + th(r);
      put(r, Math.max(a, (a + am) / 2));
    }
    put(rs, c + half - th(rs));
    put(rd, c + half * 1.6);
  }
  return { pts, rp, ra, rd, rb };
}

export interface GenevaGeo {
  readonly n: number;
  /** Centre distance, wheel radius and lock disc radius, mm. */
  readonly c: number;
  readonly wr: number;
  readonly rl: number;
}

/** Line 282: c = crankR / sin(pi/n), wr = c cos(pi/n), rl = 0.92 crankR. */
export function genevaGeo(nIn: number, crankR: number): GenevaGeo {
  const n = Math.max(3, Math.round(nIn));
  const c = crankR / Math.sin(Math.PI / n);
  const wr = c * Math.cos(Math.PI / n);
  const rl = crankR * 0.92;
  return { n, c, wr, rl };
}

/** Geneva wheel with open radial slots and locking scallops (line 288). */
export function genevaPts(n: number, crankR: number, sw: number, cx: number, cy: number): Pt[] {
  const { c, wr, rl } = genevaGeo(n, crankR);
  const dA = Math.asin(cl(sw / 2 / wr, 0, 0.6));
  const tOut = Math.sqrt(Math.max(wr * wr - (sw * sw) / 4, 1));
  const tIn = Math.max(c - crankR - 0.8, wr * 0.25);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i * TAU) / n;
    const aPrev = ((i - 1) * TAU) / n;
    const mid = a - Math.PI / n;
    const from = aPrev + dA;
    const to = a - dA;
    const M = 14;
    for (let k = 0; k <= M; k++) {
      const th = lerp(from, to, k / M);
      const ph = th - mid;
      let r = wr;
      const s = c * Math.sin(ph);
      if (Math.abs(s) < rl) {
        const rs = c * Math.cos(ph) - Math.sqrt(rl * rl - s * s);
        if (rs < r && rs > tIn * 0.9) r = rs;
      }
      pts.push([cx + r * Math.cos(th), cy + r * Math.sin(th)]);
    }
    const u = [Math.cos(a), Math.sin(a)] as const;
    const v = [-Math.sin(a), Math.cos(a)] as const;
    pts.push([cx + u[0] * tIn - (v[0] * sw) / 2, cy + u[1] * tIn - (v[1] * sw) / 2]);
    pts.push([cx + u[0] * tIn + (v[0] * sw) / 2, cy + u[1] * tIn + (v[1] * sw) / 2]);
    pts.push([cx + u[0] * tOut + (v[0] * sw) / 2, cy + u[1] * tOut + (v[1] * sw) / 2]);
  }
  return pts;
}

/** Living hinge slot field (line 311): staggered rows, every other row offset by half a slot. */
export function hingeFieldPts(x: number, y: number, w: number, h: number, rows: number, slotLen: number, gapEnd: number, slotW: number): Pt[][] {
  const out: Pt[][] = [];
  const pitch = h / (rows + 1);
  for (let r = 1; r <= rows; r++) {
    const yy = y + pitch * r;
    const off = r % 2 ? 0 : (slotLen + gapEnd) / 2;
    for (let cx = x - slotLen / 2 + off; cx < x + w + slotLen; cx += slotLen + gapEnd) {
      const a = Math.max(cx - slotLen / 2, x + 1.2);
      const b = Math.min(cx + slotLen / 2, x + w - 1.2);
      if (b - a > slotW * 1.4) out.push(slotPts((a + b) / 2, yy, b - a, slotW, 0));
    }
  }
  return out;
}

/**
 * Finger edge (line 322): 2n + 1 segments of L / (2n + 1); each outward
 * finger is one kerf wider and each gap one kerf narrower, so a tab is
 * pitch plus one kerf and a slot pitch minus one kerf (D-058 finger check).
 */
export function fingerEdgePts(x0: number, y0: number, len: number, nIn: number, depth: number, kerf: number, invert: boolean): Pt[] {
  const n = Math.max(1, Math.round(nIn));
  const seg = len / (2 * n + 1);
  const pts: Pt[] = [[x0, y0]];
  let x = x0;
  const up = invert ? -1 : 1;
  for (let i = 0; i < 2 * n + 1; i++) {
    const outward = i % 2 === 1;
    const w = seg + (outward ? kerf : -kerf);
    if (outward) {
      pts.push([x, y0 + up * depth]);
      pts.push([x + w, y0 + up * depth]);
      pts.push([x + w, y0]);
      x += w;
    } else {
      x += w;
      pts.push([x, y0]);
    }
  }
  return pts;
}

/** One cut part (line 336): one closed outer loop, closed holes inside it, open score polylines. */
export interface SheetPart {
  readonly name: string;
  /** Extents, mm. */
  readonly w: number;
  readonly h: number;
  readonly outer: Pts;
  readonly holes: readonly Pts[];
  readonly score: readonly Pts[];
}

/** partN (line 449): normalise to the part's own origin and derive w and h. */
export function partN(name: string, outer: Pts, holes?: readonly (Pts | null | undefined)[], score?: readonly (Pts | null | undefined)[]): SheetPart {
  const bb = bboxPts(outer);
  const mv = (pts: Pts): Pt[] => movePts(pts, -bb.x, -bb.y);
  return {
    name, w: bb.w, h: bb.h, outer: mv(outer),
    holes: (holes ?? []).filter((x): x is Pts => Boolean(x)).map(mv),
    score: (score ?? []).filter((x): x is Pts => Boolean(x)).map(mv),
  };
}

/**
 * partWarnings (lines 339 to 348) as sheetAudit (M06-T02 step 4): a hole
 * whose bounding box crosses the outline by more than 0.01 mm, and a hole
 * thinner than 1.5 kerf, which fuses shut. The second test is skipped at
 * kerf 0 (the print rows). The strings are the original's.
 */
export function sheetAudit(p: SheetPart, kerf: number): string[] {
  const w: string[] = [];
  const ob = bboxPts(p.outer);
  p.holes.forEach((h, i) => {
    const hb = bboxPts(h);
    if (hb.x < ob.x - 0.01 || hb.y < ob.y - 0.01 || hb.x + hb.w > ob.x + ob.w + 0.01 || hb.y + hb.h > ob.y + ob.h + 0.01) {
      w.push(`${p.name}: hole ${i + 1} crosses the outline`);
    }
    if (Math.min(hb.w, hb.h) < kerf * 1.5 && kerf > 0) w.push(`${p.name}: hole ${i + 1} thinner than 1.5 kerf, it will fuse shut`);
  });
  return w;
}

export interface Placed {
  readonly p: SheetPart;
  readonly x: number;
  readonly y: number;
}

/** packSheet (lines 350 to 359): the shelf packer the cut file uses, sheet 240 mm wide, gap 9. */
export function packSheet(parts: readonly SheetPart[], sheetW: number, gapIn?: number): { readonly placed: Placed[]; readonly w: number; readonly h: number } {
  const gap = gapIn || 9;
  let x = gap;
  let y = gap + 4;
  let rowH = 0;
  let maxX = 0;
  const out: Placed[] = [];
  parts.forEach((p) => {
    if (x + p.w + gap > sheetW && x > gap) {
      x = gap;
      y += rowH + gap;
      rowH = 0;
    }
    out.push({ p, x, y });
    x += p.w + gap;
    rowH = Math.max(rowH, p.h);
    maxX = Math.max(maxX, x);
  });
  return { placed: out, w: Math.max(maxX + gap, 60), h: y + rowH + gap };
}

/** hingeBandPts (line 556): the bent hinge band as an (x, z) profile, used by the 3D view. */
export function hingeBandPts(R: number, legL: number, ang: number, t: number): Pt[] {
  const C = [legL, R + t] as const;
  const N = Math.max(6, Math.round(ang / 0.12));
  const pts: Pt[] = [[0, 0]];
  for (let k = 0; k <= N; k++) {
    const a = (ang * k) / N;
    pts.push([C[0] + (R + t) * Math.sin(a), C[1] - (R + t) * Math.cos(a)]);
  }
  const tg = [Math.cos(ang), Math.sin(ang)] as const;
  const Po = [C[0] + (R + t) * Math.sin(ang), C[1] - (R + t) * Math.cos(ang)] as const;
  const Pi = [C[0] + R * Math.sin(ang), C[1] - R * Math.cos(ang)] as const;
  pts.push([Po[0] + tg[0] * legL, Po[1] + tg[1] * legL], [Pi[0] + tg[0] * legL, Pi[1] + tg[1] * legL]);
  for (let k = N; k >= 0; k--) {
    const a = (ang * k) / N;
    pts.push([C[0] + R * Math.sin(a), C[1] - R * Math.cos(a)]);
  }
  pts.push([0, t]);
  return pts;
}

/** A whole number with comma thousands, as the original's toLocaleString prints in en-US ("3,125"). */
export function grouped(n: number): string {
  const s = String(Math.trunc(Math.abs(n)));
  const g = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return n < 0 ? `-${g}` : g;
}
