// The TOGGLE stick solver (toggle.md 5.1 to 5.7, canon tilt-stick, TOGGLE
// presets), ported from originals/toggle/files/src/src: part2d.js
// layoutXY (lines 13 to 117, the plan view; terminal and BLOCKS position
// lists are dropped, the outline the sampler reads is kept) and stack
// (lines 146 to 167); part2b.js occ, samples, profileSegs, hits,
// thetaFirst, bandPen, setGate, solveZ, contact and physics (lines 10 to
// 295); part2a.js capTop (lines 85 to 102). The arithmetic keeps the
// original's order of operations so the bisections land on the same bits.
//
// What the router decides in the original (the trace layer count, the lead
// angles, the COM column gap, each net's trace length and vias) arrives as
// input here: the router is canon router-negotiated (M10-T13), and the
// host of an archetype routes its own leads.

const D2R = Math.PI / 180;

export type Gate = "round" | "square" | "octagon";
export type CapTop = "dish" | "dome" | "flat";

/** The TOGGLE state the solver reads, flat (part2a.js blankState, lines 26 to 38). */
export interface ToggleState {
  readonly neckD: number; readonly neckL: number; readonly collarD: number; readonly bandH: number; readonly stemD: number;
  readonly tilt: number; readonly over: number; readonly gate: Gate; readonly capD: number; readonly rimT: number;
  readonly top: CapTop; readonly topH: number; readonly edge: number; readonly dish: number;
  readonly tex: "dots" | "rings" | "ribs" | "knurl" | "none"; readonly texH: number;
  readonly base: "solo" | "blocks"; readonly dirs: 4 | 8; readonly outline: "square" | "round"; readonly size: number; readonly auto: boolean;
  readonly term: "header" | "wire" | "pads"; readonly bore: number; readonly studs: number; readonly pegs: "both" | "top" | "bottom";
  readonly padD: number; readonly split: number; readonly gap: number; readonly margin: number;
  readonly pivot: number; readonly E: number; readonly rhoT: number; readonly rc: number; readonly vcc: number; readonly minGap: number;
  /** Trace layers the original's router settled on (1 or 2). */
  readonly layers: 1 | 2;
}

export interface Sector { readonly c: number; readonly a0: number; readonly a1: number; readonly half: number }
export interface Slab { readonly name: string; readonly z0: number; readonly z1: number }
interface Samples { r: number[]; h: number[]; tag: string[] }
interface Seg { readonly pts: readonly [readonly [number, number], readonly [number, number]]; readonly tag: string; readonly trimA?: number; readonly trimB?: number }

/** The solved plan and vertical stack; every field is the original's G field of the same name. */
export interface ToggleG {
  L: number; warn: string[]; notes: string[]; blocks: boolean; dirs: 4 | 8; gate: Gate;
  w: number; clr: number; cons: number; edge: number;
  rn: number; neckL: number; pivot: number; r0: number; bandH: number; alpha: number; over: number; r1: number; rs: number; Rd: number; rimT: number; rf: number;
  riser: number; Rw: number; pd: number; Re: number; RA: number; needR: number; sectors: Sector[];
  outKind: "square" | "round"; outR: number; outHx: number; outHy0: number; outHy1: number; size: number; studs: number;
  floor: Slab[]; zf: number; layers: number; traceT: number; sepT: number; trace: Slab[]; topTrace: Slab;
  zn1: number; zp: number; zb0: number; zb1: number; zci: number; zc0: number; zc1: number; zB0: number; zB1: number; zA0: number; zA1: number;
  contactB: number; contactA: number; zr0: number; tLip: number; thS: number; roofLift: number;
  rh: number; K: number; roofTop: number; zT: number; zcb: number; zrim: number; ztop: number;
  capTop: { pts: [number, number, boolean][]; Ri: number };
  thContact: number; thStop: number; thStop45: number; restOk: boolean; restBand: number; squeeze: number;
}

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const angNorm = (a: number): number => { a %= 2 * Math.PI; return a < 0 ? a + 2 * Math.PI : a; };
const inArc = (a: number, a0: number, a1: number): boolean => angNorm(a - a0) <= angNorm(a1 - a0);

