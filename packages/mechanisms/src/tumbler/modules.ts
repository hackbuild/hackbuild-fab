// The 18 TUMBLER modules, ported from the canonical original
// (originals/tumbler/files/tumbler.html, lineage tumbler.bench/harvest):
// each module's params (`num` rows), its plan() cut parts, and the
// arithmetic of its draw() that sets the output q and the readout line.
// The SVG of draw() and the ISO prisms of asm() stay in the original. The
// material is passed in where the original read the global G; every
// literal below is the original's at the line named, kept in the legacy
// arithmetic order so the parts and readouts reproduce it exactly.

import {
  D2R, TAU, bboxPts, cl, circPts, ease, fingerEdgePts, genevaGeo, genevaPts, gearPts, grouped, hingeFieldPts, keyedBorePts,
  lerp, movePts, partN, r2, ratchetPts, rectPts, scalePtsC, slotPts,
  type Pt, type Pts, type SheetPart,
} from "./kit.js";
import type { SheetMaterial } from "./material.js";

/** One slider of a module (the original's `num`, line 609): range, default and step in `unit`. */
export interface NumParam {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly val: number;
  readonly step: number;
  /** "mm", "deg", "%", "x w" or "" for a count. */
  readonly unit: string;
}

/** TUMBLER's code digit editor (line 914) and SHIFT DRUM's bit grid (line 1146). */
export interface CodeParam {
  readonly kind: "code";
  readonly label: string;
  readonly max: number;
  readonly val: readonly number[];
}
export interface GridParam {
  readonly kind: "grid";
  readonly label: string;
  readonly rows: number;
  readonly cols: number;
  readonly val: readonly (readonly number[])[];
}
export type ParamSpec = NumParam | CodeParam | GridParam;

/** Param values as the original's vals() gives them (line 1800): numbers, the code digits and the bit grid. */
export type ModuleParams = Readonly<Record<string, number | readonly number[] | readonly (readonly number[])[]>>;

/** Input values by port key (the SIMS keys, line 1711), 0 to 1. */
export type Inputs = Readonly<Record<string, number>>;

/** A module's own state between steps (the `st` object of draw). */
export type ModuleState = Record<string, number | boolean | undefined>;

/** What draw() computes besides its SVG: the output level and the readout line. */
export interface Drive {
  readonly q: number;
  /** [label, text] as the bay prints them. */
  readonly read: readonly (readonly [string, string])[];
}

export interface TumblerModule {
  /** The original's module id, for example "hinge". */
  readonly id: string;
  /** The canon id it maps to (M06-T02 step 2). */
  readonly mechanism: string;
  /** Module name as the original shows it. */
  readonly name: string;
  /** Start line of the module in the original. */
  readonly line: number;
  readonly params: Readonly<Record<string, ParamSpec>>;
  /** SIMS input keys (lines 1711 to 1726). */
  readonly inputs: readonly string[];
  /** The module's declared logic function (`lg`), when it has one. */
  readonly lg?: (i: readonly number[]) => boolean;
  readonly stateful: boolean;
  plan(p: ModuleParams, m: SheetMaterial): SheetPart[];
  drive(p: ModuleParams, m: SheetMaterial, u: Inputs, st: ModuleState): Drive;
}

const num = (label: string, min: number, max: number, val: number, step?: number, unit?: string): NumParam =>
  ({ label, min, max, val, step: step || 1, unit: unit === undefined ? "mm" : unit });

const n_ = (p: ModuleParams, k: string): number => p[k] as number;
const fx = (x: number, d: number): string => r2(x).toFixed(d);
const pair = (a: string, b: string): readonly [string, string] => [a, b];

/** The original's defaults, as vals() gives them. */
export function defaults(m: TumblerModule): ModuleParams {
  const o: Record<string, ModuleParams[string]> = {};
  for (const [k, s] of Object.entries(m.params)) o[k] = "kind" in s ? s.val : s.val;
  return o;
}

// ---- shared mechanism geometry (lines 456 to 570) ----

function tumbShellPts(p: ModuleParams, m: SheetMaterial): { pts: Pt[]; L: number; H: number; chW: number; chD: number; n: number; pitch: number } {
  const n = Math.round(n_(p, "n"));
  const pitch = n_(p, "pitch");
  const chW = n_(p, "pd") + m.c * 2 + m.k;
  const L = 16 + n * pitch + 26;
  const H = 24;
  const chD = 20;
  const pts: Pt[] = [[0, 0], [L, 0], [L, H]];
  for (let i = n - 1; i >= 0; i--) {
    const x = 16 + i * pitch;
    pts.push([x + chW / 2, H], [x + chW / 2, H - chD], [x - chW / 2, H - chD], [x - chW / 2, H]);
  }
  pts.push([0, H]);
  return { pts, L, H, chW, chD, n, pitch };
}

function tumbKeyPts(p: ModuleParams): Pt[] {
  const n = Math.round(n_(p, "n"));
  const pitch = n_(p, "pitch");
  const code = p["code"] as readonly number[];
  const bl = 7;
  const pts: Pt[] = [[0, 0], [15, 0], [15, 4]];
  for (let i = 0; i < n; i++) {
    const x = 22 + i * pitch;
    const d = code[i % code.length] || 0;
    const y = 4 - d * n_(p, "lift");
    pts.push([x - pitch * 0.32, 4], [x - pitch * 0.32, y], [x + pitch * 0.32, y], [x + pitch * 0.32, 4]);
  }
  pts.push([22 + n * pitch + 5, 4], [22 + n * pitch + 5, 4 + bl], [15, 4 + bl], [15, 15], [0, 15]);
  return pts;
}

/** tumbSolve (line 473): each pin rises d lift with the key in; ok when the error is under shear and insertion over 0.85. */
export function tumbSolve(p: ModuleParams, u: Inputs): { n: number; ins: number; bad: boolean; pins: { d: number; rise: number; ok: boolean }[]; allOk: boolean } {
  const n = Math.round(n_(p, "n"));
  const code = p["code"] as readonly number[];
  const lift = n_(p, "lift");
  const ins = ease(cl(u["KEY"] || 0, 0, 1));
  const bad = (u["WRONG"] || 0) > 0.5;
  const pins: { d: number; rise: number; ok: boolean }[] = [];
  let allOk = true;
  for (let i = 0; i < n; i++) {
    const d = code[i % code.length] || 0;
    const got = bad && i === Math.min(1, n - 1) ? d * lift + lift * 1.4 : d * lift;
    const present = ease(cl(ins * n * 1.15 - i * 0.55, 0, 1));
    const rise = got * present;
    const err = Math.abs(rise - d * lift);
    const ok = err < n_(p, "shear") && ins > 0.85;
    if (!ok) allOk = false;
    pins.push({ d, rise, ok });
  }
  return { n, ins, bad, pins, allOk };
}

function latchSliderPts(p: ModuleParams): Pt[] {
  const L = n_(p, "L");
  const H = n_(p, "sw");
  const dep = n_(p, "dep");
  const pk = (x: number): Pt[] => [[x - 2.6, 0], [x - 1.1, dep], [x + 1.1, dep], [x + 2.6, 0]];
  return ([[0, 0], [12, 0]] as Pt[]).concat(pk(20), pk(20 + n_(p, "pitch")), [[L, 0], [L, H], [0, H]]);
}

