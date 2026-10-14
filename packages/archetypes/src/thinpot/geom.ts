// The THINPOT geometry kernel's 2D helpers, ported line for line from
// originals/thinpot/files/feeler_thinpot.html (thinpot.md 4.1): area, ccw,
// cw and bbox (lines 349 to 352), rect (354), circle (371), ngon (376),
// sector (381), dedupe (389), cleanLoop (398 to 410), stroke (419 to 480)
// and serpentine (896 to 911). The archetypes ported from the page build
// their outlines through these, so a port regenerates the page's vertices
// to the bit; the arc points take Math.cos and Math.sin as the page does
// (D-175 keeps per-count tables for the kernel's own circles).

import type { Vec2 } from "@hackbuild/spec";

export type Loop = Vec2[];

/** Signed area, positive counter-clockwise (line 349). */
export function area(p: readonly Vec2[]): number {
  let a = 0;
  for (let i = 0, n = p.length; i < n; i++) { const q = p[(i + 1) % n] as Vec2; const v = p[i] as Vec2; a += v[0] * q[1] - q[0] * v[1]; }
  return a / 2;
}
export const ccw = (p: readonly Vec2[]): Loop => (area(p) > 0 ? [...p] : [...p].reverse());
export const cw = (p: readonly Vec2[]): Loop => (area(p) < 0 ? [...p] : [...p].reverse());

/** [x0, y0, x1, y1] (line 352). */
export function bbox(p: readonly Vec2[]): [number, number, number, number] {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const v of p) { if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0]; if (v[1] < y0) y0 = v[1]; if (v[1] > y1) y1 = v[1]; }
  return [x0, y0, x1, y1];
}

export const rect = (x: number, y: number, w: number, h: number): Loop => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

/** Default segments max(16, round(6 r)) (line 372). */
export function circle(cx: number, cy: number, r: number, seg?: number): Loop {
  const n = seg ?? Math.max(16, Math.round(r * 6));
  const p: Loop = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return p;
}

export function ngon(cx: number, cy: number, r: number, n: number, rot = 0): Loop {
  const p: Loop = [];
  for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI * 2; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return p;
}

/** Annular sector as a closed loop, default segments max(6, round(|a1 - a0| r1 / 1.2)) (line 381). */
export function sector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number, seg?: number): Loop {
  const n = seg ?? Math.max(6, Math.round((Math.abs(a1 - a0) * r1) / 1.2));
  const p: Loop = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; p.push([cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)]); }
  for (let i = n; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / n; p.push([cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)]); }
  return dedupe(p);
}

/** Drops repeats within 1e-6 and a closing repeat (line 389). */
export function dedupe(p: readonly Vec2[]): Loop {
  const out: Loop = [];
  for (const v of p) {
    const q = out[out.length - 1];
    if (q === undefined || Math.abs(q[0] - v[0]) > 1e-6 || Math.abs(q[1] - v[1]) > 1e-6) out.push(v);
  }
  while (out.length > 2 && Math.abs((out[0] as Vec2)[0] - (out[out.length - 1] as Vec2)[0]) < 1e-6 && Math.abs((out[0] as Vec2)[1] - (out[out.length - 1] as Vec2)[1]) < 1e-6) out.pop();
  return out;
}

/** dedupe plus removal of exactly collinear vertices, as the page cleans every prism loop (line 398). */
export function cleanLoop(p0: readonly Vec2[]): Loop {
  const p = dedupe(p0);
  let again = true;
  while (again && p.length > 3) {
    again = false;
    for (let i = 0; i < p.length; i++) {
      const a = p[(i + p.length - 1) % p.length] as Vec2, b = p[i] as Vec2, c = p[(i + 1) % p.length] as Vec2;
      if ((b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]) === 0) { p.splice(i, 1); again = true; break; }
    }
  }
  return p;
}

