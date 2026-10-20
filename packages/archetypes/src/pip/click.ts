// The PIP click spring key (pip.md 5.2, canon click-spring-key), ported
// from originals/pip/files/haft-src/src/layout.js clickerDims (lines 81 to
// 97) and the clicky terminals (line 378), and model.js lines 89 to 112
// (slot, cap well, pads, ribs), 366 to 390 (the spring element and the
// cap), 471 to 472 (its resistance), 531 to 541 (its fits rows),
// chamferTop (lines 623 to 635) and clickElement2D (lines 683 to 704).
// Defaults layout.js line 36.
//
// The FE curve comes from packages/sim through the solver core registers
// (solvers.ts, D-044); the contact travel cg it returns places the tip, so
// the geometry follows the curve as PIP's does. The slot runs along face.u.
// The spring element and the cap print apart from the body, as PIP prints
// them (model.js lines 401 to 411): flat, and flange down, at `loose`
// (local mm from the key centre). The arch centrelines take Math.cos at
// arbitrary u, as the revolve route does; D-175 keeps that open.

import { z } from "zod";
import { commandError, type ApplyIn, type ApplyOut, type DerivedValue, type ProfileLookup, type SchemaLike, type ShapeDecl, type Vec2 } from "@hackbuild/spec";
import { sectionResistance } from "@hackbuild/profile";
import {
  EZ, circle, locateFit, dv, fitMetric, fitRow, fitWarnings, frameOf, mm, pipStack, rect, snapUp,
  type FitRow, type PipStack,
} from "./common.js";
import { Emit } from "./emit.js";
import { clickCurve, type ClickCurve } from "../solvers.js";

/** Click key params, PIP defaults (layout.js line 36; route.post line 28; stack.bezel line 27). */
export const clickParams = z.object({
  l: z.number().positive().default(24),
  t: z.number().positive().default(0.55),
  Q: z.number().positive().default(2.0),
  w: z.number().positive().default(1.6),
  g: z.number().positive().default(1.0),
  sw: z.number().positive().default(3.0),
  eb: z.number().positive().default(2.2),
  tip: z.number().positive().default(3.2),
  cap: z.number().positive().default(10),
  rib: z.number().positive().default(0.8),
  flange: z.number().positive().default(1.2),
  flangeT: z.number().positive().default(1.0),
  protrude: z.number().nonnegative().default(3.0),
  /** Beam modulus, MPa; PIP's E (layout.js line 36). */
  E: z.number().positive().default(1900),
  slotClr: z.number().positive().default(0.3),
  relief: z.number().nonnegative().default(1.2),
  endClr: z.number().nonnegative().default(0.4),
  bezel: z.number().nonnegative().default(2.4),
  post: z.number().positive().default(0.6),
  top: z.number().nonnegative().default(0),
  /** Where the loose spring and cap print, local mm from the key centre. */
  loose: z.tuple([z.number(), z.number()]).default([0, -24]),
  net: z.string().min(1).default("KEY"),
  common: z.string().min(1).default("GND"),
  /** Force curve samples emitted as spring.curve metrics, 0 for none (each sample adds two metrics). */
  curveSamples: z.number().int().min(0).max(64).default(0),
}).strict();
export type ClickParams = z.infer<typeof clickParams>;
export const CLICK_PARAMS = clickParams as unknown as SchemaLike<unknown, ClickParams>;
export const CLICK_DEFAULTS: ClickParams = clickParams.parse({});

/** clickerDims, layout.js lines 81 to 97, on the solver's curve. */
export function clickerDims(C: ClickParams, fe: ClickCurve) {
  const h = C.Q * C.t;
  const cg = fe.contactMm;
  const tipExp = 0.8, dove = 1.2;
  const va = cg + tipExp + dove + 0.4 - h + C.t / 2;
  const vb = va + C.t + C.g;
  const stemH = cg + 0.45;
  const vTop = vb + h + C.t / 2 + stemH;
  return { h, cg, tipExp, dove, va, vb, stemH, vTop, blockTop: vb + C.t + 0.8, len: C.l + 2 * C.eb, eStop: fe.eStop, fe };
}