function latchPawlPts(p: ModuleParams): Pt[] {
  const bl = n_(p, "bl");
  const swd = Math.max(n_(p, "bwid"), 0.8);
  const g = 1.3;
  const dep = n_(p, "dep");
  return [[0, 0], [bl + 15, 0], [bl + 15, swd], [bl + 18, swd + dep + 1.4], [bl + 12, swd + dep + 1.4], [bl + 12, swd], [9, swd], [9, swd + g],
    [bl + 9, swd + g], [bl + 9, swd + g + 1], [9, swd + g + 1], [9, 12], [0, 12]];
}

function snapGeo(p: ModuleParams): { W: number; H: number; yc: number; x0: number; span: number; up: Pt[]; dn: Pt[] } {
  const x0 = 12;
  const span = n_(p, "span");
  const rise = n_(p, "rise");
  const tk = n_(p, "tk");
  const H = 2 * rise + 2 * tk + 14;
  const yc = H / 2;
  const eps = 2.5;
  const N = 22;
  const f = (x: number): number => {
    const t = (x - x0) / span;
    return 4 * rise * t * (1 - t);
  };
  const xa = x0 + eps;
  const xb = x0 + span - eps;
  const yU = yc - rise - tk / 2 - 2.2;
  const yL = yc + rise + 2.2;
  const up: Pt[] = [];
  const dn: Pt[] = [];
  for (let k = 0; k <= N; k++) up.push([lerp(xa, xb, k / N), yU]);
  for (let k = N; k >= 0; k--) {
    const x = lerp(xa, xb, k / N);
    up.push([x, yc - f(x) - tk / 2]);
  }
  for (let k = 0; k <= N; k++) {
    const x = lerp(xa, xb, k / N);
    dn.push([x, yc - f(x) + tk / 2]);
  }
  for (let k = N; k >= 0; k--) dn.push([lerp(xa, xb, k / N), yL]);
  return { W: span + 24, H, yc, x0, span, up, dn };
}

function camTrackPts(S: number, lobe: number, dwell: number, rad: number, bits: readonly number[] | undefined): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < S * 10; i++) {
    const f = i / (S * 10);
    const ang = f * TAU;
    const idx = Math.floor(f * S);
    const sub = (f * S) % 1;
    const on = bits && bits[idx] ? 1 : 0;
    const w = dwell / 100;
    const inside = sub > (1 - w) / 2 && sub < 1 - (1 - w) / 2;
    const r = rad + (on && inside ? lobe : 0);
    pts.push([r * Math.cos(ang), r * Math.sin(ang)]);
  }
  return pts;
}

function genCrankPts(crankR: number, rl: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 44; i++) {
    const th = (i * TAU) / 44;
    const f = Math.max(0, (Math.cos(th) - Math.cos(0.55)) / (1 - Math.cos(0.55)));
    const r = rl + (crankR + 3.2 - rl) * Math.pow(f, 0.8);
    pts.push([r * Math.cos(th), r * Math.sin(th)]);
  }
  return pts;
}

interface TeslaLoop {
  readonly chan: Pt[];
  readonly island: Pt[];
  readonly pins: Pt[];
}

function teslaGeo(p: ModuleParams): { n: number; W: number; H: number; x0: number; y0: number; main: Pt[]; loops: TeslaLoop[] } {
  const n = Math.round(n_(p, "loops"));
  const cw = n_(p, "cw");
  const pitch = n_(p, "pitch");
  const x0 = 10;
  const W = pitch * (n + 2) + 20;
  const H = pitch * 1.4 + 20;
  const y0 = H - 14;
  const main = rectPts(x0, y0 - cw / 2, pitch * (n + 1) + pitch, cw);
  const loops: TeslaLoop[] = [];
  for (let i = 0; i < n; i++) {
    const bx = x0 + pitch * (i + 0.9);
    const R = pitch * 0.42;
    const chan: Pt[] = [[bx, y0 - cw / 2], [bx + R * 0.9, y0 - R * 1.5], [bx + R * 1.9, y0 - R * 1.75], [bx + R * 2.5, y0 - R * 0.9], [bx + R * 2.2, y0 - cw / 2 - 0.2],
      [bx + R * 2.2 - cw * 0.9, y0 - cw / 2 - 0.2], [bx + R * 1.85, y0 - R * 0.95], [bx + R * 1.6, y0 - R * 1.2], [bx + R * 1.05, y0 - R * 1.05], [bx + cw * 0.9, y0 - cw / 2]];
    const island = scalePtsC([chan[9]!, chan[8]!, chan[7]!, chan[6]!, chan[5]!], 0.9);
    const ib = bboxPts(island);
    const icx = ib.x + ib.w / 2;
    const icy = ib.y + ib.h / 2;
    const pins: Pt[] = [[icx - Math.min(2.2, ib.w * 0.22), icy], [icx + Math.min(2.2, ib.w * 0.22), icy]];
    loops.push({ chan, island, pins });
  }
  return { n, W, H, x0, y0, main, loops };
}

function coandaHole(p: ModuleParams): { W: number; H: number; pts: Pt[]; ports: Pt[] } {
  const w = n_(p, "w") * 4;
  const L = n_(p, "sp") * w;
  const off = n_(p, "so") * w;
  const x0 = 16;
  const H = (w + off * 2.4) * 2 + 16;
  const cy = H / 2;
  const W = x0 + L + 22;
  const cw4 = Math.max(n_(p, "cw") * 4, 2);
  const sx = x0 + L * 0.16;
  const yT = (x: number): number => cy - w / 2 - (off * (x - x0)) / (L * 0.2);
  const yB = (x: number): number => cy + w / 2 + (off * (x - x0)) / (L * 0.2);
  const pts: Pt[] = [[x0 - 12, cy - w / 2], [x0, cy - w / 2],
    [sx - cw4 / 2, yT(sx - cw4 / 2)], [sx - cw4 / 2, yT(sx) - 10], [sx + cw4 / 2, yT(sx) - 10], [sx + cw4 / 2, yT(sx + cw4 / 2)],
    [x0 + L * 0.2, cy - w / 2 - off], [x0 + L, cy - w / 2 - off * 2.2], [x0 + L + 12, cy - w / 2 - off * 2.2], [x0 + L + 12, cy - 1.3], [x0 + L, cy - 1.3], [x0 + L - w * 0.35, cy],
    [x0 + L, cy + 1.3], [x0 + L + 12, cy + 1.3], [x0 + L + 12, cy + w / 2 + off * 2.2], [x0 + L, cy + w / 2 + off * 2.2], [x0 + L * 0.2, cy + w / 2 + off],
    [sx + cw4 / 2, yB(sx + cw4 / 2)], [sx + cw4 / 2, yB(sx) + 10], [sx - cw4 / 2, yB(sx) + 10], [sx - cw4 / 2, yB(sx - cw4 / 2)],
    [x0, cy + w / 2], [x0 - 12, cy + w / 2]];
  // Object.values order of the original's ports: sup, ct, cb, ot, ob.
  const ports: Pt[] = [[x0 - 7, cy], [sx, yT(sx) - 7], [sx, yB(sx) + 7],
    [x0 + L + 7, (cy - 1.3 + cy - w / 2 - off * 2.2) / 2], [x0 + L + 7, (cy + 1.3 + cy + w / 2 + off * 2.2) / 2]];
  return { W, H, pts, ports };
}