function inGate(shape: Gate, r: number, x: number, y: number): boolean {
  const ax = Math.abs(x), ay = Math.abs(y);
  if (shape === "square") return Math.max(ax, ay) < r;
  if (shape === "octagon") return Math.max(ax, ay, (ax + ay) / Math.SQRT2) < r;
  return Math.hypot(x, y) < r;
}

function clampW(W: string[], v: number, a: number, b: number, what: string): number {
  if (!(v >= a)) { W.push(what + " raised to " + a); return a; }
  if (v > b) { W.push(what + " cut to " + b); return b; }
  return v;
}

/** TOGGLE internals, part2d.js line 19: trace width, clearance, lathe keep-out margin, body edge, mm. */
export const TOGGLE_INTERNALS = { w: 1.0, clr: 0.6, cons: 0.2, edge: 0.8 } as const;

/** part2d.js layoutXY: radii, well, sectors and the outline, at layer L. */
export function layoutXY(S: ToggleState, L: number): ToggleG {
  const G = { L, warn: [] as string[], notes: [] as string[], blocks: S.base === "blocks", dirs: S.dirs === 8 ? 8 : 4, gate: S.gate } as ToggleG;
  const W = G.warn;
  G.w = TOGGLE_INTERNALS.w; G.clr = TOGGLE_INTERNALS.clr; G.cons = TOGGLE_INTERNALS.cons; G.edge = TOGGLE_INTERNALS.edge;
  G.rn = clampW(W, S.neckD / 2, 0.8, 4, "neck diameter");
  G.neckL = Math.max(2 * L, Math.round(S.neckL / L) * L);
  G.pivot = clamp(S.pivot, 0.3, 1.2);
  G.r0 = clampW(W, S.collarD / 2, G.rn + 1.0, 12, "collar radius");
  G.bandH = clampW(W, S.bandH, 1.2, 8, "band height");
  G.alpha = clampW(W, S.tilt, 4, 25, "contact tilt");
  G.over = clampW(W, S.over, 0.5, 8, "overtravel");
  const a = G.alpha * D2R;
  G.r1 = G.r0 - G.bandH * Math.tan(a);
  if (G.r1 < G.rn + 0.4) { W.push("band too tall for this tilt; the collar top would pass the neck"); G.r1 = G.rn + 0.4; }
  G.rs = S.stemD / 2;
  if (G.rs < G.rn) { W.push("stem raised to the neck diameter"); G.rs = G.rn; }
  if (G.rs > G.r1 - 0.3) { W.push("stem cut to " + (2 * (G.r1 - 0.3)).toFixed(2) + " so the collar keeps a top cone"); G.rs = Math.max(G.rn, G.r1 - 0.3); }
  G.Rd = Math.max(G.rs + 1, S.capD / 2);
  G.rimT = Math.max(2 * L, S.rimT);
  G.rf = G.rn + 1.2;
  const dz0 = G.neckL * (1 - G.pivot) + (G.r0 - G.rn);
  const need = (S.minGap + 0.03 + G.r0 * (1 - Math.cos(a))) / Math.sin(a);
  G.riser = Math.max(0, need - dz0);
  if (G.riser > 0) G.notes.push("collar gets a " + G.riser.toFixed(2) + " mm riser so the band clears the wall at rest");
  G.Rw = G.r0 * Math.cos(a) + (dz0 + G.riser) * Math.sin(a);
  G.pd = clampW(W, S.padD, 0.5, 1.6, "pad depth");
  G.Re = G.Rw + G.pd / 2;
  G.RA = G.Rw + G.pd + G.clr + 0.5;
  G.needR = G.RA + 0.5 + G.edge;
  const n = G.dirs;
  const gh = (S.gap / 2) / G.Rw;
  G.sectors = [];
  for (let k = 0; k < n; k++) {
    const c = 2 * Math.PI * k / n, half = Math.PI / n - gh;
    G.sectors.push({ c, a0: c - half, a1: c + half, half });
  }
  if ((G.sectors[0] as Sector).half < 0.6 / G.Rw) W.push("sector gap leaves no pad");
  if (!G.blocks) {
    const pitch = 2.54, np = n + 1;
    const boreR = S.term === "header" ? 0.45 : S.term === "wire" ? Math.max(0.3, S.bore / 2) : 0;
    const cupR = S.term === "pads" ? 0.9 : boreR + 0.5;
    const rowHalf = (np - 1) / 2 * pitch;
    const rowMin = G.Rw + G.pd + G.clr + cupR;
    if (S.outline === "round") {
      G.outKind = "round";
      const Rmin = Math.max(G.needR, rowMin + cupR + G.edge);
      G.outR = S.auto ? Math.ceil(Rmin * 10) / 10 : Math.max(S.size / 2, 4);
      if (G.outR < Rmin - 1e-6) W.push("body diameter under the " + (2 * Rmin).toFixed(1) + " mm minimum");
      G.size = 2 * G.outR;
    } else {
      G.outKind = "square";
      const Hmin = Math.max(G.needR, rowHalf + cupR + G.edge, rowMin + cupR + G.edge);
      const H = S.auto ? Math.ceil(Hmin * 10) / 10 : Math.max(S.size / 2, 4);
      if (H < Hmin - 1e-6) W.push("body size under the " + (2 * Hmin).toFixed(1) + " mm minimum");
      G.outHx = H; G.outHy0 = H; G.outHy1 = H;
      G.size = 2 * H;
    }
  } else {
    G.outKind = "square";
    const needStuds = Math.max(2, Math.ceil((2 * G.needR + 0.2) / 8 - 1e-9));
    G.studs = S.studs > 0 ? Math.max(S.studs, 2) : needStuds;
    if (G.studs < needStuds) W.push("body under " + needStuds + " studs is too small for this collar");
    const hx = G.studs * 4 - 0.1;
    G.outHx = hx; G.outHy1 = hx; G.outHy0 = hx;
    G.size = 2 * hx;
  }
  return G;
}

