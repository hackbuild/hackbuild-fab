// GIB, the flat printed sliders (gib.md 4.1 to 4.7), ported line for line
// from originals/gib/files/src/src/part2.js (canonical gib_4.html): the
// footprint contract and stack of build() (lines 158 to 174), buildFinger
// (339 to 396) with physicsFinger (397 to 430), buildMembrane (245 to 337)
// with physicsMembrane (517 to 550), and the 2D helpers cleanLoop, orient,
// rect, roundRect, circle and jit (lines 21 to 57). Prisms are emitted as
// emit() cleans and winds them (lines 66 to 72); the sub-micron nudge of
// emit() fires only when earcut leaves a sliver, which it does not at the
// cases the parity test records (nudges 0, computed), so the port keeps the
// polygons as built and the test fails if a recorded case ever nudges.
// Objects are placed as the export places them (part3.js lines 268 to 279):
// each centred on its own bounding box, the membrane object 8 mm beyond the
// body in y.
//
// Resistances read the profile row of the conductor slot (D-098), where the
// page reads the rho the user types (default 1500 ohm cm, line 141); the
// parity test passes that value in memory.

import { z } from "zod";
import { commandError, qualify, type ApplyIn, type ApplyOut, type BodyDraft, type DerivedValue, type MaterialSlot, type Metric, type ProfileLookup, type ResistivityRow, type SchemaLike, type ShapeDecl, type Tier, type Vec2 } from "@hackbuild/spec";
import { sectionResistance } from "@hackbuild/profile";
import { dv, frameOf, place } from "../pip/common.js";
import { modulusOf } from "../tang/common.js";

type Loop = Vec2[];

/** The page's EZ (line 7): same-part prisms overlap this in z, mm. */
export const GIB_EZ = 0.02;

