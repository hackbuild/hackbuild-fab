// The PIP stick (pip.md 5.4, canon tilt-stick, PIP preset), ported from
// originals/pip/files/haft-src/src/layout.js stickDims (lines 115 to 147)
// and the stick terminals (lines 384 to 388), and model.js lines 137 to
// 177 (the stick branch), 475 to 476 (its resistance), 548 to 571 (its
// fits rows), stickClear (lines 637 to 664) and thumbProfile (lines 668
// to 681). Defaults layout.js line 38, thumb pad printed in place.
//
// The wall pad arcs run between arbitrary angles (45 deg less the half
// split over Rw), which no per-count table holds, so their arc points take
// Math.cos and Math.sin as the revolve route does; D-175 keeps that open.

import { z } from "zod";
import { commandError, type ApplyIn, type ApplyOut, type DerivedValue, type ProfileLookup, type SchemaLike, type Vec2 } from "@hackbuild/spec";
import { sectionResistance } from "@hackbuild/profile";
import {
  EZ, circle, locateFit, dv, fitMetric, fitRow, fitWarnings, frameOf, mm, pipStack, place, segsFor, snapUp, turn,
  type FitRow, type PipStack,
} from "./common.js";
import { Emit } from "./emit.js";

const deg = Math.PI / 180;

/** Stick params, PIP defaults (layout.js line 38; route.post line 28; stack.bezel line 27). */
export const stickParams = z.object({
  neckD: z.number().positive().default(3.0),
  neckH: z.number().positive().default(2.4),
  bandR: z.number().positive().default(4.8),
  bandH: z.number().positive().default(2.4),
  /** Tilt at which the band lies flat on the wall, deg. */
  tilt: z.number().positive().default(14),
  /** Overtravel past the contact tilt, deg. */
  over: z.number().nonnegative().default(3),
  stemD: z.number().positive().default(6.0),
  capD: z.number().positive().default(15),
  capH: z.number().positive().default(1.2),
  capDish: z.number().nonnegative().default(1.6),
  capRings: z.number().int().nonnegative().default(3),
  /** Split between pads and between pad and ring, mm. */
  padGap: z.number().positive().default(0.8),
  bezel: z.number().nonnegative().default(2.4),
  post: z.number().positive().default(0.6),
  /**
   * The common net's routed terminal, mm out from the well wall Rw. PIP's
   * layout puts it at Rw + 2.65 (layout.js line 387) while its ring post
   * stands at Rw + 2.9 (model.js line 147): the two posts overlap 0.04 mm
   * tall in a 0.03 mm crescent. 2.9 makes them concentric.
   */
  commonTerm: z.number().positive().default(2.65),
  top: z.number().nonnegative().default(0),
  right: z.string().min(1).default("RIGHT"),
  up: z.string().min(1).default("UP"),
  left: z.string().min(1).default("LEFT"),
  down: z.string().min(1).default("DOWN"),
  common: z.string().min(1).default("GND"),
}).strict();
export type StickParams = z.infer<typeof stickParams>;
export const STICK_PARAMS = stickParams as unknown as SchemaLike<unknown, StickParams>;
export const STICK_DEFAULTS: StickParams = stickParams.parse({});