/** part2d.js stack: the floor slabs bottom up for a trace layer count. */
export function stack(G: ToggleG, layers: number, pegs: ToggleState["pegs"]): ToggleG {
  const L = G.L, up = (z: number): number => Math.ceil(z / L - 1e-6) * L;
  const s: Slab[] = [];
  let z = 0;
  const add = (name: string, t: number): void => { s.push({ name, z0: z, z1: z + t }); z += t; };
  if (G.blocks) {
    if (pegs !== "top") { add("sockets", up(2.4)); add("flange", 2 * L); }
    else add("skin", 2 * L);
    add("spacer", 2 * L);
  } else add("skin", 2 * L);
  if (layers === 2) { add("L1", 3 * L); add("sep", 2 * L); add("L2", 3 * L); }
  else add("L1", 3 * L);
  add("lip", 3 * L);
  G.floor = s;
  G.zf = z;
  G.layers = layers;
  G.traceT = 3 * L; G.sepT = 2 * L;
  G.trace = s.filter((q) => q.name === "L1" || q.name === "L2");
  G.topTrace = G.trace[G.trace.length - 1] as Slab;
  return G;
}

/** part2b.js occ: is (x, y, z) inside the body. */
function occ(G: ToggleG, x: number, y: number, z: number, dil: number, ignoreWall: boolean): boolean {
  if (z > G.zT + dil) return false;
  const ax = Math.abs(x);
  if (G.outKind === "round") { if (Math.hypot(x, y) > G.outR + dil) return false; }
  else if (ax > G.outHx + dil || y > G.outHy1 + dil || y < -G.outHy0 - dil) return false;
  if (z < G.zf - dil) return true;
  const rr = Math.hypot(x, y), zq = z + dil;
  if (zq < G.zr0) return ignoreWall ? false : rr >= G.Rw - dil;
  const k = Math.floor((zq - G.zr0) / G.L + 1e-9);
  const rd = k < G.K ? G.Rw - (k + 1) * G.L : -1;
  if (rr < rd - dil) return false;
  if (inGate(G.gate, G.rh - dil, x, y)) return false;
  return true;
}