export function clickZ(C: ClickParams, s: PipStack, fe: ClickCurve) {
  const cd = clickerDims(C, fe);
  const need = Math.max(s.z.floor + 1.44, s.z.floor + cd.vTop + C.flangeT);
  const top = C.top > 0 ? C.top : snapUp(need, s.layer);
  const raw = Math.max(s.z.floor, top - C.flangeT - cd.vTop);
  const floor = Math.max(s.z.floor, Math.floor((raw + 1e-6) / s.layer) * s.layer);
  return { cd, need, top, floor, vTopEff: top - C.flangeT - floor, zbt: top + C.bezel, capR: C.cap / 2 + C.flange + 0.4 };
}

/** The profile row the stop travel is read from, cg + this (layout.js line 95). */
const STOP_OVERTRAVEL = "click.stopOvertravel";

/** n force samples at equal travel steps from 0 to stopMm, linear between the solver's load steps. */
export function clickCurveSamples(fe: ClickCurve, stopMm: number, n: number): { d: number; F: number }[] {
  const pts = fe.pts ?? [];
  if (pts.length < 2 || pts[pts.length - 1]!.d < stopMm - 1e-9) {
    throw commandError({
      code: "E_KERNEL", path: "/params/curveSamples", got: pts.length === 0 ? "no curve points" : `points to ${pts[pts.length - 1]!.d} mm`, expected: `curve points to ${stopMm.toFixed(3)} mm`,
      hint: "the registered click solver returns no load steps that reach the stop; call the archetype through core, or set curveSamples 0", record: "viewer-sim",
    });
  }
  const out: { d: number; F: number }[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const d = n === 1 ? stopMm : (stopMm * i) / (n - 1);
    while (j < pts.length - 2 && pts[j + 1]!.d < d) j++;
    const a = pts[j]!, b = pts[j + 1]!;
    const k = b.d === a.d ? 0 : Math.min(1, Math.max(0, (d - a.d) / (b.d - a.d)));
    out.push({ d, F: a.F + k * (b.F - a.F) });
  }
  return out;
}

const springIn = (C: ClickParams) => ({ l: C.l, t: C.t, Q: C.Q, w: C.w, E: C.E, sw: C.sw });

/** The eleven click fits rows, model.js lines 531 to 541. */
export function clickFits(C: ClickParams, fe: ClickCurve): FitRow[] {
  const cd = clickerDims(C, fe);
  return [
    fitRow("click spring", "slot at the end blocks", C.slotClr, mm(C.slotClr), C.slotClr >= 0.2 && C.slotClr <= 0.6, "diametral, snug so the spring stands up straight"),
    fitRow("click spring", "slot over the arch", C.slotClr + C.relief, mm(C.slotClr + C.relief), C.slotClr + C.relief >= 1.0, "diametral, the beams never touch a wall"),
    fitRow("click spring", "slot length over spring", C.endClr, mm(C.endClr), C.endClr >= 0.2, "the ribs locate it, not the slot ends"),
    fitRow("click spring", "rib in the block groove", 0.4, mm(0.4), true, "keys each end block down to the floor so the arch cannot spread"),
    fitRow("click spring", "under the bezel", 0.12, mm(0.12), true, "the bezel holds the end blocks down"),
    fitRow("click spring", "cap through bezel hole", 0.5, mm(0.5), true, "diametral"),
    fitRow("click spring", "cap flange in its well", 0.8, mm(0.8), true, "diametral"),
    fitRow("click spring", "travel to contact", cd.cg, mm(cd.cg), cd.cg > 0.6, `snap peaks at ${mm(fe.peakAtMm)}`),
    fitRow("click spring", "tip over each pad", C.tip / 2 - 0.3, mm(C.tip / 2 - 0.3), C.tip / 2 - 0.3 > 0.5, "pads split by 0.60 mm"),
    fitRow("click spring", "beam thickness", C.t, mm(C.t), C.t >= 0.4, C.t < 0.6 ? "one line, needs thin wall handling on" : ""),
    fitRow("click spring", "strain at the stop", cd.eStop * 100, `${(cd.eStop * 100).toFixed(1)} percent`, cd.eStop <= 0.025, "PETG fatigues above about 2.5", "percent"),
  ];
}

