// The ladder keypad (thinpot.md 4.6, canon ladder-keypad), ported line for
// line from originals/thinpot/files/feeler_thinpot.html, archetype
// `ladder` (lines 4213 to 4562): dome keys on one analogue pin, a printed
// chain of equal serpentine resistors key to key, a buried common in two
// layers, trim bridges, the flip bowls posed beside the base.
//
// The build runs the page's construction in its own coordinates; params
// default to the page's declarations (feeler-ladder, M06-T10), the layer
// and nozzle come from the draft machine's preset as the page reads them
// from its print settings (lines 5699 to 5704). The chain resistance is
// profile sectionResistance on the cPLA along row (D-098); the page's own
// cPLA rho 15 ohm cm (line 1006) stays in provenance and in the parity
// test, which passes that row in memory.

import { z } from "zod";
import { commandError, qualify, type ApplyIn, type ApplyOut, type DerivedValue, type Feature, type Metric, type ProfileLookup, type ResistivityRow, type SchemaLike, type Tier, type Vec2 } from "@hackbuild/spec";
import { sectionResistance } from "@hackbuild/profile";
import { feelerLadderParams } from "../defs/feeler/ladder.js";
import { dv, frameOf } from "../pip/common.js";
import { ladderLevels } from "../feeler.js";
import { bbox, circle, clamp, fmtR, ngon, rect, serpentine, stroke, type Loop } from "./geom.js";
import { TpParts, bodiesOf } from "./parts.js";
import { TP_EZ as EZ, domeCap, type DomeOut } from "./dome.js";

/**
 * The page's declarations (feeler-ladder). The page declares holeD twice,
 * contact hole 3 and mounting hole 3.2 (lines 4223 and 4237); its params
 * object keeps the later, so both read 3.2 in every build (finding,
 * M06-T10). The port runs at that value: holeD defaults to 3.2.
 */
export const ladderParams = feelerLadderParams.extend({
  /** contact hole dia (in place), mm: 3.2 at build, the page's later holeD (line 4237) */
  holeD: z.number().min(1.6).max(8).default(3.2),
}).strict();
export type LadderParams = z.infer<typeof ladderParams>;
export const LADDER_PARAMS = ladderParams as unknown as SchemaLike<unknown, LadderParams>;
export const LADDER_DEFAULTS: LadderParams = ladderParams.parse({});

/** The print settings the page reads (paramsFor, line 5699): layer and nozzle, mm. */
export interface TpPrint { readonly layerH: number; readonly nozzle: number }

export function tpPrint(profile: ProfileLookup, machine: string): TpPrint & { readonly tiers: readonly Tier[] } {
  const m = profile.machine(machine);
  const preset = m.presets[0];
  if (preset === undefined) throw commandError({ code: "E_REF", path: `/machines/${machine}/presets`, got: machine, expected: "a machine with a process preset", hint: `give machine ${machine} a preset; the page reads its layer and nozzle` });
  return { layerH: preset.layer, nozzle: preset.nozzle, tiers: [] };
}

export interface TpFit { readonly name: string; readonly nominal: number; readonly actual: number; readonly min: number; readonly max: number; readonly ok: boolean }
export interface TpSay { readonly k: string; readonly v: string; readonly u: string }
export interface TpTap { readonly label: string; readonly x: number; readonly y: number; readonly z: number }

export interface LadderBuild {
  readonly parts: TpParts;
  readonly readout: TpSay[];
  readonly fits: TpFit[];
  readonly notes: string[];
  readonly taps: TpTap[];
  readonly rLink: number[];
  readonly r: number;
  readonly levels: number[];
  readonly minSep: number;
  readonly n: number;
  readonly dome: DomeOut;
  readonly outline: readonly [number, number, number, number];
  readonly tiers: readonly Tier[];
}