// ---- the modules ----

const barParams = {
  L: num("bar length", 50, 140, 96, 1), bw: num("bar width", 8, 26, 14, 0.5), tv: num("input travel", 4, 20, 10, 0.5),
  nd: num("notch dia", 3, 14, 7, 0.5), pd: num("pin dia", 1.5, 8, 4, 0.5),
};

/** COINCIDENCE (line 613): drop t + 0.4 per aligned bar; a bar aligns under 0.75 of the half gap (nd - pd)/2 - c. */
function dropPin(p: ModuleParams, m: SheetMaterial, offA: number, offB: number): number {
  const t = m.t;
  const hg = (n_(p, "nd") - n_(p, "pd")) / 2 - m.c;
  const okA = Math.abs(offA) < hg * 0.75;
  const okB = Math.abs(offB) < hg * 0.75;
  return (okA ? t + 0.4 : 0) + (okA && okB ? t + 0.4 : 0);
}

function coinPlan(p: ModuleParams, m: SheetMaterial): SheetPart[] {
  const L = n_(p, "L"); const bw = n_(p, "bw"); const tv = n_(p, "tv");
  const gs = n_(p, "pd") + m.c * 2 + m.k;
  const mk = (name: string): SheetPart => partN(name, rectPts(0, 0, L, bw),
    [circPts(L / 2, bw / 2, (n_(p, "nd") + m.k) / 2, 20), slotPts(L * 0.18, bw / 2, tv + gs, gs), slotPts(L * 0.82, bw / 2, tv + gs, gs)],
    [[[L / 2 - tv / 2, 2], [L / 2 + tv / 2, 2]]]);
  return [mk("BAR A"), mk("BAR B (same part)"),
    partN("GUIDE PLATE", rectPts(0, 0, L, bw + 10),
      [circPts(L / 2, (bw + 10) / 2, gs / 2, 16), circPts(L * 0.18, (bw + 10) / 2, 1.6, 12), circPts(L * 0.82, (bw + 10) / 2, 1.6, 12)]),
    partN("PIN (4mm dowel, or cut 2 and laminate)", rectPts(0, 0, n_(p, "pd"), 18))];
}

const coin: TumblerModule = {
  id: "coin", mechanism: "coincidence-and", name: "COINCIDENCE", line: 613, params: barParams, inputs: ["A", "B"], stateful: false,
  lg: (i) => Boolean(i[0] && i[1]),
  plan: coinPlan,
  drive(p, m, u) {
    const t = m.t; const px = 55; const tv = n_(p, "tv");
    const nA = px - (1 - u["A"]!) * tv;
    const nB = px - (1 - u["B"]!) * tv;
    const halfGap = (n_(p, "nd") - n_(p, "pd")) / 2 - m.c;
    const drop = dropPin(p, m, px - nA, px - nB);
    return { q: drop / (2 * t + 0.8), read: [pair("stack", `${(2 * t).toFixed(1)}mm`), pair("pin clear", `${fx(halfGap * 2, 2)}mm`), pair("input force", "2 x slide")] };
  },
};

const inh: TumblerModule = {
  id: "inh", mechanism: "inhibit", name: "INHIBIT", line: 672, params: barParams, inputs: ["A", "B"], stateful: false,
  lg: (i) => Boolean(i[0] && !i[1]),
  plan(p, m) {
    const base = coinPlan(p, m);
    const L = n_(p, "L"); const bw = n_(p, "bw"); const tv = n_(p, "tv");
    const gs = n_(p, "pd") + m.c * 2 + m.k;
    return [base[0]!,
      partN("BAR B (flipped)", rectPts(0, 0, L, bw),
        [circPts(L / 2, bw / 2, (n_(p, "nd") + m.k) / 2, 20), slotPts(L * 0.18, bw / 2, tv + gs, gs), slotPts(L * 0.82, bw / 2, tv + gs, gs)],
        [[[L / 2 - tv / 2, 2], [L / 2 + tv / 2, 2]], [[L - 14, 2], [L - 6, 2]]]),
      base[2]!, base[3]!];
  },
  drive(p, m, u) {
    const t = m.t; const px = 55; const tv = n_(p, "tv");
    const nA = px - (1 - u["A"]!) * tv;
    const nB = px + u["B"]! * tv;
    const drop = dropPin(p, m, px - nA, px - nB);
    return { q: drop / (2 * t + 0.8), read: [pair("B home", "notch under pin"), pair("tie A high", "pure NOT"), pair("stack", `${(2 * m.t).toFixed(1)}mm`)] };
  },
};

const wedgeOr: TumblerModule = {
  id: "or", mechanism: "wedge-or", name: "WEDGE OR", line: 727, inputs: ["A", "B"], stateful: false,
  params: { L: num("slide length", 60, 140, 100, 1), h: num("slide height", 20, 60, 34, 1), ang: num("ramp angle", 20, 70, 40, 1, "deg"),
    tv: num("input travel", 4, 20, 12, 0.5), pd: num("pin dia", 2, 8, 4, 0.5) },
  lg: (i) => Boolean(i[0] || i[1]),
  plan(p, m) {
    const L = n_(p, "L"); const h = n_(p, "h"); const tv = n_(p, "tv"); const ang = n_(p, "ang");
    const gs = n_(p, "pd") + m.c * 2 + m.k;
    const stroke = tv * Math.tan(ang * D2R);
    return [partN("OR SLIDE", rectPts(0, 0, L, h),
      [slotPts(L * 0.3, h / 2, tv + n_(p, "pd") + 3, gs, -ang), slotPts(L * 0.7, h / 2, tv + n_(p, "pd") + 3, gs, -ang),
        slotPts(L * 0.12, h / 2, stroke + gs, gs, 90), slotPts(L * 0.88, h / 2, stroke + gs, gs, 90)],
      [[[4, 4], [L - 4, 4]]]),
    partN("GUIDE FRAME", rectPts(0, 0, L + 16, h + 22),
      [rectPts(8, 11, L, h), circPts(8 + L * 0.12, 11 + h / 2, 1.6, 12), circPts(8 + L * 0.88, 11 + h / 2, 1.6, 12),
        slotPts(8 + L * 0.3, h + 17, tv + gs, gs), slotPts(8 + L * 0.7, h + 17, tv + gs, gs),
        circPts(4, 4, 1.6, 12), circPts(L + 12, 4, 1.6, 12), circPts(4, h + 18, 1.6, 12), circPts(L + 12, h + 18, 1.6, 12)]),
    partN("PUSHER (x2)", rectPts(0, 0, tv + 16, 10), [circPts(5, 5, (n_(p, "pd") + m.k) / 2, 12), slotPts(tv + 10, 5, 6, gs)])];
  },
  drive(p, _m, u) {
    const t = Math.tan(n_(p, "ang") * D2R);
    const tv = n_(p, "tv");
    const out = Math.max(u["A"]!, u["B"]!) * tv * t;
    return { q: cl(out / (tv * t), 0, 1), read: [pair("ratio", `1 : ${fx(t, 2)}`), pair("out stroke", `${fx(tv * t, 1)}mm`), pair("ramp", `${n_(p, "ang")}deg`)] };
  },
};

