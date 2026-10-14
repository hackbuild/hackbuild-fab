// The two THINPOT spring buttons (thinpot.md 4.3, 4.4), ported line for
// line from originals/thinpot/files/feeler_thinpot.html: domeCap, the flip
// bowl with a flange lock (lines 1352 to 1418), and domeCone, the in-place
// cone (lines 1299 to 1350). They draw into the caller's parts and return
// the heights and readouts the caller needs, as the page's helpers do.

import type { Vec2 } from "@hackbuild/spec";
import { circle, clamp, dedupe, ngon, sector } from "./geom.js";
import type { TpPart } from "./parts.js";

/** The page's EZ (line 991), the overlap that keeps neighbouring shells from sharing a face, mm. */
export const TP_EZ = 0.01;

export interface DomeIn {
  readonly mode: "flip" | "inplace";
  readonly flex: TpPart;
  readonly plug: TpPart;
  readonly rigid: TpPart;
  readonly cx: number;
  readonly cy: number;
  readonly rimR: number;
  readonly wallT: number;
  readonly coneWall?: number;
  readonly domeH: number;
  readonly travel: number;
  readonly zPed0: number;
  readonly z1: number;
  readonly rPk: number;
  readonly holeR?: number;
  /** An angle (a slot of half width gapA round it) or an explicit [a0, a1] range, rad. */
  readonly gaps: readonly (number | readonly [number, number])[];
  readonly gapA: number;
  readonly clr: number;
  readonly layerH: number;
  readonly nozzle: number;
  readonly lock?: boolean;
  readonly collarGap?: number;
  readonly collarW?: number;
}

export interface DomeOut {
  readonly inplace: boolean;
  readonly skirtH: number;
  readonly base: number;
  readonly ceiling: number;
  readonly zTop: number;
  readonly travel: number;
  readonly cavity: number;
  readonly puckH: number;
  readonly stemL: number;
  readonly rStem: number;
  readonly rPk: number;
  readonly holeR: number;
  readonly rFlat: number;
  readonly collarTop: number;
  readonly collarR: number;
  readonly lock: boolean;
  readonly flangeW: number;
  readonly flangeT: number;
  readonly shoulder: number;
  readonly feel: number;
  readonly domeH: number;
  readonly wallDeg: number;
  readonly raised: boolean;
  readonly wallT: number;
  readonly hingeT: number;
  innerR(z: number): number;
}

function gapRanges(o: DomeIn): [number, number][] {
  return o.gaps.map((g): [number, number] => (typeof g === "number" ? [g - o.gapA, g + o.gapA] : [g[0], g[1]])).sort((p, q) => p[0] - q[0]);
}

/** domeCone, lines 1299 to 1350: a steep TPU cone printed in place with a cTPU cap over the hole at its top. */
export function domeCone(o: DomeIn, skirtH: number): DomeOut {
  const thMin = (40 * Math.PI) / 180;
  const wallT = o.coneWall ?? o.wallT;
  const holeR = Math.max(0.6, o.holeR ?? 1.2);
  let rCap = clamp(holeR + wallT / Math.sin(Math.PI / 4), 1.2, o.rimR * 0.45);
  let th = 0, sn = 0, ct = 0, domeH = 0;
  for (let it = 0; it < 3; it++) {
    domeH = Math.max(o.domeH, (o.rimR - rCap) * Math.tan(thMin));
    th = Math.atan2(domeH, o.rimR - rCap); sn = Math.sin(th); ct = 1 / Math.tan(th);
    rCap = clamp(holeR + wallT / sn, 1.2, o.rimR * 0.45);
  }
  const base = o.z1 + skirtH, zTop = base + domeH, capT = Math.max(3 * o.layerH, 0.6), zCone = zTop - capT;
  const twh = wallT / sn;
  const hingeT = Math.min(wallT, Math.max(0.42, 1.05 * o.nozzle));
  const twhH = hingeT / sn;
  const zH = base + 0.3 * (zCone - base);
  const rCapIn = Math.max(0.4, rCap - twh);
  const rBore = o.rimR - twhH;
  const gs = gapRanges(o);
  if (gs.length === 0) o.rigid.prism(circle(o.cx, o.cy, o.rimR, 64), [ngon(o.cx, o.cy, rBore, 64, Math.PI / 64)], o.zPed0, o.z1);
  for (let i = 0; i < gs.length; i++) {
    const ga = (gs[i] as [number, number])[1], gb = i + 1 < gs.length ? (gs[i + 1] as [number, number])[0] : (gs[0] as [number, number])[0] + 2 * Math.PI;
    if (gb - ga > 0.05) o.rigid.prism(sector(o.cx, o.cy, rBore, o.rimR, ga, gb), null, o.zPed0, o.z1);
  }
  const rOutH = o.rimR - (zH - base) * ct;
  const loop: Vec2[] = [[o.rimR, o.z1], [o.rimR, base], [rCap, zCone], [rCapIn, zCone], [rOutH - twh, zH], [rOutH - twhH, zH], [rBore, base], [rBore, o.z1]];
  o.flex.revolve(dedupe(loop), o.cx, o.cy, 64);
  o.plug.lathe([[0, zCone], [rCap, zCone], [rCap, zTop], [0, zTop]], o.cx, o.cy, 64);
  const innerR = (z: number): number => { if (z <= base) return rBore; const r = o.rimR - (z - base) * ct; return r - (z < zH ? twhH : twh); };
  return {
    inplace: true, skirtH, base, ceiling: zCone, zTop, travel: zCone - o.z1, cavity: zCone - o.z1, puckH: capT, stemL: 0, rStem: 0, rPk: rCapIn, holeR: rCapIn, rFlat: rCap,
    collarTop: o.z1, collarR: o.rimR, lock: false, flangeW: 0, flangeT: 0, shoulder: o.rimR - rCap,
    innerR, domeH, wallDeg: (th * 180) / Math.PI, raised: domeH > o.domeH + 0.01, wallT, hingeT,
    feel: Math.pow(wallT / 0.6, 3) * Math.pow(hingeT / 0.45, 1.5),
  };
}