/** The page's `ladder` build (lines 4241 to 4560) with the chain priced on `row`. */
export function ladderBuild(P0: LadderParams, pr: TpPrint, row: ResistivityRow): LadderBuild {
  const P = { ...P0 };
  const parts = new TpParts();
  const readout: TpSay[] = [], fits: TpFit[] = [], notes: string[] = [], taps: TpTap[] = [];
  const say = (k: string, v: string, u = ""): void => { readout.push({ k, v, u }); };
  const note = (s: string): void => { notes.push(s); };
  const fit = (name: string, nominal: number, actual: number, min: number, max: number): void => { fits.push({ name, nominal, actual, min, max, ok: actual >= min && actual <= max }); };
  const tap = (label: string, x: number, y: number, zz: number): void => { taps.push({ label, x, y, z: zz }); };
  let i: number, k: number;
  const clr = Math.max(0.6, pr.nozzle * 1.5);
  const base = parts.get("base", "rigid"), chain = parts.get("chain", "cond"), com = parts.get("common", "cond"),
    flex = parts.get("domes", "flex"), plugs = parts.get("plugs", "aux");
  const nx = Math.round(P.nx), ny = Math.round(P.ny), N = nx * ny;
  let pitch = P.pitch;
  const rimR = P.domeD / 2, s40 = Math.sin((40 * Math.PI) / 180);
  if (P.print === "inplace" && P.coneWall > (rimR - 2.5) * s40) { P.coneWall = Math.max(0.4, (rimR - 2.5) * s40); note(`Cone wall was cut to ${P.coneWall.toFixed(2)} mm: at 40 degree walls a thicker cone leaves no room for the pads inside it.`); }
  const wallH = P.print === "inplace" ? P.coneWall / s40 : P.wallT;
  const rC = Math.max(1.5, rimR - wallH - 1.0);
  const tw = clamp(P.tw, 0.4, Math.min(3, rC * 0.8));
  if (tw < P.tw - 0.01) note(`Resistor track width was cut to ${tw.toFixed(2)} mm: a trace wider than that would spill across the split pad it leaves.`);
  const lockOn = P.print !== "inplace" && P.lock;
  const collarR = rimR + (lockOn ? 1.3 : 0.3) + Math.max(0.84, 2.1 * pr.nozzle);
  const rEsc = collarR + clr + tw / 2;
  let s = pitch / 2 - collarR - clr;
  if (s < tw + clr) { pitch = 2 * (collarR + clr + tw + clr); s = pitch / 2 - collarR - clr; note(`Key pitch was opened to ${pitch.toFixed(1)} mm so a resistor fits between two dome collars.`); }
  let z0 = P.baseT, z1 = z0 + P.condT;
  let zP0 = z0 - P.condT;
  let zS1 = zP0 - 0.6, zS0 = zS1 - P.condT;
  if (zS0 < 0.6) { P.baseT = 0.6 + 2 * P.condT + 0.6 + 0.01; z0 = P.baseT; z1 = z0 + P.condT; zP0 = z0 - P.condT; zS1 = zP0 - 0.6; zS0 = zS1 - P.condT; note(`Base plate was thickened to ${P.baseT.toFixed(2)} mm to carry the two buried common layers.`); }
  const xk = (jj: number): number => (jj - (nx - 1) / 2) * pitch, yk = (ii: number): number => (ii - (ny - 1) / 2) * pitch;
  const taE = Math.max(0.22, Math.asin(Math.min(0.95, (tw / 2 + 0.12) / Math.max(0.3, rC - 0.6 * tw))) + 0.03);
  const aUR = Math.max(Math.PI / 4, taE), aUL = Math.PI - aUR;
  const xS = xk(0) - pitch / 2 - s - 2.2;
  const spineW = tw + 1.0;
  const termZone = P.termL + 6, topZone = Math.max(8, 2 * s + 4, P.termL + 4);
  const bx0 = xS - spineW / 2 - 3, bx1 = xk(nx - 1) + pitch / 2 + s + 2;
  const by0 = yk(0) - pitch / 2 - termZone, by1 = yk(ny - 1) + pitch / 2 + topZone;
  const mh: Loop[] = [], mh2: Loop[] = [], ins = Math.max(4, P.holeD);
  const holesIn = (x0: number, y0: number, x1: number, y1: number, alt?: boolean): Loop[] => (alt === true ? mh2 : mh).filter((h) => { const b = bbox(h); return b[0] > x0 + 0.2 && b[2] < x1 - 0.2 && b[1] > y0 + 0.2 && b[3] < y1 - 0.2; });
  const holed = (x0: number, y0: number, x1: number, y1: number): Loop[] | null => { const hh = holesIn(x0, y0, x1, y1); return hh.length > 0 ? hh : null; };

  // key order: boustrophedon so every link is a neighbour
  interface Key { i: number; j: number; x: number; y: number; gaps: number[] }
  const keys: Key[] = [];
  for (k = 0; k < N; k++) { const ii = Math.floor(k / nx), jj = ii % 2 === 0 ? k % nx : nx - 1 - (k % nx); keys.push({ i: ii, j: jj, x: xk(jj), y: yk(ii), gaps: [] }); }

  // buried common: strips under the B pads, a spine one layer deeper, a via per row
  const m = 1.0, viaW = 1.4;
  const yOut = by0 + P.termL * 0.5 + 1;
  const xStrip0 = xk(0) - rC - m, xStrip1 = xk(nx - 1) + rC + m;
  if (P.mountHoles) {
    const xVh = Math.min(xS + P.termPitch, xStrip0 - tw / 2 - clr - 0.3);
    const rot = Math.PI / 24;
    for (const hc of [[bx1 - ins, by0 + ins], [bx1 - ins, by1 - ins], [xVh + P.termW / 2 + P.holeD / 2 + 1.5, by0 + ins], [xS + spineW / 2 + P.holeD / 2 + 1.2, by1 - ins]] as const) {
      mh.push(ngon(hc[0], hc[1], P.holeD / 2, 24, rot));
      mh2.push(ngon(hc[0], hc[1], P.holeD / 2, 24, rot * 1.5));
    }
  }
  const yArm: number[] = [];
  let yArmTop = 0;
  for (i = 0; i < ny; i++) {
    const ya = yk(i) - rC - m + 0.3; yArm.push(ya); yArmTop = ya + spineW;
    com.prism(rect(xStrip0, yk(i) - rC - m, xStrip1 - xStrip0, rC + m), null, zP0, z0);
    com.prism(rect(xS, ya, xStrip0 + 0.3 + viaW + 0.2 - xS, spineW), null, zS0, zS1);
    com.prism(rect(xStrip0 + 0.3, ya, viaW, spineW), null, zS0 + EZ, zP0 + EZ);
  }
  com.prism(rect(xS - spineW / 2, yOut - 1.3, spineW, yArmTop - (yOut - 1.3)), null, zS0, zS1);
  com.prism(rect(xS - spineW / 2, yOut - 1.5, spineW, 3), null, zS0, z1);
  // base: floor, deep filler, separator with via holes, strip layer with the strips cut out
  base.prism(rect(bx0, by0, bx1 - bx0, by1 - by0), holed(bx0, by0, bx1, by1), 0, zS0);
  base.prism(rect(bx0, by0, xS - spineW / 2 - bx0, by1 - by0), null, zS0 - EZ, zS1);
  base.prism(rect(xS - spineW / 2 - EZ, by0, spineW + 2 * EZ, yOut - 1.5 - by0), null, zS0 - EZ * 2, zS1);
  base.prism(rect(xS - spineW / 2 - EZ, yArmTop, spineW + 2 * EZ, by1 - yArmTop), null, zS0 - EZ * 2, zS1);
  let yb = by0;
  const xR0 = xS + spineW / 2;
  for (i = 0; i < ny; i++) {
    base.prism(rect(xR0, yb, bx1 - xR0, (yArm[i] as number) - yb), holed(xR0, yb, bx1, yArm[i] as number), zS0 - EZ, zS1);
    base.prism(rect(xStrip0 + 0.3 + viaW + 0.2, (yArm[i] as number) - EZ, bx1 - (xStrip0 + 0.3 + viaW + 0.2), spineW + 2 * EZ), null, zS0 - EZ * 3, zS1);
    yb = (yArm[i] as number) + spineW;
  }
  base.prism(rect(xR0, yb, bx1 - xR0, by1 - yb), holed(xR0, yb, bx1, by1), zS0 - EZ, zS1);
  const sepHoles: Loop[] = [rect(xS - spineW / 2, yOut - 1.5, spineW, 3)].concat(holesIn(bx0 + 0.3, by0 + 0.3, bx1 - 0.3, by1 - 0.3, true));
  for (i = 0; i < ny; i++) sepHoles.push(rect(xStrip0 + 0.3, yArm[i] as number, viaW, spineW));
  base.prism(rect(bx0 + 0.3, by0 + 0.3, bx1 - bx0 - 0.6, by1 - by0 - 0.6), sepHoles, zS1, zP0);
  const stripHoles: Loop[] = [rect(xS - spineW / 2, yOut - 1.5, spineW, 3)].concat(holesIn(bx0, by0, bx1, by1));
  for (i = 0; i < ny; i++) stripHoles.push(rect(xStrip0, yk(i) - rC - m, xStrip1 - xStrip0, rC + m));
  base.prism(rect(bx0, by0, bx1 - bx0, by1 - by0), stripHoles, zP0 - EZ, z0);

  // pads, domes, plugs
  const a0 = Math.asin(Math.min(0.9, clr / 2 / rC));
  const half = (x: number, y: number, top: boolean): Loop => {
    const p: Loop = [], n2 = 24, aS = top ? a0 : Math.PI + a0, aE = top ? Math.PI - a0 : 2 * Math.PI - a0;
    for (let q = 0; q <= n2; q++) { const aa = aS + ((aE - aS) * q) / n2; p.push([x + rC * Math.cos(aa), y + rC * Math.sin(aa)]); }
    return p;
  };
  const rPk = Math.min(P.plugD / 2, rC * 0.9);
  const gapA = (tw / 2 + clr) / (rimR - P.wallT) + 0.05;

  // chain links: which box, which escape angles
  interface End { key: Key; ang: number }
  interface Link { k: number; kind: "v" | "h"; x0: number; x1: number; y0: number; y1: number; rt?: boolean; from: End; to: End | null; end?: boolean; nH?: number; xm?: number; pH?: number; path?: Loop; fromEnd?: Vec2; toEnd?: Vec2 }
  const links: Link[] = [];
  for (k = 0; k < N - 1; k++) {
    const A = keys[k] as Key, B = keys[k + 1] as Key;
    if (A.i === B.i) {
      const xm = (A.x + B.x) / 2, right = B.x > A.x;
      links.push({ k, kind: "v", x0: xm - s, x1: xm + s, y0: A.y + clr + tw / 2, y1: A.y + pitch - rC - m - clr - tw / 2, from: { key: A, ang: right ? aUR : aUL }, to: { key: B, ang: right ? aUL : aUR } });
    } else {
      const rt = A.j === nx - 1, xe = rt ? A.x + pitch / 2 : A.x - pitch / 2;
      const hx0 = rt ? Math.max(xe - s, A.x + rC + m + tw / 2 + clr) : xe - s, hx1 = rt ? xe + s : Math.min(xe + s, A.x - rC - m - tw / 2 - clr);
      links.push({ k, kind: "h", x0: hx0, x1: hx1, y0: A.y + clr + tw / 2, y1: B.y - rC - m - clr - tw / 2, rt, from: { key: A, ang: rt ? aUR : aUL }, to: { key: B, ang: rt ? taE : Math.PI - taE } });
    }
  }
  const E = keys[N - 1] as Key, xE = E.x;
  links.push({ k: N - 1, kind: "v", x0: xE - s, x1: xE + s, y0: E.y + rEsc, y1: by1 - 3 - tw / 2, from: { key: E, ang: Math.PI / 2 }, to: null, end: true });
  for (const K of keys) K.gaps = [];
  for (const L of links) { L.from.key.gaps.push(L.from.ang); if (L.to !== null) L.to.key.gaps.push(L.to.ang); }
  (keys[0] as Key).gaps.push(Math.PI - taE);

  const rLink: number[] = [];
  const traceR = (L: number): number => { const r = sectionResistance(row, L, tw * P.condT).ohm; return typeof r === "number" ? r : r[0]; };
  const vserp = (x0: number, y0: number, w: number, h: number, n: number, margin: number): Loop => serpentine(y0, x0, h, w, n, margin).map((p): Vec2 => [p[1], p[0]]);
  const pathLen = (p: Loop): number => { let L = 0; for (let q = 0; q < p.length - 1; q++) L += Math.hypot((p[q + 1] as Vec2)[0] - (p[q] as Vec2)[0], (p[q + 1] as Vec2)[1] - (p[q] as Vec2)[1]); return L; };
  let nLeg = Math.max(2, Math.floor((2 * s - tw) / (tw + clr)) + 1);
  if (nLeg % 2 !== 0) nLeg--;
  let Ltarget: number | null = null, bridges = 0;
  for (const L of links) {
    let path: Loop;
    const w = L.x1 - L.x0, h = L.y1 - L.y0;
    if (L.kind === "v") {
      path = vserp(L.x0, L.y0, w, h, nLeg, tw / 2);
      if (Ltarget === null) Ltarget = pathLen(path);
    } else {
      let nH = Math.max(2, 2 * Math.round(Math.max(1, (Ltarget ?? h * 2) / (2 * (w - tw)))));
      let maxH = Math.max(2, Math.floor((h - tw) / (tw + clr)) + 1);
      if (maxH % 2 !== 0) maxH--;
      nH = Math.min(nH, maxH);
      const legLen = Math.min(w, (Ltarget ?? h * 2) / nH + tw);
      const xa = L.rt === true ? L.x0 : L.x1 - legLen;
      path = serpentine(xa, L.y0, legLen, h, nH, tw / 2);
      if (L.rt !== true) { const cx2 = xa + legLen / 2; path = path.map((p): Vec2 => [2 * cx2 - p[0], p[1]]); }
      L.nH = nH; L.xm = xa + legLen / 2; L.pH = (h - tw) / (nH - 1);
    }
    L.path = path;
    chain.prism(stroke(path, tw, "round"), null, z0, z1);
    rLink.push(traceR(pathLen(path)));
    const pS = path[0] as Vec2, pE = path[path.length - 1] as Vec2;
    const leftward = L.kind === "v" && L.to !== null && L.to.key.x < L.from.key.x;
    const fromEnd = leftward ? pE : pS, toEnd = leftward ? pS : pE;
    L.fromEnd = fromEnd; L.toEnd = toEnd;
    const f = L.from.key, fa = L.from.ang;
    const pf: Vec2 = [f.x + (rC - tw * 0.6) * Math.cos(fa), f.y + (rC - tw * 0.6) * Math.sin(fa)];
    const pr0: Vec2 = [f.x + rEsc * Math.cos(fa), f.y + rEsc * Math.sin(fa)];
    chain.prism(stroke([pf, pr0, [fromEnd[0], pr0[1]], [fromEnd[0], fromEnd[1] + 0.35]], tw, "round"), null, z0, z1);
    if (L.to !== null) {
      const t = L.to.key, ta = L.to.ang;
      const pt: Vec2 = [t.x + (rC - tw * 0.6) * Math.cos(ta), t.y + (rC - tw * 0.6) * Math.sin(ta)];
      const pu: Vec2 = [t.x + rEsc * Math.cos(ta), t.y + rEsc * Math.sin(ta)];
      chain.prism(stroke([pt, pu, [toEnd[0], pu[1]], [toEnd[0], toEnd[1] + 0.35]], tw, "round"), null, z0, z1);
    }
    if (P.trim) {
      if (L.kind === "v") {
        const pV = (w - tw) / (nLeg - 1), ym = (L.y0 + L.y1) / 2;
        for (i = 0; i < nLeg - 1; i++) { chain.prism(rect(L.x0 + tw / 2 + i * pV - 0.05, ym - 0.3, pV + 0.1, 0.6), null, z0, z1); bridges++; }
      } else {
        for (i = 0; i < (L.nH as number) - 1; i++) { chain.prism(rect((L.xm as number) - 0.3, L.y0 + tw / 2 + i * (L.pH as number) - 0.05, 0.6, (L.pH as number) + 0.1), null, z0, z1); bridges++; }
      }
    }
  }
  // VCC lead into key 0 from the left, over the buried spine
  const K0 = keys[0] as Key, ang0 = Math.PI - taE;
  let xV = Math.min(xS + P.termPitch, xStrip0 - tw / 2 - clr - 0.3);
  if (xV < xS + P.termW + clr) { xV = xS + P.termW + clr; note("The VCC pad is squeezed between the OUT pad and the first key. Widen the key pitch or narrow the terminals."); }
  const puV: Vec2 = [K0.x + rEsc * Math.cos(ang0), K0.y + rEsc * Math.sin(ang0)];
  const xLead = Math.min(xV, puV[0] - tw), yPadV = by0 + P.termL * 0.5 + 1;
  const vPath: Loop = [[K0.x + (rC - tw * 0.6) * Math.cos(ang0), K0.y + (rC - tw * 0.6) * Math.sin(ang0)], puV, [xLead, puV[1]], [xLead, yPadV]];
  if (xLead < xV - 0.05) vPath.push([xV, yPadV]);
  chain.prism(stroke(vPath, tw, "round"), null, z0, z1);
  // GND lead from the last resistor's far end
  const pEnd = (links[links.length - 1] as Link).toEnd as Vec2;
  const xG = Math.min(bx1 - (P.mountHoles ? Math.max(4, P.holeD) + P.holeD / 2 + 1.5 : 2) - P.termW / 2, Math.max(pEnd[0] + P.termPitch, xE + s + clr + P.termW / 2 + 0.2));
  chain.prism(stroke([[pEnd[0], pEnd[1] + 0.35], [pEnd[0], by1 - 2 - tw / 2], [xG, by1 - 2 - tw / 2]], tw, "round"), null, z0, z1);
  const padAt = (part: typeof chain, x: number, y: number, label: string): void => {
    part.prism(rect(x - P.termW / 2, y - P.termL / 2, P.termW, P.termL), [circle(x, y - P.termL * 0.15, P.wireD / 2, 20)], z0, z1);
    tap(label, x, y + P.termL * 0.3, (z0 + z1) / 2);
  };
  padAt(com, xS, yOut, "OUT");
  padAt(chain, xV, by0 + P.termL * 0.5 + 1, "VCC");
  padAt(chain, xG, by1 - P.termL / 2 - 2, "GND");

  // every key: A half on the chain, B half on the common, pedestal, dome, plug
  let padTop = z1, rCol = rC, padNoted = false, gapIn = P.travel;
  let D: DomeOut | null = null;
  keys.forEach((K, idx) => {
    D = domeCap({
      mode: P.print, flex, plug: plugs, rigid: base, cx: K.x, cy: K.y, rimR, wallT: P.wallT, coneWall: P.coneWall, domeH: P.domeH, travel: P.travel,
      zPed0: z0, z1, rPk, holeR: P.holeD / 2, gaps: K.gaps, gapA, clr, layerH: pr.layerH, nozzle: pr.nozzle, lock: P.lock,
    });
    const d = D as unknown as DomeOut;
    if (d.inplace && idx === 0) {
      gapIn = Math.max(1.2, P.travel < 0.35 * d.cavity ? 0.45 * d.cavity : Math.min(P.travel, 0.5 * d.cavity));
      padTop = Math.max(z1, d.ceiling - gapIn);
      let rFit = d.innerR(padTop) - clr;
      if (rFit < 1.5) { padTop = z1 + 0.3; while (padTop < d.ceiling - gapIn && d.innerR(padTop + 0.3) - clr >= 1.5) padTop += 0.3; rFit = d.innerR(padTop) - clr; padNoted = true; }
      rCol = clamp(Math.min(rC, rFit), 1.2, 20);
    }
    const hA = half(K.x, K.y, true), hB = half(K.x, K.y, false);
    if (d.inplace && rCol < rC - 0.01) {
      const a1 = Math.asin(Math.min(0.9, clr / 2 / rCol));
      const colA: Loop = [], colB: Loop = [], n2 = 24;
      for (let q = 0; q <= n2; q++) { const aa = a1 + ((Math.PI - 2 * a1) * q) / n2; colA.push([K.x + rCol * Math.cos(aa), K.y + rCol * Math.sin(aa)]); }
      for (let q2 = 0; q2 <= n2; q2++) { const ab = Math.PI + a1 + ((Math.PI - 2 * a1) * q2) / n2; colB.push([K.x + rCol * Math.cos(ab), K.y + rCol * Math.sin(ab)]); }
      chain.prism(hA, null, z0, z1); chain.prism(colA, null, z1 - EZ, padTop);
      com.prism(hB, null, z0 - EZ, z1); com.prism(colB, null, z1 - EZ, padTop);
    } else {
      chain.prism(hA, null, z0, padTop);
      com.prism(hB, null, z0 - EZ, padTop);
    }
    tap(`A${idx}`, K.x, K.y + rC * 0.5, (z0 + z1) / 2);
    tap(`B${idx}`, K.x, K.y - rC * 0.5, (z0 + z1) / 2);
  });
  const Dd = D as unknown as DomeOut;
  if (Dd.inplace) {
    fit("cone wall angle", 40, Dd.wallDeg, 39.9, 90);
    fit("cap to contacts", 0.45 * Dd.cavity, Dd.ceiling - padTop, Math.max(1.2, 0.33 * Dd.cavity), Dd.cavity * 0.55);
    say("contacts", `two half columns r ${rCol.toFixed(1)}, ${(padTop - z1).toFixed(1)} mm tall, cap patch dia ${(2 * Dd.holeR).toFixed(1)} lands on them`);
    say("cap travel to contact", `${(Dd.ceiling - padTop).toFixed(1)} of a ${Dd.cavity.toFixed(1)} mm cavity (${((100 * (Dd.ceiling - padTop)) / Dd.cavity).toFixed(0)} percent)`);
    if (Math.abs(gapIn - P.travel) > 0.05) note(`Contact gap set to ${gapIn.toFixed(2)} mm (${((100 * gapIn) / Dd.cavity).toFixed(0)} percent of the cavity). Closer than about a third of the cavity there is no press to feel and the cap can print onto the contacts.`);
    if (padNoted) note(`The contacts stop at ${(padTop - z1).toFixed(1)} mm: any taller and they would hit the inside of the cones. Open the domes or the hole for a shorter cap travel.`);
    if (Dd.raised) note(`Dome rise was raised to ${Dd.domeH.toFixed(1)} mm so the cones print in place at 40 degree walls. Shrink the domes for lower keys.`);
  } else {
    const domeDx = bx1 + 6 + collarR - xk(0);
    parts.pose("domes", { dx: domeDx, dy: 0, dz: -z1, flipZ: [z1, Dd.zTop] });
    parts.pose("plugs", { dx: domeDx, dy: 0, dz: -z1, flipZ: [z1, Dd.zTop] });
    fit("plug clearance at rest", P.travel, Dd.travel, 0.2, P.domeH * 0.85);
    fit("shoulder to flex", Dd.shoulder, Dd.shoulder, 1.5, 100);
    say("plug", `r ${Dd.rPk.toFixed(1)} disc, ${Dd.puckH.toFixed(1)} thick on the ceiling${Dd.stemL > 0.2 ? `, r ${Dd.rStem.toFixed(1)} stem ${Dd.stemL.toFixed(1)} long` : ""}`);
    say("dome top", `flat r ${Dd.rFlat.toFixed(1)}, then ${Dd.shoulder.toFixed(1)} mm of shoulder to the rim`);
    say("feel", Dd.feel < 0.6 ? "light click" : Dd.feel < 1.5 ? "crisp click" : Dd.feel < 3.5 ? "firm" : "stiff, thin the wall or shrink the plug");
    if (Dd.lock) say("retention", `flange ${Dd.flangeW.toFixed(1)} x ${Dd.flangeT.toFixed(1)} under a 45 degree lip on every collar, press fit`);
    if (Math.abs(Dd.travel - P.travel) > 0.05) note(`Contact gap was cut to ${Dd.travel.toFixed(2)} mm, all the room there is under the ceiling.`);
    if (Dd.travel > P.domeH * 0.85) note(`The plug has to drop ${Dd.travel.toFixed(1)} mm to touch and the domes only rise ${P.domeH.toFixed(1)}. Shorten the gap or raise the domes or they will never close.`);
  }
  // readout (lines 4492 to 4509)
  const Rmax = Math.max(...rLink), Rmin = Math.min(...rLink), R = rLink.reduce((a, b) => a + b, 0) / rLink.length;
  const lv = ladderLevels(N, R, P.Rpd * 1000);
  lv.push(0);
  let minSep = 1e9;
  for (k = 0; k < lv.length - 1; k++) minSep = Math.min(minSep, Math.abs((lv[k] as number) - (lv[k + 1] as number)));
  say("outline", `${(bx1 - bx0).toFixed(0)} x ${(by1 - by0).toFixed(0)} x ${Dd.zTop.toFixed(1)}, domes print beside it`, "mm");
  say("keys", `${nx} x ${ny} = ${N}`);
  say("step resistor", fmtR(R) + (Rmax - Rmin > R * 0.05 ? ` (links vary ${fmtR(Rmin)} to ${fmtR(Rmax)})` : ""));
  say("chain total", fmtR(R * N));
  say(`chain current at ${P.vcc} V`, ((P.vcc / (R * N)) * 1e6).toFixed(0), "uA");
  say("levels", `${N + 1} incl. no key`);
  say("smallest step", `${(minSep * P.vcc).toFixed(3)} V, ${(minSep * 1023).toFixed(0)} counts at 10 bit`);
  const l0 = links[0] as Link;
  say("legs per resistor", `${String(nLeg)} x ${(l0.y1 - l0.y0).toFixed(0)} mm`);
  if (P.trim) say("trim bridges", `${bridges} total, each cut adds about ${fmtR(traceR(l0.y1 - l0.y0 + (Math.PI * (tw + clr)) / 2))}`);
  say("wires out", "3 (VCC, OUT, GND)");
  if (Dd.inplace) {
    say("domes", `in place cones, walls ${Dd.wallDeg.toFixed(0)} deg, caps r ${Dd.rFlat.toFixed(1)} conductive TPU`);
    say("cone wall", `${Dd.wallT.toFixed(2)} mm, hinge band ${Dd.hingeT.toFixed(2)} mm`);
    say("feel", Dd.feel < 0.7 ? "light" : Dd.feel < 1.6 ? "medium, like a silicone remote" : Dd.feel < 4 ? "firm" : "stiff, thin the wall");
  }
  if (minSep * 1023 < 25) note(`The smallest step is ${(minSep * 1023).toFixed(0)} ADC counts. Printed resistors drift a few percent with temperature, so under about 25 counts keys start to overlap. Fewer keys or a bigger pull down.`);
  return { parts, readout, fits, notes, taps, rLink, r: R, levels: lv, minSep, n: N, dome: Dd, outline: [bx0, by0, bx1, by1], tiers: [row.provenance.tier] };
}