const teet: TumblerModule = {
  id: "teet", mechanism: "teeter-not", name: "TEETER", line: 783, inputs: ["A"], stateful: false,
  params: { ai: num("input arm", 10, 60, 26, 1), ao: num("output arm", 10, 60, 26, 1), bw: num("beam width", 6, 20, 10, 0.5),
    sl_: num("spring length", 10, 40, 22, 1), sw: num("spring width", 0.6, 4, 1.4, 0.1), tv: num("input travel", 3, 16, 8, 0.5) },
  lg: (i) => !i[0],
  plan(p, m) {
    const ai = n_(p, "ai"); const bw = n_(p, "bw");
    const L = ai + n_(p, "ao") + 8;
    const W = n_(p, "sl_") + 12;
    const sw = Math.max(n_(p, "sw"), 0.6);
    const slit = 1.3;
    const H = sw + slit + 8;
    return [partN("LEVER", rectPts(0, 0, L, bw + 2),
      [circPts(ai + 4, (bw + 2) / 2, 1.6, 12), circPts(4, (bw + 2) / 2, 1.6, 12), circPts(L - 4, (bw + 2) / 2, 1.6, 12)],
      [[[ai + 4, 1], [ai + 4, bw + 1]]]),
    partN("RETURN SPRING (open flexure)", [[0, 0], [W, 0], [W, sw], [8, sw], [8, sw + slit], [W, sw + slit], [W, H], [0, H]], [circPts(4, H - 3, 1.6, 10)]),
    partN("PIVOT POST", rectPts(0, 0, 10, 10), [circPts(5, 5, (3 + m.k) / 2, 12)])];
  },
  drive(p, m, u) {
    const gain = n_(p, "ao") / n_(p, "ai");
    const outStroke = (1 - u["A"]!) * n_(p, "tv") * gain;
    const I = (m.t * Math.pow(n_(p, "sw"), 3)) / 12;
    const F = (3 * m.E * I * (u["A"]! * 3 + 0.6)) / Math.pow(n_(p, "sl_"), 3);
    return { q: 1 - u["A"]!, read: [pair("gain", `x${fx(gain, 2)}`), pair("out stroke", `${fx(outStroke, 1)}mm`), pair("spring", `${fx(F, 2)}N`)] };
  },
};

const diff: TumblerModule = {
  id: "diff", mechanism: "differential-xor", name: "DIFFERENTIAL", line: 842, inputs: ["A", "B"], stateful: false,
  params: { L: num("bar length", 70, 160, 120, 1), bw: num("bar width", 8, 26, 14, 0.5), tv: num("input travel", 4, 20, 10, 0.5),
    nd: num("notch dia", 3, 14, 7, 0.5), pd: num("pin dia", 1.5, 8, 4, 0.5), sep: num("channel spacing", 18, 60, 34, 1) },
  lg: (i) => (i[0] ? 1 : 0) !== (i[1] ? 1 : 0),
  plan(p, m) {
    const L = n_(p, "L"); const bw = n_(p, "bw"); const tv = n_(p, "tv"); const sep = n_(p, "sep");
    const gs = n_(p, "pd") + m.c * 2 + m.k;
    const hd = (n_(p, "nd") + m.k) / 2;
    const x1 = L * 0.3;
    const x2 = x1 + sep;
    const trav: Pts[] = [[[L / 2 - tv / 2, 2], [L / 2 + tv / 2, 2]]];
    return [partN("BAR A", rectPts(0, 0, L, bw),
      [circPts(x1, bw / 2, hd, 16), circPts(x2 + tv, bw / 2, hd, 16), slotPts(8, bw / 2, tv + gs, gs), slotPts(L - 8, bw / 2, tv + gs, gs)], trav),
    partN("BAR B", rectPts(0, 0, L, bw),
      [circPts(x1 + tv, bw / 2, hd, 16), circPts(x2, bw / 2, hd, 16), slotPts(8, bw / 2, tv + gs, gs), slotPts(L - 8, bw / 2, tv + gs, gs)], trav),
    partN("OR YOKE", rectPts(0, 0, sep + 26, 12), [slotPts(13, 6, 6, gs), slotPts(sep + 13, 6, 6, gs), slotPts((sep + 26) / 2, 9, 5, gs, 90)]),
    partN("GUIDE PLATE", rectPts(0, 0, L, bw + 12),
      [circPts(x1, (bw + 12) / 2, gs / 2, 14), circPts(x2, (bw + 12) / 2, gs / 2, 14), circPts(8, (bw + 12) / 2, 1.6, 12), circPts(L - 8, (bw + 12) / 2, 1.6, 12)]),
    partN("PIN (x2, 4mm dowel)", rectPts(0, 0, n_(p, "pd"), 20))];
  },
  drive(p, m, u) {
    const t = m.t; const tv = n_(p, "tv");
    const x1 = 44; const x2 = 44 + n_(p, "sep");
    const hg = (n_(p, "nd") - n_(p, "pd")) / 2 - m.c;
    const A1 = x1 - (1 - u["A"]!) * tv; const A2 = x2 + u["A"]! * tv;
    const B1 = x1 + u["B"]! * tv; const B2 = x2 - (1 - u["B"]!) * tv;
    const ok = (hx: number, nx: number): boolean => Math.abs(hx - nx) < hg * 0.75;
    const d1 = (ok(x1, A1) ? t + 0.4 : 0) + (ok(x1, A1) && ok(x1, B1) ? t + 0.4 : 0);
    const d2 = (ok(x2, A2) ? t + 0.4 : 0) + (ok(x2, A2) && ok(x2, B2) ? t + 0.4 : 0);
    const full = 2 * t + 0.8;
    const drop = Math.max(d1 >= full ? 1 : 0, d2 >= full ? 1 : 0);
    return { q: drop, read: [pair("pins", "2"), pair("bars", "2"), pair("lost motion", "2.6mm")] };
  },
};