/** stickDims, layout.js lines 115 to 147; zwf is the well floor. */
export function stickDims(S: StickParams, zwf: number) {
  const th = S.tilt * deg, ts = (S.tilt + S.over) * deg;
  const neckR = S.neckD / 2, stemR = S.stemD / 2;
  const zp = zwf + S.neckH;
  const rbl = S.bandR, zb0 = zp + (rbl - neckR);
  const rbt = rbl - S.bandH * Math.tan(th), zb1 = zb0 + S.bandH;
  const rbm = (rbl + rbt) / 2, zbm = (zb0 + zb1) / 2 - zp;
  const Rw = rbm * Math.cos(th) + zbm * Math.sin(th);
  const zc = zp + (-rbm * Math.sin(th) + zbm * Math.cos(th));
  const span = S.bandH / Math.cos(th);
  const padZ: [number, number] = [zc - span / 2 - 0.8, zc - S.padGap / 2];
  const comZ: [number, number] = [zc + S.padGap / 2, zc + span / 2 + 0.8];
  const restGap = Rw - rbl;
  const arcAt = (t: number): number => {
    const pen = rbl * Math.cos(t) + (zb0 - zp) * Math.sin(t) - Rw;
    if (pen <= 0) return 0;
    const Re = (rbl * Rw) / Math.max(0.01, Rw - rbl);
    return Math.asin(Math.min(1, Math.sqrt(2 * Re * pen) / Rw));
  };
  const arcOver = arcAt(ts), arcHalf = arcAt(th + 1 * deg);
  const sectHalf = Math.max(20 * deg, 45 * deg - S.padGap / 2 / Rw);
  const eightWay = arcHalf + sectHalf > 45 * deg;
  const collarRise = rbt * Math.sin(ts) + (zb1 - zp) * Math.cos(ts);
  const topNeed = Math.max(comZ[1] + 0.48, zp + collarRise + 0.4);
  const footR = neckR + 2.0;
  return { th, ts, neckR, stemR, zp, rbl, zb0, rbt, zb1, rbm, zbm, Rw, zc, span, padZ, comZ, restGap, topNeed, footR, arcOver, arcHalf, sectHalf, eightWay };
}
type Dims = ReturnType<typeof stickDims>;

/** stickClear, model.js lines 637 to 655, in-place thumb pad. */
export function stickClear(S: StickParams, d: Dims, zbt: number) {
  const capR = S.capD / 2, rs = d.stemR, hole = capR + 0.8;
  const clears = (capBot: number): boolean => {
    for (let i = 0; i <= 24; i++) {
      const r = (capR * i) / 24, zz = capBot + Math.max(0, r - rs);
      const dd = r * Math.cos(d.ts) + (zz - d.zp) * Math.sin(d.ts);
      const zr = d.zp - r * Math.sin(d.ts) + (zz - d.zp) * Math.cos(d.ts);
      if (dd > hole && zr < zbt + 0.3) return false;
    }
    return true;
  };
  let lo = zbt - capR, hi = zbt + capR + 4;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (clears(mid)) hi = mid; else lo = mid;
  }
  const capBot = hi, zRim = capBot + (capR - rs);
  return { hole, capBot, zRim, lift: zRim - zbt, stemAbove: zRim - zbt + S.capH };
}

/** thumbProfile, model.js lines 668 to 681. */
export function thumbProfile(S: StickParams, rs: number, zFl: number, capR: number): Vec2[] {
  const rim = S.capH, dish = Math.min(S.capDish, 2.4);
  const zRim = zFl + (capR - rs), zTop = zRim + rim;
  const pts: Vec2[] = [[rs, zFl], [capR - 0.45, zRim - 0.45], [capR, zRim + 0.1], [capR, zTop - 0.35], [capR - 0.35, zTop]];
  const zAt = (r: number): number => zTop - dish * (1 - (r / capR) * (r / capR));
  const n = Math.max(0, Math.round(S.capRings));
  const rOuter = capR - 0.35, step = rOuter / (n ? n + 1 : 1);
  for (let k = 0; k < n; k++) {
    const r1 = rOuter - step * (k + 0.35), r2 = r1 - 0.55;
    pts.push([r1, zAt(r1)], [r1, zAt(r1) + 0.35], [r2, zAt(r2) + 0.35], [r2, zAt(r2)]);
  }
  pts.push([0, zAt(0)]);
  return pts;
}

export function stickZ(S: StickParams, s: PipStack) {
  const wellFloor = s.z.floor + 0.24;
  const d = stickDims(S, wellFloor);
  const need = Math.max(s.z.floor + 1.44, d.topNeed);
  const top = S.top > 0 ? S.top : snapUp(need, s.layer);
  const zbt = top + S.bezel;
  return { d, need, top, zbt, wellFloor, sc: stickClear(S, d, zbt) };
}