const cplaRow = (profile: ProfileLookup): ResistivityRow => profile.resistivity("cpla", "along", "printed");

export function ladderDerive(P: LadderParams, profile: ProfileLookup, machine = "ffc5p"): Record<string, DerivedValue> {
  const b = ladderBuild(P, tpPrint(profile, machine), cplaRow(profile));
  const t = b.tiers;
  const out: Record<string, DerivedValue> = {
    keys: dv(b.n, "count", "nx ny", []),
    "R.step": dv(b.r, "ohm", "mean over links of rho L / (tw condT), serpentine length L", t),
    "R.chain": dv(b.r * b.n, "ohm", "N R.step", t),
    smallestStep: dv(b.minSep, "fraction of vcc", "min |V(k) - V(k+1)|, V(k) = Rpar / (k R + Rpar), plus the no-key level", t),
    smallestStepCounts: dv(b.minSep * 1023, "count", "smallestStep x 1023 (10 bit)", t),
    zTop: dv(b.dome.zTop, "mm", "dome top above the bed, assembled", []),
  };
  b.levels.forEach((v, k) => { out[`level.${k}`] = dv(v, "fraction of vcc", k < b.n ? `key ${k + 1}` : "no key", t); });
  for (const f of b.fits) out[`fits.${f.name}`] = dv(f.actual, "mm", `${f.min} to ${f.max}`, []);
  return out;
}