function area2(L: readonly Vec2[]): number { let a = 0; for (let i = 0, n = L.length; i < n; i++) { const p = L[i] as Vec2, q = L[(i + 1) % n] as Vec2; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
/** cleanLoop, line 22: duplicates within eps, then collinear vertices under 1e-7. */
function cleanLoop(L: readonly Vec2[], eps = 1e-6): Loop {
  const out: Loop = [];
  for (const p of L) { const q = out[out.length - 1]; if (q === undefined || Math.abs(q[0] - p[0]) > eps || Math.abs(q[1] - p[1]) > eps) out.push([p[0], p[1]]); }
  while (out.length > 1 && Math.abs((out[0] as Vec2)[0] - (out[out.length - 1] as Vec2)[0]) < eps && Math.abs((out[0] as Vec2)[1] - (out[out.length - 1] as Vec2)[1]) < eps) out.pop();
  let changed = true;
  while (changed && out.length > 3) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      const a = out[(i + out.length - 1) % out.length] as Vec2, b = out[i] as Vec2, c = out[(i + 1) % out.length] as Vec2;
      const cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (Math.abs(cr) < 1e-7) { out.splice(i, 1); changed = true; break; }
    }
  }
  return out;
}
function orient(L: Loop, ccw: boolean): Loop { if ((area2(L) > 0) !== ccw) L.reverse(); return L; }
const rect = (x0: number, y0: number, x1: number, y1: number): Loop => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function roundRect(x0: number, y0: number, x1: number, y1: number, r0: number, n = 8): Loop {
  const r = Math.max(0, Math.min(r0, (x1 - x0) / 2 - 1e-6, (y1 - y0) / 2 - 1e-6));
  if (r < 0.05) return rect(x0, y0, x1, y1);
  const out: Loop = [];
  const arc = (cx: number, cy: number, a0: number): void => { for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * Math.PI / 2; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  arc(x1 - r, y0 + r, -Math.PI / 2); arc(x1 - r, y1 - r, 0); arc(x0 + r, y1 - r, Math.PI / 2); arc(x0 + r, y0 + r, Math.PI);
  return out;
}
/** circle, line 46: n points rotated half a step. */
function circle(cx: number, cy: number, r: number, n = 20): Loop { const out: Loop = []; for (let i = 0; i < n; i++) { const a = ((i + 0.5) / n) * Math.PI * 2; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return out; }
/** jit, line 51: a sub-micron offset per hole so earcut's horizontal bridges never share a y line. */
function jit(L: readonly Vec2[], k: number): Loop {
  const h = Math.sin((k + 1) * 12.9898) * 43758.5453; const d = (h - Math.floor(h) + 0.5) * 2e-3;
  const h2 = Math.sin((k + 1) * 78.233) * 43758.5453; const dx = (h2 - Math.floor(h2) - 0.5) * 4e-4;
  return L.map((p): Vec2 => [p[0] + dx, p[1] + d]);
}

/** The page's state (blankState, lines 131 to 145) for the two pots; nested blocks as the page nests them. */
export const gibParams = z.object({
  /** sense: finger (bare pot) or membrane (pressed pot) */
  sense: z.enum(["finger", "membrane"]).default("finger"),
  /** body: flex (all TPU) or rigid (PETG) */
  body: z.enum(["flex", "rigid"]).default("flex"),
  /** conductor: conductive TPU or conductive PLA */
  cond: z.enum(["ctpu", "cpla"]).default("ctpu"),
  /** length, mm */
  L: z.number().min(20).max(200).default(60),
  /** width, mm */
  W: z.number().min(6).max(60).default(14),
  /** thickness, mm, rounded to layers */
  T: z.number().min(0.96).max(6).default(1.44),
  /** corner radius, mm */
  r: z.number().min(0).max(8).default(2),
  /** margin, mm */
  margin: z.number().min(0.8).max(4).default(1.2),
  /** pad, mm */
  pad: z.number().min(2).max(8).default(4),
  /** wire hole dia, mm */
  holeD: z.number().min(1).max(3.5).default(2.2),
  /** clearance, mm */
  clear: z.number().min(0.6).max(2).default(0.8),
  /** terminals: wire hole or pad */
  term: z.enum(["hole", "pad"]).default("hole"),
  mem: z.object({
    /** track width, mm */ tw: z.number().min(1.2).max(12).default(5),
    /** air gap, layers */ gapLayers: z.number().int().min(1).max(4).default(1),
    /** ledge, mm */ ledge: z.number().min(0.6).max(3).default(1.2),
    /** collector post side, mm */ cs: z.number().min(1.2).max(5).default(2.4),
    /** sheet fit per side, mm */ fit: z.number().min(0).max(0.4).default(0.15),
    /** return lane width, mm */ rw: z.number().min(1.2).max(8).default(2.5),
  }).strict().default({ tw: 5, gapLayers: 1, ledge: 1.2, cs: 2.4, fit: 0.15, rw: 2.5 }),
  fin: z.object({
    /** track width, mm */ tw: z.number().min(1.2).max(10).default(4),
    /** bus width, mm */ bw: z.number().min(1.2).max(8).default(2.5),
    /** return lane width, mm */ rw: z.number().min(1.2).max(8).default(2.5),
    /** bus to track gap, mm */ gap: z.number().min(0.8).max(4).default(1.5),
    /** return gap, mm */ rgap: z.number().min(0.8).max(4).default(1.2),
    /** skin resistance, kohm (assumed, line 136) */ skin: z.number().positive().default(300),
  }).strict().default({ tw: 4, bw: 2.5, rw: 2.5, gap: 1.5, rgap: 1.2, skin: 300 }),
  /** floor, layers */
  floorLayers: z.number().int().min(1).max(6).default(2),
  /** conductor, layers */
  condLayers: z.number().int().min(1).max(4).default(2),
  /** membrane sheet, layers */
  sheetLayers: z.number().int().min(1).max(4).default(2),
}).strict();
export type GibParams = z.infer<typeof gibParams>;
export const GIB_PARAMS = gibParams as unknown as SchemaLike<unknown, GibParams>;
export const GIB_FINGER_DEFAULTS: GibParams = gibParams.parse({ sense: "finger" });
export const GIB_MEMBRANE_DEFAULTS: GibParams = gibParams.parse({ sense: "membrane" });

/** finger-pot params: the page's state with sense held at finger. */
export const fingerPotParams = gibParams.extend({ sense: z.literal("finger").default("finger") }).strict();
/** membrane-slider-gib params: the page's state with sense held at membrane. */
export const membraneGibParams = gibParams.extend({ sense: z.literal("membrane").default("membrane") }).strict();
export const FINGER_POT_PARAMS = fingerPotParams as unknown as SchemaLike<unknown, GibParams>;
export const MEMBRANE_GIB_PARAMS = membraneGibParams as unknown as SchemaLike<unknown, GibParams>;

export interface GibPrism { readonly loops: readonly Loop[]; readonly z0: number; readonly z1: number }
export interface GibPart { readonly name: string; readonly key: "body" | "cond" | "sheet"; readonly object: 0 | 1; readonly prisms: GibPrism[] }

export interface GibBuild {
  readonly T: number;
  readonly f: number;
  readonly warn: string[];
  readonly parts: GibPart[];
  readonly rows: [string, string][];
  readonly notes: { w: number; t: string }[];
  readonly num: Readonly<Record<string, number>>;
  /** Export placement per object (part3.js lines 270 to 277): subtract (cx, cy), add yoff. */
  readonly objects: readonly { readonly cx: number; readonly cy: number; readonly yoff: number }[];
}

/** fmt, line 512. */
function fmt(v: number, u: "ohm" | "s"): string {
  if (u === "ohm") { if (v >= 1e6) return `${(v / 1e6).toFixed(2)} Mohm`; if (v >= 1e3) return `${(v / 1e3).toFixed(1)} kohm`; return `${v.toFixed(0)} ohm`; }
  if (v >= 1e-3) return `${(v * 1e3).toFixed(2)} ms`; if (v >= 1e-6) return `${(v * 1e6).toFixed(2)} us`; return `${(v * 1e9).toFixed(0)} ns`;
}

class Part {
  readonly prisms: GibPrism[] = [];
  constructor(readonly name: string, readonly key: GibPart["key"], readonly object: 0 | 1) {}
  /** emit(), lines 66 to 72: outer ccw, holes cw, both cleaned; holes under three points and prisms under 1e-6 tall dropped. */
  prism(outer: readonly Vec2[], holes: readonly (readonly Vec2[])[], z0: number, z1: number): void {
    const o = orient(cleanLoop(outer), true);
    const hs = holes.map((h) => orient(cleanLoop(h), false)).filter((h) => h.length >= 3);
    if (o.length < 3 || z1 - z0 < 1e-6) return;
    this.prisms.push({ loops: [o, ...hs], z0, z1 });
  }
}

/** build(), lines 158 to 174, then the sense's builder and physics; `row` prices the conductor, as the page prices it on s.rho. */
/**
 * flexE is the membrane TPU modulus, MPa, the press force bends (the page's
 * BODY.flex.E, part2.js lines 15 and 529); derive and apply read it from
 * profile material tpu95. The membrane sense needs it; the finger sense
 * ignores it.
 */
export function gibBuild(s: GibParams, layer: number, row: ResistivityRow, flexE?: number): GibBuild {
  const h = layer, warn: string[] = [];
  const m = s.margin, c = s.clear;
  const e = s.condLayers * h;
  const r = Math.max(0, Math.min(s.r, (m - 0.3) * 3.4, s.W / 2 - 0.1, s.L / 2 - 0.1));
  if (r < s.r - 1e-6) warn.push(`corner radius limited to ${r.toFixed(1)} mm by the margin`);
  const outline = roundRect(0, 0, s.L, s.W, r, 10);
  const R = (len: number, area: number): number => { const r = sectionResistance(row, len, area).ohm; return typeof r === "number" ? r : r[0]; };
  return s.sense === "finger" ? finger(s, h, e, m, c, outline, warn, R) : membrane(s, h, e, m, c, outline, warn, R, flexE ?? missingFlex());
}

type Res = (len: number, area: number) => number;

function missingFlex(): never {
  throw commandError({ code: "E_REF", path: "/materials/tpu95/modulusMPa", got: "membrane", expected: "a membrane TPU modulus", hint: "the membrane press force bends the sheet; pass the tpu95 modulus" });
}

function finger(s: GibParams, h: number, e: number, m: number, c: number, outline: Loop, warn: string[], R: Res): GibBuild {
  let pp = s.pad;
  const minT = s.floorLayers * h + e;
  let T = Math.round(s.T / h) * h;
  if (T < minT - 1e-6) { T = minT; warn.push(`thickness raised to the minimum stack ${minT.toFixed(2)} mm`); }
  const f = T - e;
  let tw = s.fin.tw, bw = s.fin.bw, rw = s.fin.rw;
  const fg = s.fin.gap, rg = s.fin.rgap;
  const layout = () => {
    const phB = Math.max(pp, rw), phW = Math.max(pp, bw);
    const yw0 = m + phB + rg;
    const yt0 = Math.max(yw0 + bw + fg, yw0 + phW + c + Math.max(0, (pp - tw) / 2));
    const yc = yt0 + tw / 2, yt1 = yt0 + tw;
    const yA0 = Math.min(yc - pp / 2, yt0), yA1 = Math.max(yc + pp / 2, yt1);
    return { phB, phW, yw0, yt0, yt1, yc, yA0, yA1, Wmin: yA1 + m };
  };
  let ly = layout();
  if (s.W < ly.Wmin - 1e-6) {
    tw = Math.max(1.2, tw - (ly.Wmin - s.W)); ly = layout();
    if (s.W < ly.Wmin - 1e-6) { bw = Math.max(1.2, bw - (ly.Wmin - s.W)); ly = layout(); }
    if (s.W < ly.Wmin - 1e-6) { rw = Math.max(1.2, rw - (ly.Wmin - s.W)); ly = layout(); }
    if (s.W < ly.Wmin - 1e-6) { pp = Math.max(2, pp - (ly.Wmin - s.W) / 3); ly = layout(); }
    if (s.W < ly.Wmin - 1e-6) warn.push(`width too small for this layout: needs ${ly.Wmin.toFixed(1)} mm; the pads and traces overlap`);
    else warn.push(`narrowed to fit the width: track ${tw.toFixed(1)}${bw !== s.fin.bw ? `, bus ${bw.toFixed(1)}` : ""}${rw !== s.fin.rw ? `, return ${rw.toFixed(1)}` : ""}${pp !== s.pad ? `, pads ${pp.toFixed(1)}` : ""} mm`);
  }
  const { phB, phW, yw0, yt0, yt1, yc, yA0, yA1 } = ly;
  const span = yt1 - yw0;
  if (span > 10) warn.push(`bus plus gap plus track is ${span.toFixed(1)} mm across; a fingertip spans about 10 mm, narrow something`);
  const yFinger = yw0 + span / 2;
  if (yFinger - (m + rw) < 4.5) warn.push("the B return lane is within a fingertip of the bus; widen the return gap or the reading bends when a finger touches it too");
  const xpad = m + pp, xbar = s.L - m - rw;
  const trackL = xbar - xpad;
  if (trackL < 5) warn.push(`length too small: needs ${(s.L - trackL + 5).toFixed(1)} mm for 5 mm of travel`);
  else if (trackL < 12) warn.push(`length leaves only ${trackL.toFixed(1)} mm of travel`);
  const busEnd = xbar - c;
  const A = jit([[m, m], [s.L - m, m], [s.L - m, yt1], [xpad, yt1], [xpad, yA1], [m, yA1], [m, yA0], [xpad, yA0], [xpad, yt0], [xbar, yt0], [xbar, m + rw], [xpad, m + rw], [xpad, m + phB], [m, m + phB]], 0);
  const Wp = jit([[m, yw0], [busEnd, yw0], [busEnd, yw0 + bw], [xpad, yw0 + bw], [xpad, yw0 + phW], [m, yw0 + phW]], 1);
  const hd = Math.min(s.holeD, pp - 0.8) / 2;
  const holes = s.term === "hole" ? [jit(circle(m + pp / 2, yc, hd, 17), 2), jit(circle(m + pp / 2, yw0 + phW / 2, hd, 17), 3), jit(circle(m + pp / 2, m + phB / 2, hd, 17), 4)] : [];
  const body = new Part("body", "body", 0), cond = new Part("traces", "cond", 0);
  cond.prism(A, holes.length > 0 ? [holes[0] as Loop, holes[2] as Loop] : [], f, T);
  cond.prism(Wp, holes.length > 0 ? [holes[1] as Loop] : [], f, T);
  body.prism(outline, holes, 0, f);
  body.prism(outline, [A, Wp], f - GIB_EZ, T + GIB_EZ);
  // physicsFinger, lines 397 to 430
  const retLen = s.L - m - xpad + (yt1 - m), busLen = busEnd - xpad;
  const Rtrack = R(trackL, tw * e);
  const Rret = R(retLen, rw * e);
  const Rdead = R(pp / 2, pp * e) + Rret;
  const Rbus = R(busLen, bw * e);
  const Rskin = s.fin.skin * 1e3;
  const Rsrc = Rskin + Rbus;
  const Cap = Math.max(1e-9, Math.min(100e-9, 5e-3 / Rsrc));
  const capLabel = Cap >= 1e-7 ? "100 nF" : Cap >= 4.7e-8 ? "47 nF" : Cap >= 2.2e-8 ? "22 nF" : Cap >= 1e-8 ? "10 nF" : Cap >= 4.7e-9 ? "4.7 nF" : "1 nF";
  const capVal = Cap >= 1e-7 ? 1e-7 : Cap >= 4.7e-8 ? 4.7e-8 : Cap >= 2.2e-8 ? 2.2e-8 : Cap >= 1e-8 ? 1e-8 : Cap >= 4.7e-9 ? 4.7e-9 : 1e-9;
  const settle = 5 * Rsrc * capVal;
  const rows: [string, string][] = [
    ["travel", `${trackL.toFixed(1)} mm of ${s.L} mm`],
    ["track R", `${fmt(Rtrack, "ohm")} A to B over the travel`],
    ["return R", `${fmt(Rret, "ohm")} from the far end back to B, ${((100 * Rret) / (Rtrack + Rdead)).toFixed(0)} percent of the range`],
    ["bus R", `${fmt(Rbus, "ohm")} worst, finger at the far end`],
    ["skin R", `${fmt(Rskin, "ohm")} assumed, fingertip across a ${fg.toFixed(1)} mm gap`],
    ["wiper source R", `${fmt(Rsrc, "ohm")} worst (skin + bus)`],
    ["across", `${span.toFixed(1)} mm bus to far edge of track, under one fingertip`],
    ["cap at W", `${capLabel}, settles in ${fmt(settle, "s")}`],
    ["divider current", `${((3.3 / (Rtrack + Rdead)) * 1e3).toFixed(2)} mA at 3.3 V`],
  ];
  const notes: { w: number; t: string }[] = [];
  if (Rret / (Rtrack + Rdead) > 0.35) notes.push({ w: 1, t: `the return lane eats ${((100 * Rret) / (Rtrack + Rdead)).toFixed(0)} percent of the ADC range. widen it (it is a plain conductor, width is free) or use conductive PLA on a rigid body.` });
  if (Rtrack > 2e6) notes.push({ w: 1, t: "track is over 2 Mohm, in the same range as skin, so the finger loads the divider. widen the track, shorten it, or use conductive PLA on a rigid body." });
  else if (Rtrack > Rskin / 4) notes.push({ w: 1, t: "track resistance is within a few times of skin resistance; a second finger or a sweaty palm across the track bends the reading. conductive PLA on a rigid body fixes it." });
  return {
    T, f, warn, parts: [body, cond], rows, notes,
    num: { Rtrack, Rret, Rdead, Rbus, Rsrc, capVal, settle, trackL, span },
    objects: [{ cx: s.L / 2, cy: s.W / 2, yoff: 0 }],
  };
}

function membrane(s: GibParams, h: number, e: number, m: number, c: number, outline: Loop, warn: string[], R: Res, flexE: number): GibBuild {
  const gap = s.mem.gapLayers * h, sp = e + gap, sh = s.sheetLayers * h;
  const minT = s.floorLayers * h + e + sp + sh;
  let T = Math.round(s.T / h) * h;
  if (T < minT - 1e-6) { T = minT; warn.push(`thickness raised to the minimum stack ${minT.toFixed(2)} mm`); }
  const f = T - e - sp - sh;
  const fit = s.mem.fit;
  let tw = s.mem.tw, rw = s.mem.rw, ledge = s.mem.ledge, cs = s.mem.cs, pp = s.pad;
  const layout = () => {
    const phB = Math.max(pp, rw), wt = Math.max(2.2, pp);
    const yw0 = m + phB + c;
    const yc = Math.max(yw0 + 0.3 + cs + 1.1 + tw / 2, yw0 + wt + 1.1 + tw / 2 + Math.max(0, (pp - tw) / 2), m + rw + c + 1.1 + cs + 1.1 + tw / 2, m + ledge + 1.1 + cs + 1.1 + tw / 2);
    const ycol1 = yc - tw / 2 - 1.1, ycol0 = ycol1 - cs, ya0 = ycol0 - 1.1, ya1 = yc + tw / 2 + 0.6;
    const yA1 = Math.max(yc + pp / 2, yc + tw / 2);
    return { phB, wt, yw0, yc, ycol0, ycol1, ya0, ya1, yA1, Wmin: Math.max(ya1 + ledge, yA1) + m };
  };
  let ly = layout();
  if (s.W < ly.Wmin - 1e-6) {
    tw = Math.max(1.2, tw - (ly.Wmin - s.W)); ly = layout();
    if (s.W < ly.Wmin - 1e-6) { ledge = Math.max(0.6, ledge - (ly.Wmin - s.W) / 2); ly = layout(); }
    if (s.W < ly.Wmin - 1e-6) { cs = Math.max(1.2, cs - (ly.Wmin - s.W)); ly = layout(); }
    if (s.W < ly.Wmin - 1e-6) { rw = Math.max(1.2, rw - (ly.Wmin - s.W)); ly = layout(); }
    if (s.W < ly.Wmin - 1e-6) { pp = Math.max(2, pp - (ly.Wmin - s.W) / 2); ly = layout(); }
    if (s.W < ly.Wmin - 1e-6) warn.push(`width too small for this layout: needs ${ly.Wmin.toFixed(1)} mm; the pads and track overlap`);
    else warn.push(`narrowed to fit the width: track ${tw.toFixed(1)}${ledge !== s.mem.ledge ? `, ledge ${ledge.toFixed(1)}` : ""}${cs !== s.mem.cs ? `, post ${cs.toFixed(1)}` : ""}${rw !== s.mem.rw ? `, return ${rw.toFixed(1)}` : ""}${pp !== s.pad ? `, pads ${pp.toFixed(1)}` : ""} mm`);
  }
  const { phB, wt, yw0, yc, ycol0, ycol1, ya0, ya1, yA1 } = ly;
  const phW = Math.max(pp, wt);
  const xpad = m + pp;
  const xp0 = xpad + c, xp1 = s.L - m - rw - c;
  const xa0 = xp0 + ledge, xa1 = xp1 - ledge;
  const xs = xa0 + 0.6, xe = xa1 - 0.6;
  const xcol0 = xs + 0.5, xcol1 = xcol0 + cs;
  if (xe - xs < 5) warn.push(`length too small: needs ${(s.L - (xe - xs) + 5).toFixed(1)} mm for 5 mm of travel`);
  else if (xe - xs < 12) warn.push(`length leaves only ${(xe - xs).toFixed(1)} mm of travel`);
  const yh0 = ycol0 - 0.5;
  const yp0 = ya0 - ledge, yp1 = ya1 + ledge;
  const xbar = s.L - m - rw;
  const yt0 = yc - tw / 2, yt1 = yc + tw / 2;
  const yA0 = Math.min(yc - pp / 2, yt0);
  const A = jit([[m, m], [s.L - m, m], [s.L - m, yt1], [xpad, yt1], [xpad, yA1], [m, yA1], [m, yA0], [xpad, yA0], [xpad, yt0], [xbar, yt0], [xbar, m + rw], [xpad, m + rw], [xpad, m + phB], [m, m + phB]], 0);
  const xl0 = xcol0 - 0.3, xl1 = xcol1 + 0.3, cy1 = ycol1 + 0.3;
  const Wp = jit([[m, yw0], [xl1, yw0], [xl1, cy1], [xl0, cy1], [xl0, yw0 + wt], [xpad, yw0 + wt], [xpad, yw0 + phW], [m, yw0 + phW]], 1);
  const post = rect(xcol0, ycol0, xcol1, ycol1);
  const hd = Math.min(s.holeD, pp - 0.8) / 2;
  const holes = s.term === "hole" ? [jit(circle(m + pp / 2, yc, hd, 17), 2), jit(circle(m + pp / 2, yw0 + phW / 2, hd, 17), 3), jit(circle(m + pp / 2, m + phB / 2, hd, 17), 4)] : [];
  const padPockets = [jit(rect(m - 0.2, m - 0.2, xpad + 0.2, yA1 + 0.2), 5)];
  const active = jit(rect(xa0, ya0, xa1, ya1), 7);
  const pocket = jit(rect(xp0, yp0, xp1, yp1), 8);
  const strip: Loop = [[xs, yh0], [xcol1 + 0.5, yh0], [xcol1 + 0.5, yc - tw / 2], [xe, yc - tw / 2], [xe, yc + tw / 2], [xs, yc + tw / 2]];
  const sheet = rect(xp0 + fit, yp0 + fit, xp1 - fit, yp1 - fit);
  const z1 = f, z2 = f + e, z3 = f + sp, z4 = f + e + sp;
  const body = new Part("body", "body", 0), cond = new Part("track", "cond", 0);
  cond.prism(A, holes.length > 0 ? [holes[0] as Loop, holes[2] as Loop] : [], z1, z2);
  cond.prism(Wp, holes.length > 0 ? [holes[1] as Loop] : [], z1, z2);
  cond.prism(post, [], z2 - GIB_EZ, z3);
  body.prism(outline, holes, 0, z1);
  body.prism(outline, [A, Wp], z1 - GIB_EZ, z2 + GIB_EZ);
  body.prism(outline, [active, ...padPockets], z2, z4 + GIB_EZ);
  body.prism(outline, [pocket, ...padPockets], z4, T);
  // the membrane object, flipped about its own long axis (y to 2 my - y, z to T - z, lines 326 to 328)
  const my = (yp0 + yp1) / 2;
  const flip = (L: Loop): Loop => L.map((p): Vec2 => [p[0], 2 * my - p[1]]);
  const mem = new Part("membrane", "sheet", 1), str = new Part("wiper", "cond", 1);
  mem.prism(flip(sheet), [], T - T, T - z4);
  str.prism(flip(strip), [], T - z4, T - z3);
  // physicsMembrane, lines 517 to 550
  const trackL = xe - xs;
  const retLen = s.L - m - xpad + (yt1 - m), leadLen = xl1 - xpad + (cy1 - yw0);
  const Rtrack = R(trackL, tw * e);
  const RdeadA = R(xs - s.margin - pp, tw * e);
  const Rret = R(retLen, rw * e);
  const Rdead = RdeadA + Rret;
  const Rstrip = R(trackL, tw * e);
  const Rpost = R(sp, s.mem.cs * s.mem.cs);
  const Rlead = R(leadLen, Math.max(2.2, pp - 1) * e);
  const Rsrc = Rstrip + Rpost + Rlead;
  const a = ya1 - ya0, t = sh + e, I = (10 * t * t * t) / 12;
  const F = (48 * flexE * I * gap) / (a * a * a);
  const rows: [string, string][] = [
    ["travel", `${trackL.toFixed(1)} mm of ${s.L} mm`],
    ["track R", `${fmt(Rtrack, "ohm")} A to B over the travel`],
    ["end resistance", `${fmt(RdeadA, "ohm")} at the A end, ${fmt(Rret, "ohm")} return lane at the B end, ${((100 * Rdead) / (Rtrack + Rdead)).toFixed(0)} percent of the range`],
    ["wiper source R", `${fmt(Rsrc, "ohm")} worst (strip + post + lead)`],
    ["gap", `${gap.toFixed(2)} mm, ${s.mem.gapLayers} layer${s.mem.gapLayers > 1 ? "s" : ""}`],
    ["press to close", `${F.toFixed(2)} N with a fingertip`],
    ["divider current", `${((3.3 / (Rtrack + Rdead)) * 1e3).toFixed(2)} mA at 3.3 V`],
  ];
  const notes: { w: number; t: string }[] = [];
  if (Rsrc > 100e3) notes.push({ w: 1, t: `the wiper looks like ${fmt(Rsrc, "ohm")} to your ADC. an ESP32 ADC wants under 10 kohm, so add a 100 nF capacitor from W to ground and sample slowly, or buffer with an op amp follower. any no touch pull down must be at least 20 times this or it bends the reading.` });
  if (Rret / (Rtrack + Rdead) > 0.35) notes.push({ w: 1, t: `the return lane eats ${((100 * Rret) / (Rtrack + Rdead)).toFixed(0)} percent of the ADC range. widen it up to the pad height (it costs no width there) or use conductive PLA on a rigid body.` });
  if (Rtrack > 1e6) notes.push({ w: 1, t: "track is over a megohm: noise pickup goes up. shorten, widen or use conductive PLA on a rigid body." });
  if (F > 1.5) notes.push({ w: 1, t: "press force is high for a fingertip; widen the active area, use one gap layer, or a thinner sheet." });
  if (F < 0.05) notes.push({ w: 1, t: "membrane is so soft it may sag closed; add a gap layer or a sheet layer." });
  // export placement: the membrane object's bounding box is the flipped sheet and strip
  const mx0 = Math.min(xp0 + fit, xs), mx1 = Math.max(xp1 - fit, xe);
  const fy = [2 * my - (yp0 + fit), 2 * my - (yp1 - fit), 2 * my - yh0, 2 * my - (yc + tw / 2)];
  const my0 = Math.min(...fy), my1 = Math.max(...fy);
  return {
    T, f, warn, parts: [body, cond, mem, str], rows, notes,
    num: { Rtrack, RdeadA, Rret, Rdead, Rsrc, F, trackL, gap },
    objects: [{ cx: s.L / 2, cy: s.W / 2, yoff: 0 }, { cx: (mx0 + mx1) / 2, cy: (my0 + my1) / 2, yoff: s.W / 2 + (yp1 - yp0) / 2 + 8 }],
  };
}

/** The GIB slots on the chase: body, conductor, sheet (slots(), lines 147 to 154), by material and role. */
function slotOf(p: GibPart, s: GibParams): MaterialSlot {
  if (p.key === "cond") return s.cond === "ctpu" ? { slot: 2, material: "ctpu", role: "flex-conductor", label: "conductor" } : { slot: 2, material: "cpla", role: "conductor", label: "conductor" };
  if (p.key === "body") return s.body === "flex" ? { slot: 1, material: "tpu95", role: "body", label: "body" } : { slot: 1, material: "petg", role: "body", label: "body" };
  return s.body === "flex" ? { slot: 1, material: "tpu95", role: "body", label: "body" } : { slot: 3, material: "tpu95", role: "flex", label: "membrane" };
}

const rowOf = (profile: ProfileLookup, s: GibParams): ResistivityRow => (s.cond === "ctpu" ? profile.resistivity("ctpu", "bulk", "printed") : profile.resistivity("cpla", "along", "printed"));

/** The membrane modulus from profile tpu95; the finger pot bends nothing and reads no row. */
const flexOf = (profile: ProfileLookup, s: GibParams): { readonly mpa: number; readonly tier: Tier } | undefined => (s.sense === "membrane" ? modulusOf(profile, "tpu95") : undefined);

function layerOf(profile: ProfileLookup, machine: string): number {
  const preset = profile.machine(machine).presets[0];
  if (preset === undefined) throw commandError({ code: "E_REF", path: `/machines/${machine}/presets`, got: machine, expected: "a machine with a process preset", hint: `give machine ${machine} a preset; GIB rounds its stack to the layer` });
  return preset.layer;
}

/** The rows a physics number read: resistances and the RC settle read the conductor row, the press force the tpu95 modulus. */
function numTiers(k: string, row: readonly Tier[], flex: Tier | undefined): readonly (Tier | null)[] {
  if (k.startsWith("R") || k === "settle") return row;
  return k === "F" ? [flex ?? null] : [];
}

export function gibDerive(s: GibParams, profile: ProfileLookup, machine = "ffc5p"): Record<string, DerivedValue> {
  const row = rowOf(profile, s);
  const flex = flexOf(profile, s);
  const b = gibBuild(s, layerOf(profile, machine), row, flex?.mpa);
  const t: Tier[] = [row.provenance.tier];
  const out: Record<string, DerivedValue> = { T: dv(b.T, "mm", "round(T / layer) layer, at least the minimum stack", []), floor: dv(b.f, "mm", "T less the stack above the floor", []) };
  for (const [k, v] of Object.entries(b.num)) out[k] = dv(v, k.startsWith("R") ? "ohm" : k === "F" ? "N" : k === "capVal" ? "F" : k === "settle" ? "s" : "mm", `part2.js ${s.sense === "finger" ? "physicsFinger" : "physicsMembrane"}: ${k}`, numTiers(k, t, flex?.tier));
  return out;
}

/** Placed bodies: each GIB part one body (the union of its prisms), objects placed as the export places them. */
export function gibApply(input: ApplyIn<GibParams>, id: string): ApplyOut {
  const s = input.params;
  const row = rowOf(input.profile, s);
  const flex = flexOf(input.profile, s);
  const b = gibBuild(s, layerOf(input.profile, input.draft.machine), row, flex?.mpa);
  const f = frameOf(input.face, id);
  const bodies: BodyDraft[] = [];
  const slots = new Map<number, MaterialSlot>();
  for (const p of b.parts) {
    const o = b.objects[p.object] as { cx: number; cy: number; yoff: number };
    const sl = slotOf(p, s);
    slots.set(sl.slot, sl);
    const shapes: ShapeDecl[] = p.prisms.map((q) => ({ route: "prism", outline: q.loops.map((l) => place(f, l.map(([x, y]): Vec2 => [x - o.cx, y - o.cy + o.yoff]))), z: [q.z0 + f.z, q.z1 + f.z] }));
    bodies.push({ id: p.name, role: sl.role, slot: sl.slot, material: sl.material, base: shapes.length === 1 ? (shapes[0] as ShapeDecl) : { route: "csg", op: "union", of: shapes } });
  }
  const tiers: Tier[] = [row.provenance.tier];
  const metrics: Metric[] = b.rows.map(([k, v]) => ({ id: `gib.say.${k.replace(/[^a-z0-9]+/gi, "-")}`, value: v, ...qualify(/R|current|cap/.test(k) ? tiers : k === "press to close" ? [flex?.tier ?? null] : []), note: `${k}: ${v}`, gate: "informational" as const, group: "readouts" }));
  for (const [k, v] of Object.entries(b.num)) metrics.push({ id: `gib.${k}`, value: v, ...qualify(numTiers(k, tiers, flex?.tier)), note: `part2.js physics: ${k}`, gate: "informational", group: "readouts" });
  return { bodies, features: [], ports: [], slots: [...slots.values()], metrics, warnings: [...b.warn.map((w) => ({ code: "GIB", text: w })), ...b.notes.map((n) => ({ code: "NOTE", text: n.t }))] };
}