/** domeCap, lines 1352 to 1418: the flip bowl, printed upside down beside the base, with its pedestal, collar and lip. */
export function domeCap(o: DomeIn): DomeOut {
  let skirtH = Math.max(0.8, 4 * o.layerH);
  if (o.mode === "inplace") return domeCone(o, skirtH);
  const lock = o.lock === true, fw = lock ? 1.0 : 0, ft = lock ? Math.max(0.8, 4 * o.layerH) : 0, lead = 0.6;
  if (lock) skirtH = Math.max(skirtH, ft + fw + 0.8);
  const base = o.z1 + skirtH, zc = base + o.domeH - o.wallT, zTop = base + o.domeH;
  const rPk = Math.min(o.rPk, o.rimR - o.wallT - 1.1, o.rimR * 0.4);
  const puckH = Math.max(0.6, 3 * o.layerH);
  const travel = Math.max(0.2, Math.min(o.travel, zc - puckH - o.z1 - 0.2));
  const stemL = zc - puckH - (o.z1 + travel), rStem = Math.max(0.9, rPk * 0.7);
  const rFlat = Math.min(o.rimR - o.wallT - 0.3, Math.max(rPk + 0.6, o.rimR * 0.3));
  const gs = gapRanges(o);
  const ring = (r0: number, r1: number, zA: number, zB: number): void => {
    if (gs.length === 0) { o.rigid.prism(circle(o.cx, o.cy, r1, 64), [ngon(o.cx, o.cy, r0, 64, Math.PI / 64)], zA, zB); return; }
    for (let i = 0; i < gs.length; i++) {
      const ga = (gs[i] as [number, number])[1], gb = i + 1 < gs.length ? (gs[i + 1] as [number, number])[0] : (gs[0] as [number, number])[0] + 2 * Math.PI;
      if (gb - ga > 0.05) o.rigid.prism(sector(o.cx, o.cy, r0, r1, ga, gb), null, zA, zB);
    }
  };
  ring(o.rimR - o.wallT, o.rimR, o.zPed0, o.z1);
  const gc = o.collarGap ?? 0.3, cwid = o.collarW ?? Math.max(0.84, 2.1 * o.nozzle);
  const rColIn = o.rimR + fw + gc;
  let collarTop = base + 1.0;
  if (lock) {
    ring(rColIn, rColIn + cwid, o.zPed0, o.z1 + TP_EZ);
    const rLipIn = o.rimR + gc, zRamp0 = o.z1 + ft + 0.2, zA = zRamp0 + (rColIn - rLipIn), zB = zA + 0.6;
    collarTop = zB + lead;
    const lip: Vec2[] = [[rColIn, o.z1], [rColIn + cwid, o.z1], [rColIn + cwid, collarTop], [rLipIn + lead, collarTop], [rLipIn, zB], [rLipIn, zA], [rColIn, zRamp0]];
    o.rigid.revolve(lip, o.cx, o.cy, 64);
  } else {
    ring(rColIn, rColIn + cwid, o.zPed0, collarTop);
  }
  const seg = 32, outer: Vec2[] = [], inner: Vec2[] = [];
  for (let i = 0; i <= seg; i++) { const t = (i / seg) * Math.PI / 2; outer.push([rFlat + (o.rimR - rFlat) * Math.cos(t), base + o.domeH * Math.sin(t)]); }
  outer.push([0.05, zTop]);
  inner.push([0.04, zc], [rFlat, zc]);
  for (let i = seg; i >= 0; i--) { const t = (i / seg) * Math.PI / 2; inner.push([rFlat + (o.rimR - o.wallT - rFlat) * Math.cos(t), base + (o.domeH - o.wallT) * Math.sin(t)]); }
  const foot: Vec2[] = lock
    ? [[o.rimR - o.wallT, base], [o.rimR - o.wallT, o.z1], [o.rimR + fw, o.z1], [o.rimR + fw, o.z1 + ft], [o.rimR, o.z1 + ft + fw]]
    : [[o.rimR - o.wallT, base], [o.rimR - o.wallT, o.z1], [o.rimR, o.z1]];
  const loop: Vec2[] = [[o.rimR, base] as Vec2].concat(outer, inner, foot);
  o.flex.revolve(dedupe(loop), o.cx, o.cy, 64);
  if (stemL > 0.2) o.plug.lathe([[0, o.z1 + travel], [rStem, o.z1 + travel], [rStem, zc - puckH], [rPk, zc - puckH], [rPk, zc], [0, zc]], o.cx, o.cy, 64);
  else o.plug.lathe([[0, zc - puckH], [rPk, zc - puckH], [rPk, zc], [0, zc]], o.cx, o.cy, 64);
  return {
    inplace: false, skirtH, base, ceiling: zc, zTop, travel, cavity: zc - o.z1, puckH, stemL: Math.max(0, stemL), rStem, rPk, holeR: rPk, rFlat, collarTop, collarR: rColIn + cwid,
    lock, flangeW: fw, flangeT: ft, shoulder: o.rimR - rFlat, domeH: o.domeH, wallDeg: 90, raised: false, wallT: o.wallT, hingeT: o.wallT,
    innerR: () => o.rimR - o.wallT,
    feel: Math.pow(o.wallT / 0.8, 3) * Math.pow(rFlat / o.rimR / 0.35, 2),
  };
}