export function ladderApply(input: ApplyIn<LadderParams>, id: string): ApplyOut {
  const P = input.params;
  const pr = tpPrint(input.profile, input.draft.machine);
  const row = cplaRow(input.profile);
  const b = ladderBuild(P, pr, row);
  const f = frameOf(input.face, id);
  const { bodies, slots } = bodiesOf(b.parts, f);
  const metrics: Metric[] = [];
  const tiers = b.tiers;
  const metric = (mid: string, value: number | string, unit: string | undefined, note: string, t: readonly Tier[]): void => {
    metrics.push({ id: mid, value, ...(unit === undefined ? {} : { unit }), ...qualify(t), note, gate: "informational", group: "readouts" });
  };
  metric("ladder.keys", b.n, "count", "keys on one analogue pin", []);
  metric("ladder.R.step", b.r, "ohm", "mean link resistance, profile cPLA along row", tiers);
  metric("ladder.R.chain", b.r * b.n, "ohm", "chain end to end", tiers);
  metric("ladder.smallestStep", b.minSep * 1023, "count", "smallest step at 10 bit", tiers);
  metric("ladder.zTop", b.dome.zTop, "mm", "dome top above the bed, assembled", []);
  for (const r of b.readout) metric(`ladder.say.${r.k.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`, r.v, r.u === "" ? undefined : r.u, `${r.k}: ${r.v}${r.u === "" ? "" : ` ${r.u}`}`, tiers);
  for (const x of b.fits) metric(`ladder.fits.${x.name.replace(/[^a-z0-9]+/gi, "-")}`, x.actual, "mm", `${x.name} ${x.actual.toFixed(2)} mm, legal ${x.min} to ${x.max}${x.ok ? "" : " (not ok)"}`, []);
  const features: Feature[] = [];
  const ports: string[] = [];
  return { bodies, features, ports, slots, metrics, warnings: [...b.fits.filter((x) => !x.ok).map((x) => ({ code: "FIT", text: `${x.name} is ${x.actual.toFixed(2)} mm, legal ${x.min} to ${x.max}` })), ...b.notes.map((n) => ({ code: "NOTE", text: n }))] };
}