function samples(G: ToggleG, segs: readonly Seg[]): Samples {
  const out: Samples = { r: [], h: [], tag: [] };
  for (const s of segs) {
    const [a, b] = s.pts;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(len / 0.15));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      if (s.trimA && t * len < s.trimA) continue;
      if (s.trimB && (1 - t) * len < s.trimB) continue;
      const r = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      if (z < G.zp - 1e-6) continue;
      out.r.push(r); out.h.push(z - G.zp); out.tag.push(s.tag);
    }
  }
  return out;
}

function profileSegs(G: ToggleG, forStop: boolean): Seg[] {
  const s: Seg[] = [];
  if (G.zn1 > G.zp + 1e-6) s.push({ pts: [[G.rn, G.zp], [G.rn, G.zn1]], tag: "stem" });
  const zc = G.zn1 + (G.r0 - G.rn);
  if (G.riser > 1e-6) {
    s.push({ pts: [[G.rn, G.zn1], [G.r0, zc]], tag: "stem" });
    s.push({ pts: [[G.r0, zc], [G.r0, G.zb0]], tag: "stem", trimB: 0.12 });
  } else s.push({ pts: [[G.rn, G.zn1], [G.r0, G.zb0]], tag: "stem", trimB: 0.12 });
  s.push({ pts: [[G.r0, G.zb0], [G.r1, G.zb1]], tag: "band" });
  if (G.r1 - G.rs > 1e-6) s.push({ pts: [[G.r1, G.zb1], [G.rs, G.zci]], tag: "stem", trimA: 0.12 });
  s.push({ pts: [[G.rs, G.zci], [G.rs, forStop ? G.zci + 40 : G.zcb]], tag: "stem" });
  if (!forStop) {
    s.push({ pts: [[G.rs, G.zcb], [G.Rd, G.zcb + G.Rd - G.rs]], tag: "cap" });
    s.push({ pts: [[G.Rd, G.zcb + G.Rd - G.rs], [G.Rd, G.zrim]], tag: "cap" });
  }
  return s;
}

const NEAR_C: number[] = [], NEAR_S: number[] = [];
for (let k = 0; k < 16; k++) { NEAR_C.push(Math.cos(k * Math.PI / 8)); NEAR_S.push(Math.sin(k * Math.PI / 8)); }
const PSI_NEAR: number[] = [];
for (let d = -70; d <= 70; d += 2.5) PSI_NEAR.push(d * D2R);
const PSI_ALL: number[] = [];
for (let d = 0; d < 360; d += 5) PSI_ALL.push(d * D2R);

type Tags = Readonly<Record<string, boolean>> | null;

/** part2b.js hits: does any sample enter the body at tilt theta toward phi (Rodrigues about the tilt axis). */
function hits(G: ToggleG, P: Samples, tags: Tags, phi: number, thetaDeg: number, dil: number, ignoreWall: boolean): boolean {
  const th = thetaDeg * D2R, c = Math.cos(th), s = Math.sin(th), omc = 1 - c;
  const ux = -Math.sin(phi), uy = Math.cos(phi);
  const psis = thetaDeg === 0 ? PSI_ALL : PSI_NEAR;
  for (let q = 0; q < psis.length; q++) {
    const ps = phi + (psis[q] as number), cp = Math.cos(ps), sp = Math.sin(ps);
    for (let i = 0; i < P.r.length; i++) {
      if (tags && !tags[P.tag[i] as string]) continue;
      const x = (P.r[i] as number) * cp, y = (P.r[i] as number) * sp, h = P.h[i] as number;
      const cx = uy * h, cy = -ux * h, cz = ux * y - uy * x;
      const d = ux * x + uy * y;
      const X = x * c + cx * s + ux * d * omc;
      const Y = y * c + cy * s + uy * d * omc;
      const Z = h * c + cz * s + G.zp;
      if (occ(G, X, Y, Z, 0, ignoreWall)) return true;
      if (dil > 0) {
        const rr = Math.hypot(X, Y) || 1, ex = X / rr, ey = Y / rr;
        for (let k = 0; k < 16; k++) {
          const dr = dil * (NEAR_C[k] as number), dz = dil * (NEAR_S[k] as number);
          if (occ(G, X + ex * dr, Y + ey * dr, Z + dz, 0, ignoreWall)) return true;
        }
      }
    }
  }
  return false;
}