/** The thirteen stick fits rows, model.js lines 550 to 571 (in-place thumb pad). */
export function stickFits(S: StickParams, s: PipStack): FitRow[] {
  const { d, zbt, sc } = stickZ(S, s);
  const rc = Math.min(d.stemR, d.rbt - 1.0);
  const arm = sc.capBot + S.capH - d.zb1;
  const sigma = (20 * arm) / ((Math.PI * Math.pow(2 * d.stemR, 3)) / 32);
  void zbt;
  return [
    fitRow("stick", "band to wall at rest", d.restGap, mm(d.restGap), d.restGap >= 0.4, `closes at ${S.tilt} degrees of tilt`),
    fitRow("stick", "band on the wall pad", d.span / 2 - S.padGap / 2, mm(d.span / 2 - S.padGap / 2), d.span / 2 - S.padGap / 2 > 0.5, "and the same on the common ring above"),
    fitRow("stick", "contact arc, one degree past", (d.arcHalf * 2) / deg, `${((d.arcHalf * 2) / deg).toFixed(0)} deg`, d.arcHalf > 8 * deg, "zero at the contact angle itself, it grows as you push", "deg"),
    fitRow("stick", "contact arc at full tilt", (d.arcOver * 2) / deg, `${((d.arcOver * 2) / deg).toFixed(0)} deg`, d.arcOver > 15 * deg, "", "deg"),
    fitRow("stick", "diagonals reach two pads", d.eightWay ? 1 : 0, d.eightWay ? "yes" : "no", d.eightWay, `pads are ${((d.sectHalf * 2) / deg).toFixed(0)} deg wide, split by ${mm(S.padGap)}`, "flag"),
    fitRow("stick", "pad to common ring", d.comZ[0] - d.padZ[1], mm(d.comZ[0] - d.padZ[1]), d.comZ[0] - d.padZ[1] >= 0.4, "the band bridges this"),
    fitRow("stick", "bezel hole over the thumb pad", 2 * (sc.hole - S.capD / 2), mm(2 * (sc.hole - S.capD / 2)), sc.hole > S.capD / 2, "diametral, the bezel drops over it after printing"),
    fitRow("stick", "pad rim above the bezel", sc.lift, mm(sc.lift), sc.lift > 0.3, `the rim is the only part that has to clear at ${S.tilt + S.over} degrees`),
    fitRow("stick", "dish depth", Math.min(S.capDish, 2.4), mm(Math.min(S.capDish, 2.4)), true, `${S.capRings} grip rings, underside stays at 45 degrees`),
    fitRow("stick", "pad diameter", S.capD, mm(S.capD), S.capD >= 12 && S.capD <= 22, "a console thumb top is 18 to 20"),
    fitRow("stick", "conductive collar thickness", d.rbt - rc, mm(d.rbt - rc), d.rbt - rc >= 1.0, "a collar on the stem, the stem itself runs through unbroken"),
    fitRow("stick", "stem stress at a 20 N side push", sigma, `${sigma.toFixed(1)} MPa`, sigma < 15, "TPU 95A parts break somewhere around 30, and the print is weaker than the spec", "MPa"),
    fitRow("stick", "well wall to the outline", 0.6, mm(0.6), true, ""),
  ];
}

/** Band switch and the two posts, model.js lines 475 to 476. */
export function stickSwitch(S: StickParams, s: PipStack, profile: ProfileLookup) {
  const { d } = stickZ(S, s);
  const ctpu = profile.resistivity("ctpu", "bulk", "printed");
  const cplaZ = profile.resistivity("cpla", "through", "printed");
  const n = (v: number | readonly [number, number]): number => (typeof v === "number" ? v : v[0]);
  const band = sectionResistance(ctpu, d.span, S.bandH * 2);
  const padPost = sectionResistance(cplaZ, d.padZ[0] - s.z.floor, Math.PI * S.post ** 2);
  const comPost = sectionResistance(cplaZ, d.comZ[0] - s.z.floor, Math.PI * S.post ** 2);
  return { rsw: n(band.ohm) * 0.5, posts: n(padPost.ohm) + n(comPost.ohm), tiers: [band.tier, padPost.tier] };
}