const tumb: TumblerModule = {
  id: "tumb", mechanism: "tumbler-coded-and", name: "TUMBLER", line: 909, inputs: ["KEY", "WRONG"], stateful: false,
  params: { n: num("pin count", 3, 8, 5, 1, ""), pitch: num("pin pitch", 5, 14, 8, 0.5), pd: num("pin dia", 2, 6, 3, 0.5),
    lift: num("lift per step", 1, 4, 2, 0.25), shear: num("shear clearance", 0.1, 1.2, 0.4, 0.05),
    code: { kind: "code", label: "code (depth per pin)", max: 4, val: [1, 3, 0, 2, 4] } },
  plan(p, m) {
    const sh = tumbShellPts(p, m);
    const n = sh.n;
    const L = sh.L;
    return [partN("SHELL COMB (channels open at the bottom edge)", sh.pts, [circPts(6, 6, 1.6, 10), circPts(L - 6, 6, 1.6, 10)],
      [[[10, sh.H - sh.chD], [L - 10, sh.H - sh.chD]]]),
    partN("KEY RAIL (keyway open at the left end)", [[0, 0], [L + 14, 0], [L + 14, 10], [0, 10], [0, 6.9], [L + 2, 6.9], [L + 2, 3.1], [0, 3.1]],
      [circPts(L + 8, 5, 1.6, 10)]),
    partN("KEY", tumbKeyPts(p)),
    partN(`PIN (x${n * 2}, ${n_(p, "pd")}mm dowel cut to length)`, rectPts(0, 0, n_(p, "pd"), 11)),
    partN("BOLT", rectPts(0, 0, 34, 14), [slotPts(9, 7, 8 + m.k, 3 + m.k), slotPts(25, 7, 8 + m.k, 3 + m.k)])];
  },
  drive(p, _m, u) {
    const S = tumbSolve(p, u);
    return { q: S.allOk ? 1 : 0, read: [pair("pins", String(S.n)), pair("codes", grouped(Math.pow(5, S.n))), pair("window", `+/-${n_(p, "shear")}mm`)] };
  },
};

const latch: TumblerModule = {
  id: "latch", mechanism: "detent-latch", name: "DETENT LATCH", line: 979, inputs: ["S", "R"], stateful: true,
  params: { pitch: num("pocket pitch", 6, 24, 12, 0.5), dep: num("pocket depth", 0.8, 4, 1.8, 0.1), bl: num("spring length", 10, 45, 26, 1),
    bwid: num("spring width", 0.6, 4, 1.5, 0.1), sw: num("slider width", 10, 30, 16, 0.5), L: num("slider length", 50, 140, 90, 1) },
  plan(p, m) {
    const L = n_(p, "L"); const sw = n_(p, "sw"); const pitch = n_(p, "pitch");
    const gs = 3 + m.c * 2 + m.k;
    return [partN("SLIDER (pockets in the top edge)", latchSliderPts(p),
      [slotPts(L * 0.3, sw * 0.66, pitch + 4, gs), slotPts(L * 0.78, sw * 0.66, pitch + 4, gs)], [[[L - 14, sw - 2.5], [L - 4, sw - 2.5]]]),
    partN("PAWL (beam and tip, one part)", latchPawlPts(p), [circPts(4, 4, 1.6, 10), circPts(4, 9, 1.6, 10)]),
    partN("BASE", rectPts(0, 0, L + 16, sw + 24), [circPts(8, 8, 1.6, 10), circPts(L + 8, 8, 1.6, 10), slotPts((L + 16) / 2, sw + 18, pitch + 8, 3 + m.k)])];
  },
  drive(p, m, u, st) {
    if (u["S"]! > 0.7 && !st["sPrev"]) st["on"] = true;
    if (u["R"]! > 0.7 && !st["rPrev"]) st["on"] = false;
    st["sPrev"] = u["S"]! > 0.7;
    st["rPrev"] = u["R"]! > 0.7;
    const I = (m.t * Math.pow(n_(p, "bwid"), 3)) / 12;
    const F = (3 * m.E * I * n_(p, "dep")) / Math.pow(n_(p, "bl"), 3);
    return { q: st["on"] ? 1 : 0, read: [pair("hold force", `${fx(F, 2)}N`), pair("throw", `${n_(p, "pitch")}mm`), pair("state", st["on"] ? "SET" : "RESET")] };
  },
};

const snap: TumblerModule = {
  id: "snap", mechanism: "snap-flexure", name: "SNAP FLEXURE", line: 1036, inputs: ["A"], stateful: true,
  params: { span: num("span", 20, 90, 48, 1), rise: num("rise h", 1, 14, 5, 0.25), tk: num("beam t", 0.4, 3, 1, 0.05), wid: num("beam depth", 3, 20, 8, 0.5) },
  plan(p) {
    const g = snapGeo(p);
    const rise = n_(p, "rise");
    return [partN("FLEXURE CELL (beam stays attached at both ends)", rectPts(0, 0, g.W, g.H),
      [g.up, g.dn, circPts(6, g.yc, 1.6, 12), circPts(g.W - 6, g.yc, 1.6, 12)],
      [[[g.x0, g.yc + rise + 4.5], [g.x0 + g.span, g.yc + rise + 4.5]]]),
    partN("PUSH ROD", rectPts(0, 0, 6, rise * 3 + 10), [circPts(3, 3, 1.4, 10)])];
  },
  drive(p, m, u, st) {
    if (u["A"]! > 0.7 && !st["prev"]) st["on"] = !st["on"];
    st["prev"] = u["A"]! > 0.7;
    const Q = n_(p, "rise") / n_(p, "tk");
    // 2.31: rise over thickness for two stable states, the original's literal (line 1045); profile buckledBeam.riseOverT.
    const bist = Q > 2.31;
    const I = (n_(p, "wid") * Math.pow(n_(p, "tk"), 3)) / 12;
    const Fs = (48 * m.E * I * n_(p, "rise")) / Math.pow(n_(p, "span"), 3);
    return { q: st["on"] ? 1 : 0, read: [pair("h/t", fx(Q, 2)), pair("snap est", `${fx(Fs, 2)}N`), pair("stable", bist ? "2 states" : "1 state")] };
  },
};

const ratch: TumblerModule = {
  id: "ratch", mechanism: "ratchet-pawl", name: "RATCHET", line: 1086, inputs: ["CK"], stateful: true,
  params: { n: num("teeth", 6, 36, 12, 1, ""), rad: num("wheel radius", 10, 40, 22, 0.5), dep: num("tooth depth", 1, 6, 3, 0.25),
    rake: num("tooth rake", 10, 80, 35, 1, "deg"), pl: num("pawl length", 10, 40, 22, 1) },
  plan(p, m) {
    const rad = n_(p, "rad"); const dep = n_(p, "dep"); const pl = n_(p, "pl");
    const R = rad + 2;
    return [partN("RATCHET WHEEL", ratchetPts(n_(p, "n"), rad, dep, n_(p, "rake"), R, R), [circPts(R, R, (3 + m.c) / 2, 14)], [[[R, R], [R, R - rad + dep]]]),
      partN("DRIVE PAWL", [[0, 4], [pl, 0], [pl + 8, 3], [pl + 8, 7], [pl, 10], [0, 10]], [circPts(4, 7, 1.6, 10)]),
      partN("HOLD PAWL", [[0, 3], [pl, 0], [pl + 6, 4], [pl, 8], [0, 9]], [circPts(4, 6, 1.6, 10)]),
      partN("FRAME", rectPts(0, 0, R * 2 + 30, R * 2 + 16), [circPts(R + 15, R + 8, (3 + m.k) / 2, 12), circPts(6, 6, 1.6, 10), circPts(R * 2 + 24, R * 2 + 10, 1.6, 10)])];
  },
  drive(p, _m, u, st) {
    if (st["c"] === undefined) st["c"] = 0;
    if (u["CK"]! > 0.7 && !st["prev"]) st["c"] = (st["c"] as number) + 1;
    st["prev"] = u["CK"]! > 0.7;
    const c = st["c"] as number;
    const step = 360 / Math.round(n_(p, "n"));
    return { q: c % 2 ? 1 : 0, read: [pair("step", `${fx(step, 1)}deg`), pair("count", String(c)), pair("carry every", String(Math.round(n_(p, "n"))))] };
  },
};