function thetaFirst(G: ToggleG, P: Samples, tags: Tags, phi: number, dil: number, ignoreWall: boolean, maxDeg = 36): number {
  if (hits(G, P, tags, phi, 0, dil, ignoreWall)) return 0;
  let lo = 0, hi = 0, found = false;
  for (let d = 0.5; d <= maxDeg + 1e-9; d += 0.5) {
    if (hits(G, P, tags, phi, d, dil, ignoreWall)) { hi = d; found = true; break; }
    lo = d;
  }
  if (!found) return Infinity;
  for (let k = 0; k < 9; k++) { const m: number = (lo + hi) / 2; if (hits(G, P, tags, phi, m, dil, ignoreWall)) hi = m; else lo = m; }
  return (lo + hi) / 2;
}

/** part2b.js bandPen: the band's reach past the wall at a tilt, mm. */
export function bandPen(G: ToggleG, thetaDeg: number): number {
  const th = thetaDeg * D2R;
  let pen = -1e9;
  for (const [r, z] of [[G.r0, G.zb0], [G.r1, G.zb1], [(G.r0 + G.r1) / 2, (G.zb0 + G.zb1) / 2]] as const) {
    const h = z - G.zp;
    const X = r * Math.cos(th) + h * Math.sin(th);
    pen = Math.max(pen, X - G.Rw);
  }
  return pen;
}

function setGate(G: ToggleG, rh: number): void {
  G.rh = rh;
  G.K = rh >= G.Rw ? 0 : Math.ceil((G.Rw - rh) / G.L - 1e-6);
  G.roofTop = G.zr0 + G.K * G.L;
  G.zT = G.roofTop + G.tLip;
}

/** part2a.js capTop: the cap's top surface as a radial profile, outside in: [r, z, textured]. */
export function capTop(S: ToggleState, R: number, zRim: number): { pts: [number, number, boolean][]; Ri: number } {
  const b = clamp(S.edge, 0.3, R * 0.6), H = Math.max(0, S.topH), Ri = R - b;
  const out: [number, number, boolean][] = [];
  const ne = 10;
  for (let k = 0; k <= ne; k++) {
    const a = (k / ne) * Math.PI / 2;
    out.push([Ri + b * Math.cos(a), zRim + H * Math.sin(a), k > 0]);
  }
  const n = Math.max(6, Math.ceil(Ri / 0.12));
  for (let k = 1; k <= n; k++) {
    const r = Ri * (1 - k / n), q = 1 - (r / Ri) * (r / Ri);
    let z = zRim + H;
    if (S.top === "dish") z -= S.dish * q;
    else if (S.top === "dome") z += S.dish * q;
    out.push([r, z, true]);
  }
  return { pts: out, Ri };
}