/** Tip across the pads and the pad posts, model.js lines 471 to 472. */
export function clickSwitch(C: ClickParams, s: PipStack, fe: ClickCurve, profile: ProfileLookup) {
  const { cd, floor } = clickZ(C, s, fe);
  const ctpu = profile.resistivity("ctpu", "bulk", "printed");
  const cplaZ = profile.resistivity("cpla", "through", "printed");
  const n = (v: number | readonly [number, number]): number => (typeof v === "number" ? v : v[0]);
  const across = sectionResistance(ctpu, C.tip / 2 + 0.6, cd.tipExp * C.w);
  const down = sectionResistance(ctpu, cd.tipExp, 1.3 * C.w);
  const pads = sectionResistance(cplaZ, Math.max(0.1, floor - s.z.pl[0]), Math.PI * 0.8 ** 2);
  return { rsw: n(across.ohm) + 2 * n(down.ohm), pads: 2 * n(pads.ohm), tiers: [across.tier, pads.tier] };
}

export function clickDerive(C: ClickParams, profile: ProfileLookup, machine = "ffc5p"): Record<string, DerivedValue> {
  const s = pipStack(profile, machine, { body: "petg", trace: "cpla" });
  const fe = clickCurve(springIn(C), profile);
  const { cd, top, floor } = clickZ(C, s, fe);
  const sw = clickSwitch(C, s, fe, profile);
  const out: Record<string, DerivedValue> = {
    peak: dv(fe.peakN, "N", "SNAPFE_RIGID first local maximum, two arches", []),
    dPeak: dv(fe.peakAtMm, "mm", "travel at the peak", []),
    valley: dv(fe.valleyN, "N", "least force after the peak", []),
    dValley: dv(fe.valleyAtMm, "mm", "travel at the valley", []),
    drop: dv(fe.drop, "ratio", "1 - valley / peak", []),
    cg: dv(cd.cg, "mm", "max(dPeak + click.contactPastPeak, click.contactValleyFraction dValley)", []),
    eStop: dv(cd.eStop, "ratio", "largest element strain to cg + click.stopOvertravel", []),
    vTop: dv(cd.vTop, "mm", "vb + h + t / 2 + cg + 0.45", []),
    top: dv(top, "mm", "snapUp(max(floor + 1.44, floor + vTop + flangeT), layer) unless top is set", s.tiers),
    clickFloor: dv(floor, "mm", "max(floor, layers under top - flangeT - vTop)", s.tiers),
    "R.switch": dv(sw.rsw, "ohm", "rhoT (tip / 2 + 0.6) / (tipExp w) + 2 rhoT tipExp / (1.3 w)", sw.tiers),
    "R.pads": dv(sw.pads, "ohm", "2 rhoZ max(0.1, clickFloor - pad bottom) / (pi 0.8^2)", sw.tiers),
  };
  for (const r of clickFits(C, fe)) if (r.n !== null) out[`fits.${r.name}`] = dv(r.n, r.unit ?? "mm", `${r.group}: ${r.name}`, []);
  return out;
}

/** clickElement2D, model.js lines 683 to 704: the frame and the tip in (u, v), as rings. */
export function clickElement(C: ClickParams, cd: ReturnType<typeof clickerDims>, vTop: number, hBlock: number) {
  const { h } = cd, t = C.t, l = C.l;
  const arch = (vb: number): Vec2[] => {
    const up: Vec2[] = [], dn: Vec2[] = [];
    const n = 64;
    for (let i = 0; i <= n; i++) {
      const u = -l / 2 - 0.4 + ((l + 0.8) * i) / n;
      const uu = Math.max(-l / 2, Math.min(l / 2, u));
      const v = vb + (h / 2) * (1 + Math.cos((2 * Math.PI * uu) / l));
      up.push([u, v + t / 2]); dn.push([u, v - t / 2]);
    }
    return [...dn, ...up.reverse()];
  };
  const blocks = [rect(l / 2, 0, l / 2 + C.eb, hBlock), rect(-l / 2 - C.eb, 0, -l / 2, hBlock)];
  const keyW = C.rib + 0.4, keyH = 0.8;
  const grooves = [1, -1].map((sg) => { const um = sg * (l / 2 + C.eb / 2); return rect(um - keyW / 2, -0.01, um + keyW / 2, keyH); });
  const shuttle = rect(-C.sw / 2, cd.cg + cd.tipExp, C.sw / 2, vTop);
  const y0 = cd.cg + cd.tipExp, y1 = y0 + cd.dove;
  const dove: Vec2[] = [[-0.6, y0 - 0.01], [0.6, y0 - 0.01], [0.9, y1], [-0.9, y1]];
  const tipRect = rect(-C.tip / 2, cd.cg, C.tip / 2, y0 + 0.01);
  return { positive: [...blocks, arch(cd.va), arch(cd.vb), shuttle], tip: [tipRect, dove], grooves, hMax: Math.max(hBlock, vTop) };
}