export function stickDerive(S: StickParams, profile: ProfileLookup, machine = "ffc5p"): Record<string, DerivedValue> {
  const s = pipStack(profile, machine, { body: "petg", trace: "cpla" });
  const { d, top } = stickZ(S, s);
  const sw = stickSwitch(S, s, profile);
  const out: Record<string, DerivedValue> = {
    Rw: dv(d.Rw, "mm", "rbm cos(tilt) + zbm sin(tilt)", []),
    restGap: dv(d.restGap, "mm", "Rw - bandR", []),
    span: dv(d.span, "mm", "bandH / cos(tilt)", []),
    top: dv(top, "mm", "snapUp(max(floor + 1.44, topNeed), layer) unless top is set", s.tiers),
    "R.switch": dv(sw.rsw, "ohm", "rhoT span / (bandH 2) x 0.5", sw.tiers),
    "R.posts": dv(sw.posts, "ohm", "rhoZ (padZ0 - floor + comZ0 - floor) / (pi post^2)", sw.tiers),
  };
  for (const r of stickFits(S, s)) if (r.n !== null) out[`fits.${r.name}`] = dv(r.n, r.unit ?? "mm", `${r.group}: ${r.name}`, []);
  return out;
}

/** GEO.sector, geom.js lines 129 to 135: an annular sector between r0 and r1, a0 to a1 rad. */
function sector(r0: number, r1: number, a0: number, a1: number): Vec2[] {
  const k = Math.max(6, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 32)));
  const pts: Vec2[] = [];
  for (let i = 0; i <= k; i++) { const a = a0 + ((a1 - a0) * i) / k; pts.push([r1 * Math.cos(a), r1 * Math.sin(a)]); }
  for (let i = k; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / k; pts.push([r0 * Math.cos(a), r0 * Math.sin(a)]); }
  return pts;
}