/** A polyline as a closed band of width w: round outside corners, mitred inside corners, round or flat caps (line 419). */
export function stroke(pts0: readonly Vec2[], w: number, capStyle?: "round"): Loop {
  const hw = w / 2;
  const pts = dedupe(pts0);
  if (pts.length < 2) { const p = pts[0] as Vec2; return circle(p[0], p[1], hw, 16); }
  const nrm = (a: Vec2, b: Vec2): Vec2 => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L]; };
  let left: Loop = [], right: Loop = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i] as Vec2, b = pts[i + 1] as Vec2, n = nrm(a, b);
    left.push([a[0] + n[0] * hw, a[1] + n[1] * hw]);
    left.push([b[0] + n[0] * hw, b[1] + n[1] * hw]);
    right.push([a[0] - n[0] * hw, a[1] - n[1] * hw]);
    right.push([b[0] - n[0] * hw, b[1] - n[1] * hw]);
  }
  const joinify = (side: Loop, sign: number): Loop => {
    const res: Loop = [side[0] as Vec2];
    for (let k = 1; k < side.length - 1; k += 2) {
      const a = side[k] as Vec2, b = side[k + 1] as Vec2, ci = (k + 1) / 2, cpt = pts[ci] as Vec2;
      const pa = pts[ci - 1] as Vec2, pc = pts[ci + 1] as Vec2;
      const cross = (cpt[0] - pa[0]) * (pc[1] - cpt[1]) - (cpt[1] - pa[1]) * (pc[0] - cpt[0]);
      if (sign * cross < 0) {
        res.push(a);
        const a0 = Math.atan2(a[1] - cpt[1], a[0] - cpt[0]), a1 = Math.atan2(b[1] - cpt[1], b[0] - cpt[0]);
        let d = a1 - a0;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        const st = Math.max(1, Math.ceil(Math.abs(d) / 0.4));
        for (let j = 1; j < st; j++) { const an = a0 + (d * j) / st; res.push([cpt[0] + hw * Math.cos(an), cpt[1] + hw * Math.sin(an)]); }
        res.push(b);
      } else {
        const d1: Vec2 = [cpt[0] - pa[0], cpt[1] - pa[1]], d2: Vec2 = [pc[0] - cpt[0], pc[1] - cpt[1]];
        const den = d1[0] * d2[1] - d1[1] * d2[0];
        let hit: Vec2 | null = null;
        if (Math.abs(den) > 1e-12) {
          const t = ((b[0] - a[0]) * d2[1] - (b[1] - a[1]) * d2[0]) / den;
          const mx = a[0] + d1[0] * t, my = a[1] + d1[1] * t;
          if (Math.hypot(mx - cpt[0], my - cpt[1]) < hw * 3) hit = [mx, my];
        }
        if (hit !== null) res.push(hit); else { res.push(a); res.push(b); }
      }
    }
    res.push(side[side.length - 1] as Vec2);
    return res;
  };
  left = joinify(left, 1); right = joinify(right, -1);
  const out: Loop = left.slice();
  if (capStyle === "round") {
    const e = pts[pts.length - 1] as Vec2, last = out[out.length - 1] as Vec2;
    const ae = Math.atan2(last[1] - e[1], last[0] - e[0]);
    for (let t = 1; t < 8; t++) out.push([e[0] + hw * Math.cos(ae - (Math.PI * t) / 8), e[1] + hw * Math.sin(ae - (Math.PI * t) / 8)]);
  }
  for (let i = right.length - 1; i >= 0; i--) out.push(right[i] as Vec2);
  if (capStyle === "round") {
    const s0 = pts[0] as Vec2, last = out[out.length - 1] as Vec2;
    const as = Math.atan2(last[1] - s0[1], last[0] - s0[0]);
    for (let t = 1; t < 8; t++) out.push([s0[0] + hw * Math.cos(as - (Math.PI * t) / 8), s0[1] + hw * Math.sin(as - (Math.PI * t) / 8)]);
  }
  return dedupe(out);
}

/** A serpentine polyline inside w x h with n legs, U turns of 8 segments (line 896). */
export function serpentine(x0: number, y0: number, w: number, h: number, n: number, margin: number): Loop {
  const pts: Loop = [];
  const pitch = n > 1 ? (h - 2 * margin) / (n - 1) : 0;
  const r = pitch / 2;
  let xa = x0 + margin + r, xb = x0 + w - margin - r;
  if (xb < xa) { const mid = (xa + xb) / 2; xa = mid - 0.01; xb = mid + 0.01; }
  for (let i = 0; i < n; i++) {
    const y = y0 + margin + i * pitch, l = i % 2 === 0;
    pts.push([l ? xa : xb, y], [l ? xb : xa, y]);
    if (i < n - 1 && r > 1e-6) {
      const cx = l ? xb : xa, cy = y + r, a0 = -Math.PI / 2, dir = l ? 1 : -1;
      for (let k = 1; k < 8; k++) pts.push([cx + r * Math.cos(a0 + (dir * Math.PI * k) / 8), cy + r * Math.sin(a0 + (dir * Math.PI * k) / 8)]);
    }
  }
  return dedupe(pts);
}

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** The page's resistance readout format (line 3044). */
export function fmtR(r: number): string {
  if (!Number.isFinite(r)) return "inf";
  if (r >= 1e6) return `${(r / 1e6).toFixed(2)} Mohm`;
  if (r >= 1e3) return `${(r / 1e3).toFixed(2)} kohm`;
  return `${r.toFixed(1)} ohm`;
}

export const rectC = (cx: number, cy: number, w: number, h: number): Loop => rect(cx - w / 2, cy - h / 2, w, h);

/** A rounded rectangle centred at (cx, cy), seg points per corner arc (line 357). */
export function rrect(cx: number, cy: number, w: number, h: number, r0: number, seg = 8): Loop {
  const r = Math.min(r0, w / 2, h / 2);
  if (r <= 1e-9) return rectC(cx, cy, w, h);
  const p: Loop = [], hw = w / 2 - r, hh = h / 2 - r;
  const cs = [[hw, hh, 0], [-hw, hh, Math.PI / 2], [-hw, -hh, Math.PI], [hw, -hh, Math.PI * 1.5]] as const;
  for (const c of cs) for (let k = 0; k <= seg; k++) { const a = c[2] + (k / seg) * Math.PI / 2; p.push([cx + c[0] + r * Math.cos(a), cy + c[1] + r * Math.sin(a)]); }
  return dedupe(p);
}