/** part2b.js solveZ: zones, gate, roof, cap height and the measured tilts. */
export function solveZ(G: ToggleG, S: ToggleState): ToggleG {
  const L = G.L, W = G.warn;
  const up = (z: number): number => Math.ceil(z / L - 1e-6) * L, dn = (z: number): number => Math.floor(z / L + 1e-6) * L, nr = (z: number): number => Math.round(z / L) * L;
  G.zn1 = G.zf + G.neckL;
  G.zp = G.zf + G.neckL * G.pivot;
  G.zb0 = G.zn1 + (G.r0 - G.rn) + G.riser;
  G.zb1 = G.zb0 + G.bandH;
  G.zci = G.zb1 + Math.max(0, G.r1 - G.rs);
  const a = G.alpha * D2R;
  G.zc0 = G.zp - G.r0 * Math.sin(a) + (G.zb0 - G.zp) * Math.cos(a);
  G.zc1 = G.zc0 + G.bandH / Math.cos(a);
  const m = S.margin, g = Math.max(1, Math.round(S.split)) * L;
  G.zB0 = Math.max(G.zf + L, dn(G.zc0 - m));
  const zm = (G.zc0 + G.zc1) / 2;
  G.zB1 = Math.max(G.zB0 + L, nr(zm - g / 2));
  G.zA0 = G.zB1 + g;
  G.zA1 = Math.max(G.zA0 + L, up(G.zc1 + m));
  G.contactB = G.zB1 - Math.max(G.zB0, G.zc0);
  G.contactA = Math.min(G.zA1, G.zc1) - G.zA0;
  if (G.contactB < 0.5 || G.contactA < 0.5) W.push("contact line only lands " + Math.min(G.contactB, G.contactA).toFixed(2) + " mm on one pad; raise band height or cut the split");
  G.zr0 = G.zA1 + 2 * L;
  G.tLip = 3 * L;

  const Pstop = samples(G, profileSegs(G, true));
  const tagStem = { stem: true }, tagBand = { band: true };
  const thS = G.alpha + G.over;
  G.thS = thS;
  const f = (rh: number): number => { setGate(G, rh); return thetaFirst(G, Pstop, tagStem, 0, 0, true); };
  let rh = 0, stopMsg: string | null = null;
  G.roofLift = 0;
  for (let lift = 0; lift < 16; lift++) {
    const lo = G.rs + S.minGap, hi = G.Rw + 1.5;
    const fhi = f(hi);
    stopMsg = null;
    if (fhi < thS - 0.05) { rh = hi; stopMsg = "stem meets the body at " + fhi.toFixed(1) + " deg, before the " + thS.toFixed(1) + " deg stop; thin the stem or the collar"; }
    else if (f(lo) >= thS) { rh = lo; }
    else {
      let a0 = lo, a1 = hi;
      for (let k = 0; k < 16; k++) { const mm = (a0 + a1) / 2; if (f(mm) >= thS) a1 = mm; else a0 = mm; }
      rh = a1;
    }
    setGate(G, rh);
    if (!hits(G, Pstop, tagStem, 0, 0, S.minGap, false)) break;
    G.zr0 += L; G.roofLift += L;
  }
  if (stopMsg) W.push(stopMsg);

  const t45 = G.gate === "round" ? thS : thetaFirst(G, Pstop, tagStem, 45 * D2R, 0, true);
  G.zcb = Math.max(G.zci, G.zT + 0.48);
  for (let tries = 0; tries < 60; tries++) {
    G.zrim = G.zcb + (G.Rd - G.rs) + G.rimT;
    const P = samples(G, profileSegs(G, false));
    const outer: Samples = { r: [], h: [], tag: [] };
    for (let i = 0; i < P.r.length; i++) if (P.tag[i] === "cap" && (P.r[i] as number) > G.rh + 0.3) { outer.r.push(P.r[i] as number); outer.h.push(P.h[i] as number); outer.tag.push("cap"); }
    let ok = !hits(G, outer, null, 0, thS + 1.5, 0.25, true);
    if (ok && G.gate !== "round" && Number.isFinite(t45)) ok = !hits(G, outer, null, 45 * D2R, Math.min(36, t45 + 1.5), 0.25, true);
    if (ok) {
      const t0 = thetaFirst(G, P, { stem: true, cap: true }, 0, 0, true);
      if (t0 >= thS - 0.1) break;
    }
    G.zcb += L / 2;
  }
  G.zrim = G.zcb + (G.Rd - G.rs) + G.rimT;
  const top = capTop(S, G.Rd, G.zrim);
  G.capTop = top;
  let zmax = -1e9;
  for (const p of top.pts) zmax = Math.max(zmax, p[1]);
  G.ztop = zmax + (S.tex !== "none" ? S.texH : 0);

  const Pall = samples(G, profileSegs(G, false));
  G.thContact = thetaFirst(G, Pall, tagBand, 0, 0, false);
  G.thStop = thetaFirst(G, Pall, { stem: true, cap: true }, 0, 0, true);
  G.thStop45 = G.gate === "round" ? G.thStop : thetaFirst(G, Pall, { stem: true, cap: true }, 45 * D2R, 0, true);
  G.restOk = !hits(G, Pall, null, 0, 0, S.minGap * 0.98, false);
  if (G.gate !== "round" && G.restOk) G.restOk = !hits(G, Pall, null, 45 * D2R, 0, S.minGap * 0.98, false);
  G.restBand = G.Rw - G.r0;
  G.squeeze = bandPen(G, Math.min(G.thStop, G.thStop45));
  if (Math.abs(G.thContact - G.alpha) > 0.35) W.push("band meets the wall at " + G.thContact.toFixed(2) + " deg, not " + G.alpha.toFixed(1));
  if (!G.restOk) W.push("something sits closer than the " + S.minGap + " mm print clearance at rest");
  if (!Number.isFinite(G.thStop)) W.push("no hard stop within 36 deg");
  else if (G.thStop < G.alpha + 0.3) W.push("hard stop at " + G.thStop.toFixed(1) + " deg comes before firm contact");
  return G;
}