export function clickApply(input: ApplyIn<ClickParams>, id: string): ApplyOut {
  const C = input.params;
  const s = pipStack(input.profile, input.draft.machine, { body: "petg", trace: "cpla" });
  const f = frameOf(input.face, id);
  if (Math.abs(f.z - s.z.floor) > 1e-6) {
    throw commandError({ code: "E_SCHEMA", path: "/face/origin/2", got: f.z, expected: `the stack floor ${s.z.floor.toFixed(2)} mm`, hint: `place ${id} on the stack floor face, where the pads sit flush` });
  }
  const fe = clickCurve(springIn(C), input.profile);
  const { cd, need, top, floor, vTopEff, zbt, capR } = clickZ(C, s, fe);
  if (top < need - 1e-9) {
    throw commandError({ code: "E_SCHEMA", path: "/params/top", got: top, expected: `at least ${need.toFixed(2)} mm`, hint: `raise the host top to ${snapUp(need, s.layer).toFixed(2)} mm or leave top 0` });
  }
  const e = new Emit(f, s);
  const bl = s.bleed, lay = s.layer;
  const locate = locateFit(input.profile);
  // Slot snug at the blocks, relief over the arch, cap well (model.js lines 91 to 96).
  const slotW = C.w + C.slotClr, len = cd.len + C.endClr, wideW = C.w + C.slotClr + C.relief;
  e.pocket("pocket.slot", rect(-len / 2, -slotW / 2, len / 2, slotW / 2), top, top - floor, locate, C.slotClr / 2);
  e.pocket("pocket.relief", rect(-(C.l + 0.6) / 2, -wideW / 2, (C.l + 0.6) / 2, wideW / 2), top, top - floor, locate, (C.slotClr + C.relief) / 2);
  e.pocket("pocket.capWell", circle(capR, [0, 0], 64), top, C.flangeT + cd.cg + 0.6, locate, 0.4);
  // Half pads flush with the slot floor (model.js lines 98 to 103) and the routed terminals (layout.js line 378).
  const padU: Vec2 = [0.3 + bl / 2, 2.3], padV = Math.min(0.75, slotW / 2 - 0.1) - bl / 2;
  e.conductor("conductor.pad", C.net, rect(padU[0], -padV, padU[1], padV), s.z.pl[0], floor + EZ, 2 * padV);
  e.conductor("conductor.padCommon", C.common, rect(-padU[1], -padV, -padU[0], padV), s.z.pl[0], floor + EZ, 2 * padV);
  e.terminal("", C.net, [1.6, 0], C.post);
  e.terminal("Common", C.common, [-1.6, 0], C.post);
  // Ribs under the end blocks, added to the body (model.js lines 106 to 109).
  for (const [tag, sg] of [["", 1], ["Back", -1]] as const) {
    const um = sg * (C.l / 2 + C.eb / 2);
    e.body(`rib${tag}`, "petg", e.prism(rect(um - C.rib / 2, -(slotW - 0.1) / 2, um + C.rib / 2, (slotW - 0.1) / 2), floor - EZ, floor + 0.6));
  }
  // The spring element and its tip, printed flat at `loose` (model.js lines 401 to 405).
  const el = clickElement(C, cd, vTopEff, top - floor - 0.12);
  const at = (p: Vec2): Vec2 => [C.loose[0] + p[0], C.loose[1] + p[1]];
  const flat = (r: readonly Vec2[]): ShapeDecl => e.prism(r.map(at), 0, C.w);
  e.body("spring", "petg", { route: "csg", op: "difference", of: [{ route: "csg", op: "union", of: el.positive.map(flat) }, ...el.tip.map(flat), ...el.grooves.map(flat)] });
  e.body("tip", "ctpu", { route: "csg", op: "union", of: el.tip.map(flat) });
  // The cap: flange and a stepped chamfer to bezel top + protrude, flange down (model.js lines 386 to 388, 623 to 635).
  const capAt: Vec2 = [C.loose[0] + C.l / 2 + C.eb + C.cap / 2 + C.flange + 4, C.loose[1]];
  const z0 = top - C.flangeT;
  const drop = (z: number): number => z - z0;
  const capParts: ShapeDecl[] = [e.prism(circle(C.cap / 2 + C.flange, capAt, 64), drop(z0), drop(z0 + C.flangeT))];
  const c0 = z0 + C.flangeT - EZ, c1 = zbt + C.protrude, ch = 0.48;
  const steps = Math.max(0, Math.min(Math.round(ch / lay), Math.floor((c1 - c0) / lay) - 1));
  const cosHalf = Math.cos(Math.PI / 64);
  capParts.push(e.prism(circle(C.cap / 2, capAt, 64), drop(c0), drop(c1 - steps * lay + EZ)));
  for (let i = 1; i <= steps; i++) {
    // An inward offset of a regular polygon moves each edge in by d: the vertex radius falls by d / cos(pi / n).
    const r = C.cap / 2 - (ch * i) / steps / cosHalf;
    capParts.push(e.prism(circle(r, capAt, 64), drop(c1 - (steps - i + 1) * lay), drop(c1 - (steps - i) * lay + (i < steps ? EZ : 0))));
  }
  e.body("cap", "tpu95", { route: "csg", op: "union", of: capParts });

  e.feature({ kind: "spring", id: "spring.click", body: "spring", l: C.l, t: C.t, w: C.w, riseQ: C.Q, ends: "clamped", bend: "inPlane", sw: C.sw, mechanism: "click-spring-key" });
  e.feature({ kind: "port", id: "port.key", net: C.net, type: "signal", interface: "digital" });
  e.feature({ kind: "port", id: "port.common", net: C.common, type: "gnd", interface: "digital" });

  e.metric("host.top", top, "mm", "host top the key was placed under: the spring's need snapped up a layer, or the top asked for", s.tiers);
  e.metric("spring.peakN", fe.peakN, "N", `peak at ${fe.peakAtMm.toFixed(3)} mm (SNAPFE through sim)`, [], "CHK-KEY-04", "spring");
  e.metric("spring.drop", fe.drop, "ratio", "1 - valley / peak", [], "CHK-KEY-04", "spring");
  e.metric("spring.cg", cd.cg, "mm", "travel to contact, just past the snap", [], "CHK-KEY-04", "spring");
  e.metric("spring.eStop", cd.eStop, "ratio", "largest strain to the stop", [], "CHK-KEY-04", "spring");
  e.metric("spring.bistable", fe.bistable ? "yes" : "no", undefined, "a bistable spring latches the key down", [], "CHK-KEY-04", "spring");
  if (C.curveSamples > 0) {
    const stopMm = cd.cg + input.profile.constant(STOP_OVERTRAVEL).value;
    const curve = clickCurveSamples(fe, stopMm, C.curveSamples);
    e.metric("spring.curve.n", curve.length, "count", `force samples from 0 to cg + ${STOP_OVERTRAVEL} (computed, SNAPFE)`, [], "CHK-KEY-04", "spring");
    curve.forEach((p, i) => {
      e.metric(`spring.curve.d${i}`, p.d, "mm", `travel at sample ${i} (computed, SNAPFE)`, [], "CHK-KEY-04", "spring");
      e.metric(`spring.curve.F${i}`, p.F, "N", `force at sample ${i}, linear between load steps (computed, SNAPFE)`, [], "CHK-KEY-04", "spring");
    });
  }
  if (fe.bistable) e.warnings.push({ code: "SPRING", text: "click springs are bistable at this rise, keys will latch down" });
  if (!fe.snaps) e.warnings.push({ code: "SPRING", text: "click springs do not snap at this rise, raise Q above 2" });
  const sw = clickSwitch(C, s, fe, input.profile);
  e.metric("key.R.switch", sw.rsw, "ohm", "tip across the pad split (model.js line 472)", sw.tiers);
  const rows = clickFits(C, fe);
  for (const r of rows) e.metrics.push(fitMetric("key", r, []));
  e.warnings.push(...fitWarnings(rows));
  return e.out();
}