const drum: TumblerModule = {
  id: "drum", mechanism: "shift-drum", name: "SHIFT DRUM", line: 1141, inputs: ["CK"], stateful: true,
  params: { steps: num("steps", 4, 8, 8, 1, ""), tracks: num("tracks", 1, 4, 4, 1, ""), rad: num("base radius", 12, 40, 22, 0.5),
    lobe: num("lobe rise", 1.5, 8, 3.5, 0.25), dwell: num("dwell %", 30, 95, 70, 1, "%"),
    grid: { kind: "grid", label: "program", rows: 4, cols: 8, val: [[1, 0, 0, 1, 1, 0, 0, 0], [0, 1, 0, 1, 0, 1, 0, 0], [0, 0, 1, 1, 0, 0, 1, 0], [1, 1, 1, 0, 0, 0, 0, 1]] } },
  plan(p, m) {
    const S = Math.round(n_(p, "steps")); const T = Math.round(n_(p, "tracks"));
    const gr = p["grid"] as readonly (readonly number[])[];
    const R = n_(p, "rad"); const lobe = n_(p, "lobe");
    const C = R + lobe + 2;
    const out: SheetPart[] = [];
    for (let t = 0; t < T; t++) {
      out.push(partN(`CAM T${t} (keyed bore)`, movePts(camTrackPts(S, lobe, n_(p, "dwell"), R, gr[t]), C, C),
        [keyedBorePts(C, C, (3 + m.c) / 2, 2, 1.4)], [[[C, C - R - lobe], [C, C - R + 2]]]));
    }
    out.push(partN(`FOLLOWER (x${T})`, rectPts(0, 0, 8, n_(p, "rad") + 16), [circPts(4, 4, 1.4, 10), slotPts(4, n_(p, "rad") + 10, 6, 2 + m.c * 2, 90)]));
    out.push(partN("SHAFT KEY STRIP", rectPts(0, 0, 2, T * (m.t + 1.4) + 6)));
    return out;
  },
  drive(p, _m, u, st) {
    if (st["c"] === undefined) st["c"] = 0;
    if (u["CK"]! > 0.7 && !st["prev"]) st["c"] = (st["c"] as number) + 1;
    st["prev"] = u["CK"]! > 0.7;
    const S = Math.round(n_(p, "steps")); const T = Math.round(n_(p, "tracks"));
    const step = 360 / S;
    const gr = p["grid"] as readonly (readonly number[])[];
    const cur = (((st["c"] as number) % S) + S) % S;
    return { q: gr[0] && gr[0][cur] ? 1 : 0, read: [pair("step angle", `${fx(step, 1)}deg`), pair("words", String(S)), pair("bits", String(S * T))] };
  },
};

const gen: TumblerModule = {
  id: "gen", mechanism: "geneva-external", name: "GENEVA", line: 1217, inputs: ["CK"], stateful: true,
  params: { n: num("slots", 3, 12, 6, 1, ""), cr: num("crank radius", 10, 40, 20, 0.5), pd: num("pin dia", 2, 8, 4, 0.5), sw2: num("slot width", 3, 10, 4.6, 0.1) },
  plan(p, m) {
    const n = Math.round(n_(p, "n")); const cr = n_(p, "cr");
    const gg = genevaGeo(n, cr);
    const R = gg.wr + 2;
    return [partN("GENEVA WHEEL (slots open to the rim)", genevaPts(n, cr, n_(p, "sw2") + m.k, R, R), [circPts(R, R, (3 + m.c) / 2, 14)], [[[R, R], [R, R - gg.wr * 0.5]]]),
      partN("CRANK + LOCKING DISC", genCrankPts(cr, gg.rl), [circPts(0, 0, (3 + m.c) / 2, 12), circPts(cr, 0, (n_(p, "pd") + m.k) / 2, 12)]),
      partN(`BASE PLATE (centres ${fx(gg.c, 2)}mm, derived)`, rectPts(0, 0, gg.c + gg.wr + 20, gg.wr * 2 + 16),
        [circPts(10, gg.wr + 8, (3 + m.k) / 2, 12), circPts(10 + gg.c, gg.wr + 8, (3 + m.k) / 2, 12)], [[[10, gg.wr + 8], [10 + gg.c, gg.wr + 8]]])];
  },
  drive(p, _m, u, st) {
    const n = Math.round(n_(p, "n")); const cr = n_(p, "cr");
    const gg = genevaGeo(n, cr);
    if (st["a"] === undefined) st["a"] = 0;
    // The original steps 2.2 deg per animation frame while CK is held (line 1225).
    st["a"] = ((st["a"] as number) + (u["CK"]! > 0.5 ? 2.2 : 0)) % 360;
    const cx = 44; const cy = 8 + gg.wr + 6; const wx = cx + gg.c;
    const ar = (st["a"] as number) * D2R;
    const dx = cx + cr * Math.cos(ar) - wx;
    const dy = cy + cr * Math.sin(ar) - cy;
    const engaged = Math.hypot(dx, dy) < gg.wr + 0.4;
    return { q: engaged ? 1 : 0, read: [pair("index", `${fx(360 / n, 1)}deg`), pair("centres", `${fx(gg.c, 2)}mm`), pair("wheel dia", `${fx(gg.wr * 2, 1)}mm`)] };
  },
};

const spur: TumblerModule = {
  id: "spur", mechanism: "spur-pair", name: "SPUR PAIR", line: 1282, inputs: ["CK"], stateful: true,
  params: { n1: num("teeth A", 8, 60, 16, 1, ""), n2: num("teeth B", 8, 80, 32, 1, ""), mod: num("module", 0.8, 4, 1.5, 0.1),
    pa: num("pressure angle", 14, 30, 20, 0.5, "deg"), bore: num("bore dia", 2, 8, 3, 0.5) },
  plan(p, m) {
    const g1 = gearPts(n_(p, "n1"), n_(p, "mod"), n_(p, "pa"), 0, 0);
    const g2 = gearPts(n_(p, "n2"), n_(p, "mod"), n_(p, "pa"), 0, 0);
    const bore = n_(p, "bore");
    const mk = (nm: string, g: typeof g1, n: number): SheetPart => partN(`${nm} (${n}T)`, movePts(g.pts, g.ra + 1, g.ra + 1),
      [circPts(g.ra + 1, g.ra + 1, (bore + m.c) / 2, 14)], [circPts(g.ra + 1, g.ra + 1, g.rp, 40).concat([[g.ra + 1 + g.rp, g.ra + 1]])]);
    return [mk("GEAR A", g1, n_(p, "n1")), mk("GEAR B", g2, n_(p, "n2")),
      partN("CENTRE JIG", rectPts(0, 0, g1.rp + g2.rp + 20, 14), [circPts(10, 7, (bore + m.k) / 2, 12), circPts(10 + g1.rp + g2.rp, 7, (bore + m.k) / 2, 12)],
        [[[10, 7], [10 + g1.rp + g2.rp, 7]]])];
  },
  drive(p) {
    const g1 = gearPts(n_(p, "n1"), n_(p, "mod"), n_(p, "pa"), 0, 0);
    const g2 = gearPts(n_(p, "n2"), n_(p, "mod"), n_(p, "pa"), 0, 0);
    const C = g1.rp + g2.rp;
    const ratio = n_(p, "n2") / n_(p, "n1");
    return { q: 1, read: [pair("centres", `${fx(C, 2)}mm`), pair("ratio", `1:${fx(ratio, 2)}`), pair("OD A/B", `${fx(g1.ra * 2, 1)} / ${fx(g2.ra * 2, 1)}`)] };
  },
};