/** layoutXY, stack and solveZ in the original's order (part2d.js build, lines 418 to 435, routing left out). */
export function solveToggle(S: ToggleState, L: number): ToggleG {
  const G = layoutXY(S, L);
  stack(G, S.layers, S.pegs);
  return solveZ(G, S);
}

/** part2b.js contact: which sectors the band closes at a tilt toward phi, and the centroid direction. */
export function contact(G: ToggleG, tiltDeg: number, phiDeg: number): { on: boolean; sectors: number[]; beta: number; pen: number; dir: number | null } {
  const res = { on: false, sectors: [] as number[], beta: 0, pen: 0, dir: null as number | null };
  if (!(tiltDeg >= G.thContact - 1e-6)) return res;
  const pen = Math.max(0, bandPen(G, tiltDeg));
  const delta = 0.03 + pen;
  const rho = ((G.r0 + G.r1) / 2) * Math.cos(G.alpha * D2R);
  const kappa = Math.max(1e-3, 1 / rho - 1 / G.Rw);
  const sArc = Math.sqrt(2 * delta / kappa);
  const beta = Math.min(Math.PI / 2, sArc / G.Rw);
  const phi = phiDeg * D2R;
  res.on = true; res.beta = beta / D2R; res.pen = pen;
  G.sectors.forEach((sec, k) => {
    const lo = phi - beta, hi = phi + beta;
    if (inArc(sec.a0, lo, hi) || inArc(sec.a1, lo, hi) || inArc(phi, sec.a0, sec.a1)) res.sectors.push(k);
  });
  if (res.sectors.length) {
    let sx = 0, sy = 0;
    for (const k of res.sectors) { const c = (G.sectors[k] as Sector).c; sx += Math.cos(c); sy += Math.sin(c); }
    res.dir = angNorm(Math.atan2(sy, sx)) / D2R;
  }
  return res;
}

/** A routed net as the original's physics reads it: name, kind (B direction, A common), trace length mm, via count. */
export interface ToggleNet { readonly name: string; readonly kind: "A" | "B"; readonly len: number; readonly vias: number }

/**
 * part2b.js physics (lines 258 to 295). rhoP is the cPLA row in ohm cm (the
 * TOGGLE preset reads Protopasta printed XY, 30, from profile); rhoT the
 * cTPU figure the original declares. Nets are the routed nets; without
 * them only the route-free readouts are meaningful.
 */