export function stickApply(input: ApplyIn<StickParams>, id: string): ApplyOut {
  const S = input.params;
  const s = pipStack(input.profile, input.draft.machine, { body: "petg", trace: "cpla" });
  const f = frameOf(input.face, id);
  if (Math.abs(f.z - s.z.floor) > 1e-6) {
    throw commandError({ code: "E_SCHEMA", path: "/face/origin/2", got: f.z, expected: `the stack floor ${s.z.floor.toFixed(2)} mm`, hint: `place ${id} on the stack floor face, where the pads sit flush` });
  }
  const { d, need, top, wellFloor, sc } = stickZ(S, s);
  if (top < need - 1e-9) {
    throw commandError({ code: "E_SCHEMA", path: "/params/top", got: top, expected: `at least ${need.toFixed(2)} mm`, hint: `raise the host top to ${snapUp(need, s.layer).toFixed(2)} mm or leave top 0` });
  }
  const e = new Emit(f, s);
  const lay = s.layer, bl = s.bleed;
  const dirs = [[S.right, 0], [S.up, 1], [S.left, 2], [S.down, 3]] as const;
  const half = d.sectHalf - bl / 2 / d.Rw;
  const pad = sector(d.Rw - EZ, d.Rw + 1.7, -half, half);
  const pr = d.Rw + 1.1;
  for (const [net, q] of dirs) {
    const [c, sn] = turn(q, 4);
    const rot = (p: Vec2): Vec2 => [p[0] * c - p[1] * sn, p[0] * sn + p[1] * c];
    e.conductor(`conductor.pad${q}`, net, pad.map(rot), d.padZ[0], d.padZ[1] - bl / 2, 1.7);
    e.conductor(`conductor.padPost${q}`, net, circle(S.post, rot([pr, 0]), 20), s.z.floor - EZ, d.padZ[0] + 0.3, 2 * S.post);
    e.terminal(`${q}`, net, rot([pr, 0]), S.post);
  }
  if (d.padZ[0] < s.z.floor + 0.24) e.warnings.push({ code: "STICK", text: "stick: wall pads start below the well floor, raise the neck" });
  // The common ring, GEO.ring (geom.js line 136): one cPLA body with a hole,
  // since a conductor region is one ring with no hole and two half rings
  // fail the stage 8 union (M06-T08 finding). It joins the GND net through
  // its post, which stands 0.3 into it (net extraction joins touching pieces).
  const outerR = d.Rw + 3.9, innerR = d.Rw - EZ;
  e.body("ring", "cpla", { route: "prism", outline: [place(f, circle(outerR, [0, 0], segsFor(outerR))), place(f, [...circle(innerR, [0, 0], segsFor(innerR))].reverse())], z: [d.comZ[0] + bl / 2, d.comZ[1]] });
  const [c45, s45] = turn(1, 8);
  const cr = d.Rw + 2.9;
  e.conductor("conductor.ringPost", S.common, circle(S.post, [cr * c45, cr * s45], 20), s.z.floor - EZ, d.comZ[0] + 0.3, 2 * S.post);
  e.terminal("Common", S.common, [(d.Rw + S.commonTerm) * c45, (d.Rw + S.commonTerm) * s45], S.post);

  // Anchor foot, foot, stem core, conductive collar, in-place thumb pad (model.js lines 151 to 172).
  const zfA = s.z.pl[0] + lay, zfB = zfA + lay;
  const anchor = e.prism(circle(5.0, [0, 0], 64), zfA, zfB);
  const foot = e.prism(circle(d.footR, [0, 0], 48), zfB - EZ, wellFloor + EZ);
  const rc = Math.min(d.stemR, d.rbt - 1.0);
  const zLead = d.zb0 - (d.rbl - rc);
  const stem = e.revolve([[0, wellFloor], [d.neckR, wellFloor], [d.neckR, d.zp], [rc, d.zp + (rc - d.neckR)], [rc, d.zb1 + EZ], [0, d.zb1 + EZ]], 64);
  e.body("collar", "ctpu", e.revolve([[rc, zLead], [d.rbl, d.zb0], [d.rbt, d.zb1], [rc, d.zb1]], 64));
  const capR = S.capD / 2, zu = d.zb1;
  const zFl = Math.max(zu + 0.24, sc.capBot);
  const tp = thumbProfile(S, d.stemR, zFl, capR);
  // PIP closes the profile with [0, last z] after a profile that already ends on the axis (model.js line 170);
  // the repeated vertex is a zero-length edge, dropped here so the revolve route sees a simple profile.
  const thumb = e.revolve([[0, zu], [d.stemR, zu], ...tp], 96);
  // The TPU parts as one body, unioned as PIP unions its tpu list (model.js line 289): the stem's
  // 64 facets and the thumb's 96 share the radius rc for 0.02 mm, which two bodies cannot.
  e.body("stick", "tpu95", { route: "csg", op: "union", of: [anchor, foot, stem, thumb] });
  e.pocket("pocket.well", circle(d.Rw, [0, 0], 96), top, top - s.z.floor, locateFit(input.profile), d.restGap);

  // No contact features: a tilting band is no contact CHK-KEY-01 reads (it needs a cone), and
  // CHK-NET-27 moves an actuator straight, not about a pivot (M06-T08 finding).
  for (const [net, q] of dirs) {
    e.feature({ kind: "port", id: `port.dir${q}`, net, type: "signal", interface: "digital" });
  }
  e.feature({ kind: "port", id: "port.common", net: S.common, type: "gnd", interface: "digital" });

  e.metric("host.top", top, "mm", "host top the stick was placed under: its need snapped up a layer, or the top asked for", s.tiers);
  e.metric("stick.Rw", d.Rw, "mm", "well radius", []);
  e.metric("stick.restGap", d.restGap, "mm", `band to wall at rest, closes at ${S.tilt} deg`, []);
  const sw = stickSwitch(S, s, input.profile);
  e.metric("stick.R.switch", sw.rsw, "ohm", "band across the pad split (model.js line 476)", sw.tiers);
  const rows = stickFits(S, s);
  for (const r of rows) e.metrics.push(fitMetric("stick", r, []));
  e.warnings.push(...fitWarnings(rows));
  return e.out();
}