const whif: TumblerModule = {
  id: "whif", mechanism: "whiffletree-dac", name: "WHIFFLETREE", line: 1332, inputs: ["B0", "B1", "B2"], stateful: false,
  params: { bits: num("bits", 2, 5, 3, 1, ""), stroke: num("bit 0 stroke", 1, 10, 4, 0.25), bl: num("beam length", 20, 70, 40, 1), bw: num("beam width", 5, 16, 9, 0.5) },
  plan(p, m) {
    const n = Math.round(n_(p, "bits")); const bl = n_(p, "bl"); const bw = n_(p, "bw");
    const gs = 3 + m.c * 2 + m.k;
    const out: SheetPart[] = [];
    for (let i = 0; i < n; i++) {
      const w = n_(p, "stroke") * Math.pow(2, i);
      const sx = (w + gs) / 2 + 2.5;
      out.push(partN(`BEAM B${i} (stroke ${fx(w, 1)})`, rectPts(0, 0, bl, bw),
        [slotPts(sx, bw / 2, w + gs, gs), slotPts(bl - 6, bw / 2, 4, gs), circPts(Math.min(bl / 2, sx + w / 2 + gs + 4), bw / 2, gs / 2, 12)],
        [[[sx - w / 2, bw - 1.5], [sx + w / 2, bw - 1.5]]]));
    }
    out.push(partN("SUM ROD", rectPts(0, 0, bl + 30, 10), [slotPts(8, 5, 6, gs), slotPts(bl + 22, 5, 6, gs)]));
    return out;
  },
  drive(p, _m, u) {
    const n = Math.round(n_(p, "bits"));
    const vals = [u["B0"] || 0, u["B1"] || 0, u["B2"] || 0, u["B3"] || 0, u["B4"] || 0];
    let total = 0;
    let maxT = 0;
    for (let i = 0; i < n; i++) {
      total += (vals[i]! > 0.5 ? 1 : 0) * n_(p, "stroke") * Math.pow(2, i);
      maxT += n_(p, "stroke") * Math.pow(2, i);
    }
    return { q: total / Math.max(maxT, 0.01), read: [pair("stops", String(Math.pow(2, n))), pair("full stroke", `${fx(maxT, 2)}mm`), pair("LSB", `${fx(n_(p, "stroke"), 2)}mm`)] };
  },
};

const hinge: TumblerModule = {
  id: "hinge", mechanism: "living-hinge", name: "LIVING HINGE", line: 1392, inputs: ["A"], stateful: false,
  params: { span: num("hinge span", 6, 60, 22, 1), wid: num("hinge width", 20, 120, 60, 1), rows: num("slot rows", 2, 20, 7, 1, ""),
    sl_: num("slot length", 6, 40, 16, 0.5), gap: num("end gap", 1, 8, 3, 0.25), sw: num("slot width", 0.2, 2, 0.5, 0.05),
    ang: num("bend angle", 10, 180, 90, 5, "deg") },
  plan(p) {
    const N = Math.round(n_(p, "rows")); const wid = n_(p, "wid"); const span = n_(p, "span");
    return [partN("HINGE PANEL", rectPts(0, 0, wid, span + 30), hingeFieldPts(0, 15, wid, span, N, n_(p, "sl_"), n_(p, "gap"), n_(p, "sw")),
      [[[2, 15], [wid - 2, 15]], [[2, 15 + span], [wid - 2, 15 + span]]])];
  },
  drive(p, _m, u) {
    const N = Math.round(n_(p, "rows"));
    const pitch = n_(p, "span") / (N + 1);
    const bendA = n_(p, "ang") * (u["A"] === undefined ? 1 : cl(u["A"], 0.03, 1));
    const th = Math.max(bendA * D2R, 0.05);
    const R = n_(p, "span") / th;
    const perRow = bendA / N;
    const lig = pitch - n_(p, "sw");
    // 13 deg per row and 0.6 mm ligament: the original's literals (line 1403); profile livingHinge.maxDegPerRow holds the 13.
    const bad = perRow > 13 || lig < 0.6;
    return { q: bad ? 0 : 1, read: [pair("bend R", `${fx(R, 1)}mm`), pair("per row", `${fx(perRow, 1)}deg`), pair("ligament", `${fx(lig, 2)}mm`)] };
  },
};

const fing: TumblerModule = {
  id: "fing", mechanism: "finger-joint", name: "FINGER JOINT", line: 1448, inputs: ["A"], stateful: false,
  params: { L: num("edge length", 30, 160, 80, 1), n: num("fingers", 2, 12, 4, 1, ""), fit: num("extra fit", -0.2, 0.4, 0, 0.02) },
  plan(p, m) {
    const n = Math.round(n_(p, "n")); const L = n_(p, "L");
    const a = fingerEdgePts(0, m.t, L, n, m.t, m.k + n_(p, "fit"), false);
    const b = fingerEdgePts(0, m.t, L, n, m.t, -(m.k + n_(p, "fit")), false);
    return [partN("EDGE A (tabs out)", a.concat([[L, 40], [0, 40]])), partN("EDGE B (slots in)", b.concat([[L, 40], [0, 40]]))];
  },
  drive(p, m) {
    const n = Math.round(n_(p, "n"));
    const seg = n_(p, "L") / (2 * n + 1);
    const tabW = seg + m.k + n_(p, "fit");
    const slotW = seg - m.k - n_(p, "fit");
    return { q: 1, read: [pair("pitch", `${fx(seg, 2)}mm`), pair("tab", `${fx(tabW, 2)}mm`), pair("slot", `${fx(slotW, 2)}mm`)] };
  },
};