export function physics(G: ToggleG, S: ToggleState, rhoPOhmCm: number, nets: readonly ToggleNet[]) {
  const E = S.E;
  const I = Math.PI * Math.pow(G.rn, 4) / 4;
  const k = E * I / G.neckL;
  const lever = G.ztop - G.zp;
  const Fc = k * G.alpha * D2R / lever, Fs = k * (Number.isFinite(G.thStop) ? G.thStop : G.thS) * D2R / lever;
  const strain = G.rn * (Number.isFinite(G.thStop) ? G.thStop : G.thS) * D2R / G.neckL;
  const rhoP = rhoPOhmCm * 10, rhoT = S.rhoT * 10;
  const w = G.w, tT = G.traceT;
  const rho = ((G.r0 + G.r1) / 2) * Math.cos(G.alpha * D2R);
  const kap = Math.max(1e-3, 1 / rho - 1 / G.Rw);
  const beta = (d: number): number => Math.sqrt(2 * d / kap) / G.Rw / D2R;
  const patch = 2 * Math.sqrt(2 * 0.03 / kap);
  const pathL = (G.zA0 - G.zB1) + 0.6 * Math.min(G.zB1 - G.zB0, G.zA1 - G.zA0);
  const rCollar = rhoT * pathL / (Math.max(0.5, patch) * 0.8);
  const ring = rhoP * (Math.PI * G.Rw) / ((G.zA1 - G.zA0) * G.pd) / 2;
  const R = nets.map((n) => {
    const col = n.kind === "A" ? (G.zA1 - G.zf + 1) : (G.zB0 - G.zf + 1);
    const rTrace = rhoP * n.len / (w * tT) + rhoP * col / (n.kind === "A" ? 1.0 : G.pd * 1.0) + n.vias * rhoP * G.sepT / (w * w);
    const rTerm = G.blocks ? rhoP * 3 / (Math.PI) + 1500 : rhoP * 3 / (Math.PI * 0.5 * 0.5);
    return { net: n.name, len: n.len, R: rTrace + rTerm + (n.kind === "A" ? ring : 0) };
  });
  const rA = R.find((n) => n.net === "COM");
  const worstB = Math.max(...R.filter((n) => n.net !== "COM").map((n) => n.R));
  const rSwitch = worstB + (rA ? rA.R : 0) + rCollar + 2 * S.rc * 1000;
  const nice = (v: number): number => { const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2]; const d = Math.pow(10, Math.floor(Math.log10(v))); for (const e of E12) if (e * d >= v - 1e-9) return e * d; return 10 * d; };
  const pullup = nice(Math.max(100e3, 10 * rSwitch));
  const vLow = S.vcc * rSwitch / (rSwitch + pullup);
  const vLow45 = S.vcc * rSwitch / (rSwitch + 45e3);
  return {
    k, Fc, Fs, strain, lever, patch, betaLight: beta(0.03), betaFirm: beta(0.03 + Math.max(0, G.squeeze)),
    padGapHalf: (S.gap / 2) / G.Rw / D2R, rCollar, ring, nets: R, rSwitch, pullup, vLow, vLow45,
    diagonal: G.dirs === 4 ? beta(0.03) > (S.gap / 2) / G.Rw / D2R : null,
    ghost: G.dirs === 4 ? beta(0.03 + Math.max(0, G.squeeze)) > 45 + (S.gap / 2) / G.Rw / D2R : null,
  };
}

/**
 * The stem stress row the original lacks (M06-T14 flex-neck-tilt-pivot,
 * toggle.md 5.1 limits): a 20 N side push at the cap top on the neck core
 * through the band, lever from the band top, MPa. PIP prices its stem the
 * same way (pip model.js lines 501 to 504, limit 15 MPa).
 */
export function stemStress(G: ToggleG): { leverMm: number; sigmaMPa: number } {
  const lever = G.ztop - G.zb1;
  return { leverMm: lever, sigmaMPa: (20 * lever) / ((Math.PI * Math.pow(2 * G.rn, 3)) / 32) };
}