const tesla: TumblerModule = {
  id: "tesla", mechanism: "tesla-valve", name: "TESLA VALVE", line: 1497, inputs: ["A"], stateful: false,
  params: { loops: num("loops", 2, 10, 5, 1, ""), cw: num("channel width", 1, 8, 3, 0.25), pitch: num("loop pitch", 8, 30, 16, 0.5), depth: num("channel depth", 0.5, 6, 2, 0.25) },
  plan(p) {
    const tg = teslaGeo(p);
    const n = tg.n; const W = tg.W; const H = tg.H; const cw = n_(p, "cw");
    const screws = (): Pt[][] => [circPts(6, 6, 1.6, 10), circPts(W - 6, H - 6, 1.6, 10), circPts(W - 6, 6, 1.6, 10), circPts(6, H - 6, 1.6, 10)];
    const lidHoles: Pt[][] = [...screws(),
      circPts(tg.x0 + 2, tg.y0, Math.min(cw * 0.5, 1.4), 10), circPts(tg.x0 + n_(p, "pitch") * (n + 2) - 2, tg.y0, Math.min(cw * 0.5, 1.4), 10)];
    tg.loops.forEach((lp) => lp.pins.forEach((q) => lidHoles.push(circPts(q[0], q[1], 0.8, 10))));
    const island = tg.loops[0] ? tg.loops[0].island : rectPts(0, 0, 4, 4);
    const ipins = tg.loops[0] ? tg.loops[0].pins : [];
    return [partN("CHANNEL PLATE (loops cut through)", rectPts(0, 0, W, H), [tg.main, ...tg.loops.map((l) => l.chan), ...screws()]),
      partN(`ISLAND (x${n}, pins register to the lid)`, island, ipins.map((q) => circPts(q[0], q[1], 0.8, 10))),
      partN("LID (port + pin holes)", rectPts(0, 0, W, H), lidHoles),
      partN("BASE", rectPts(0, 0, W, H), screws())];
  },
  drive(p, _m, u) {
    const n = Math.round(n_(p, "loops"));
    const dir = u["A"]! > 0.5 ? 1 : -1;
    const Di = 1 + 0.12 * n * cl(4 / n_(p, "cw"), 0.4, 2.2);
    return { q: dir > 0 ? 1 : 0, read: [pair("loops", String(n)), pair("est diodicity", fx(Di, 2)), pair("Re window", "200 - 2000")] };
  },
};

const coanda: TumblerModule = {
  id: "coanda", mechanism: "coanda-gate", name: "COANDA GATE", line: 1569, inputs: ["SL", "SR"], stateful: true,
  params: { w: num("nozzle width", 0.6, 4, 1.5, 0.1), sp: num("splitter dist", 5, 16, 9, 0.5, "x w"), so: num("wall setback", 0.5, 4, 1.5, 0.1, "x w"),
    cw: num("control width", 0.4, 3, 1, 0.1), ar: num("depth", 1, 10, 4, 0.5) },
  plan(p) {
    const ch = coandaHole(p);
    const W = ch.W; const H = ch.H;
    const scr = (): Pt[][] => [circPts(5, 5, 1.6, 10), circPts(W - 5, 5, 1.6, 10), circPts(5, H - 5, 1.6, 10), circPts(W - 5, H - 5, 1.6, 10)];
    return [partN("GATE PLATE (one chamber hole)", rectPts(0, 0, W, H), [ch.pts, ...scr()]),
      partN("LID (5 ports)", rectPts(0, 0, W, H), [...scr(), ...ch.ports.map((q) => circPts(q[0], q[1], 1.2, 10))]),
      partN("BASE", rectPts(0, 0, W, H), scr())];
  },
  drive(p, _m, u, st) {
    if (st["side"] === undefined) st["side"] = 0;
    if (u["SL"]! > 0.7 && !st["pl"]) st["side"] = 1;
    if (u["SR"]! > 0.7 && !st["pr"]) st["side"] = 0;
    st["pl"] = u["SL"]! > 0.7;
    st["pr"] = u["SR"]! > 0.7;
    st["m"] = lerp(st["m"] === undefined ? 0 : (st["m"] as number), st["side"] as number, 0.2);
    const left = (st["m"] as number) > 0.5;
    return { q: left ? 1 : 0, read: [pair("nozzle", `${n_(p, "w")}mm`), pair("splitter", `${fx(n_(p, "sp") * n_(p, "w") * 4, 1)}mm`), pair("state", left ? "LEFT" : "RIGHT")] };
  },
};

const memb: TumblerModule = {
  id: "memb", mechanism: "membrane-valve", name: "MEMBRANE VALVE", line: 1633, inputs: ["CTL"], stateful: false,
  params: { fw: num("flow width", 0.5, 6, 2, 0.1), cwd: num("control width", 0.5, 8, 3, 0.1), mt: num("membrane t", 0.1, 1.2, 0.4, 0.05), fd: num("flow depth", 0.2, 3, 0.8, 0.05) },
  lg: (i) => !i[0],
  plan(p) {
    const W = 120; const H = 26; const fw = n_(p, "fw"); const cwd = n_(p, "cwd");
    const gap = Math.max(fw * 1.6, 3);
    const scr = (): Pt[][] => [circPts(6, 6, 1.4, 10), circPts(W - 6, 6, 1.4, 10), circPts(6, H - 6, 1.4, 10), circPts(W - 6, H - 6, 1.4, 10)];
    return [partN("FLOW LAYER (two slots, seat land between)", rectPts(0, 0, W, H),
      [...scr(), slotPts(W * 0.28, H / 2, W * 0.4, fw), slotPts(W * 0.72, H / 2, W * 0.4, fw),
        circPts(W / 2 - gap / 2 - fw * 0.7, H / 2, fw * 0.7, 10), circPts(W / 2 + gap / 2 + fw * 0.7, H / 2, fw * 0.7, 10)]),
    partN("MEMBRANE (TPU, no holes but screws)", rectPts(0, 0, W, H), scr()),
    partN("CONTROL LAYER (cavity spans the seat)", rectPts(0, 0, W, H),
      [...scr(), slotPts(W / 2, H / 2, gap + fw * 4 + cwd * 4, cwd * 3), slotPts(W / 2, H * 0.2, H * 0.35, cwd, 90)]),
    partN("TOP CAP (control port)", rectPts(0, 0, W, H), [...scr(), circPts(W / 2, H * 0.14, Math.max(cwd * 0.6, 1), 10)])];
  },
  drive(p, _m, u) {
    const press = ease(u["CTL"] || 0);
    const open = 1 - press;
    // Em 30 MPa: the original's TPU membrane modulus literal (line 1657), an estimate.
    const Em = 30;
    const P = (1000 * Em * Math.pow(n_(p, "mt"), 3) * n_(p, "fd")) / Math.pow(n_(p, "fw"), 4);
    return { q: open > 0.15 ? 1 : 0, read: [pair("state", open < 0.15 ? "closed" : "open"), pair("est close", `${fx(P, 0)}kPa`), pair("layers", "4")] };
  },
};

/** The 18 modules in the original's MODS order. */
export const TUMBLER_MODULES: readonly TumblerModule[] = [
  coin, inh, wedgeOr, teet, diff, tumb, latch, snap, ratch, drum, gen, spur, whif, hinge, fing, tesla, coanda, memb,
];

export function tumblerModule(idOrMechanism: string): TumblerModule | undefined {
  return TUMBLER_MODULES.find((m) => m.id === idOrMechanism || m.mechanism === idOrMechanism);
}
