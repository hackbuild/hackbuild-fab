// The TOGGLE presets of tilt-stick (toggle.md 5, canon tilt-stick, M06-T09;
// mechanism row flex-neck-tilt-pivot, M06-T14): solo4, solo8 and blocks8
// from originals/toggle/files/src/src/part2a.js (blankState lines 26 to 38,
// PRESETS lines 40 to 45), the solver in ./solver.ts, and the bodies of
// part2d.js lathes (lines 394 to 414) and the wall contacts of features
// (lines 283 to 292). The stick and the collar are revolves; the pads, the
// ring and the COM bridge and column are exact sectors where the original
// paints them into a 0.1 mm raster (toggle.md 5.12); the well, roof steps,
// gate and the two lathe keep-outs are pockets in the host.
//
// What the original routes (lead angles at the sector centres, the COM
// column gap, the trace layer count) is a param here; the host routes its
// own leads from each lead foot on the top trace layer.

import { z } from "zod";
import { commandError, type ApplyIn, type ApplyOut, type DerivedValue, type ProfileLookup, type SchemaLike, type Tier, type Vec2 } from "@hackbuild/spec";
import { circle, dv, frameOf, locateFit, pipStack, place, rect, type Frame } from "../pip/common.js";
import { Emit } from "../pip/emit.js";
import { physics, solveToggle, stemStress, type ToggleG, type ToggleNet, type ToggleState } from "./solver.js";

export { solveToggle, TOGGLE_INTERNALS, type ToggleG, type ToggleNet, type ToggleState } from "./solver.js";
export { contact as toggleContact, stemStress as toggleStemStress, bandPen as toggleBandPen, capTop as toggleCapTop } from "./solver.js";

/** Segments of every lathe, part2d.js line 395. */
export const TOGGLE_LATHE_SEGMENTS = 192;
/** Facets of the well wall polygon; the pads, ring and bridge follow its arcs so their faces meet the wall on one polygon. */
export const TOGGLE_WALL_SEGMENTS = 96;
/** part2a.js line 5, T.EPS: the foot disc inset top and bottom, the collar's gap off the neck, mm. */
export const TOGGLE_EPS = 0.001;
/** PIP's stem stress limit at a 20 N side push, MPa (pip model.js lines 501 to 504); TOGGLE has no row. */
export const TOGGLE_STEM_LIMIT_MPA = 15;
/**
 * The rows the TOGGLE physics needs and profile does not hold: the neck
 * modulus E (TOGGLE declares 26, profile tpu95 reads another), the cTPU
 * collar resistivity rhoT and the contact resistance rc are params with the
 * original's defaults. A number over them qualifies unknown (D-007).
 */
const NO_ROW: readonly null[] = [null];

/** Direction net names in sector order from east, counter clockwise (part2a.js line 8). */
export const TOGGLE_NAMES = { 4: ["E", "N", "W", "S"], 8: ["E", "NE", "N", "NW", "W", "SW", "S", "SE"] } as const;

/**
 * TOGGLE params, flat, at the original's blankState (part2a.js lines 26 to
 * 38). Lengths mm, angles deg, E MPa, rhoT ohm cm, rc kohm per surface,
 * vcc V. layers and comGap are what the original's router settled on for a
 * preset (part2d.js routeSearch); the presets carry the recorded values.
 */
export const toggleParams = z.object({
  /** neck diameter, mm */ neckD: z.number().positive().default(3.2),
  /** neck length, mm */ neckL: z.number().positive().default(2.4),
  /** collar diameter, mm */ collarD: z.number().positive().default(8.8),
  /** band height, mm */ bandH: z.number().positive().default(2.4),
  /** stem diameter, mm */ stemD: z.number().positive().default(6),
  /** contact tilt, deg */ tilt: z.number().positive().default(14),
  /** overtravel past contact, deg */ over: z.number().positive().default(2),
  gate: z.enum(["round", "square", "octagon"]).default("round"),
  /** cap diameter, mm */ capD: z.number().positive().default(14),
  /** cap rim, mm */ rimT: z.number().positive().default(1.2),
  top: z.enum(["dish", "dome", "flat"]).default("dish"),
  /** cap top height, mm */ topH: z.number().nonnegative().default(1.2),
  /** cap edge round, mm */ edge: z.number().nonnegative().default(1.6),
  /** dish depth, mm */ dish: z.number().nonnegative().default(0.7),
  /** cap texture; only none builds until the lathe route with a heightfield lands */
  tex: z.enum(["dots", "rings", "ribs", "knurl", "none"]).default("dots"),
  /** texture height, mm */ texH: z.number().nonnegative().default(0.3),
  base: z.enum(["solo", "blocks"]).default("solo"),
  dirs: z.union([z.literal(4), z.literal(8)]).default(4),
  outline: z.enum(["square", "round"]).default("square"),
  /** body size when auto is off, mm */ size: z.number().positive().default(18),
  auto: z.boolean().default(true),
  term: z.enum(["header", "wire", "pads"]).default("header"),
  /** wire bore, mm */ bore: z.number().positive().default(1.2),
  /** BLOCKS body studs, 0 is auto, count */ studs: z.number().int().nonnegative().default(0),
  pegs: z.enum(["both", "top", "bottom"]).default("both"),
  /** wall pad depth, mm */ padD: z.number().positive().default(0.8),
  /** layers between pads and ring, count */ split: z.number().positive().default(2),
  /** gap between sectors, mm */ gap: z.number().positive().default(0.8),
  /** zone margin past the contact line, mm */ margin: z.number().nonnegative().default(0.5),
  /** pivot as a fraction of the neck length */ pivot: z.number().positive().default(1.0),
  /** TPU modulus, MPa (TOGGLE's declared 26; profile tpu95 reads 9.2 vendor) */ E: z.number().positive().default(26),
  /** cTPU resistivity, ohm cm (TOGGLE's declared default, no profile row) */ rhoT: z.number().positive().default(1500),
  /** contact resistance per surface, kohm */ rc: z.number().nonnegative().default(5),
  /** logic rail, V */ vcc: z.number().positive().default(3.3),
  /** print clearance at rest, mm */ minGap: z.number().positive().default(0.4),
  /** trace layers the router used, count */ layers: z.union([z.literal(1), z.literal(2)]).default(1),
  /** sector gap index holding the COM column (gap k sits at (k + 0.5) 360 / dirs deg) */ comGap: z.number().int().nonnegative().default(2),
  common: z.string().min(1).default("COM"),
}).strict();
export type ToggleParams = z.infer<typeof toggleParams>;
export const TOGGLE_PARAMS = toggleParams as unknown as SchemaLike<unknown, ToggleParams>;
export const TOGGLE_DEFAULTS: ToggleParams = toggleParams.parse({});

/**
 * The presets the parent wires (part2a.js PRESETS lines 40 to 45, patches
 * over blankState), with the router's results the original recorded for
 * each: trace layers (part2d.js routeAll) and the COM column gap (solo4 at
 * 225 deg, solo8 and blocks8 at 247.5 deg; test/legacy/toggle.json).
 */
export const TOGGLE_PRESETS = {
  solo4: {},
  solo8: { dirs: 8, comGap: 5 },
  blocks8: { base: "blocks", dirs: 8, layers: 2, comGap: 5 },
} as const satisfies Readonly<Record<string, Partial<ToggleParams>>>;
export type TogglePreset = keyof typeof TOGGLE_PRESETS;
export const togglePreset = (key: TogglePreset, over: Partial<ToggleParams> = {}): ToggleParams => toggleParams.parse({ ...TOGGLE_PRESETS[key], ...over });

/** The machine layer the TOGGLE stack is built on (the preset's layer height). */
function layerOf(profile: ProfileLookup, machine: string): number {
  return pipStack(profile, machine, { body: "petg", trace: "cpla" }).layer;
}

/** The cPLA row the TOGGLE preset reads: Protopasta printed along, ohm cm (part2a.js line 22 declares 30). */
export function toggleRhoP(profile: ProfileLookup): { ohmCm: number; tier: Tier } {
  const row = profile.resistivity("cpla-protopasta", "along", "printed");
  const v = typeof row.ohmCm === "number" ? row.ohmCm : row.ohmCm[0];
  return { ohmCm: v, tier: row.provenance.tier };
}

export function toggleSolve(P: ToggleParams, L: number): ToggleG {
  return solveToggle(P as ToggleState, L);
}

/** Readouts and switch resistance for routed nets (part2b.js physics); the E12 pull up rule gives 470k at solo4. */
export function togglePhysics(P: ToggleParams, G: ToggleG, profile: ProfileLookup, nets: readonly ToggleNet[]) {
  return physics(G, P as ToggleState, toggleRhoP(profile).ohmCm, nets);
}

export function toggleDerive(P: ToggleParams, profile: ProfileLookup, machine = "ffc5p"): Record<string, DerivedValue> {
  const L = layerOf(profile, machine);
  const G = toggleSolve(P, L);
  const rp = toggleRhoP(profile);
  const ph = physics(G, P as ToggleState, rp.ohmCm, []);
  const st = stemStress(G);
  return {
    Rw: dv(G.Rw, "mm", "r0 cos(alpha) + (dz0 + riser) sin(alpha)", []),
    zf: dv(G.zf, "mm", "floor stack: skin 2L, trace layers 3L each, sep 2L, lip 3L", []),
    zT: dv(G.zT, "mm", "roof top plus the 3 layer lip", []),
    ztop: dv(G.ztop, "mm", "cap top plus texture height", []),
    gateD: dv(2 * G.rh, "mm", "smallest gate whose stem stop is at or past tilt + over", []),
    thContact: dv(G.thContact, "deg", "first band hit, wall included", []),
    thStop: dv(G.thStop, "deg", "first stem or cap hit, wall ignored", []),
    restBand: dv(G.restBand, "mm", "Rw - r0", []),
    squeeze: dv(G.squeeze, "mm", "band reach past the wall at the stop", []),
    k: dv(ph.k, "N mm/rad", "E pi rn^4 / 4 / neckL", NO_ROW),
    Fc: dv(ph.Fc, "N", "k alpha / lever", NO_ROW),
    Fs: dv(ph.Fs, "N", "k thStop / lever", NO_ROW),
    strain: dv(ph.strain, "ratio", "rn thStop / neckL", []),
    rCollar: dv(ph.rCollar, "ohm", "rhoT pathL / (max(0.5, patch) 0.8)", NO_ROW),
    ring: dv(ph.ring, "ohm", "rhoP pi Rw / ((zA1 - zA0) pd) / 2", [rp.tier]),
    stemStress: dv(st.sigmaMPa, "MPa", "20 (ztop - zb1) / (pi (2 rn)^3 / 32)", []),
  };
}

/** The point where the ray at angle a leaves a closed ring around the origin. */
function rayHit(ring: readonly Vec2[], a: number): Vec2 {
  const dx = Math.cos(a), dy = Math.sin(a);
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i] as Vec2, q = ring[(i + 1) % ring.length] as Vec2;
    const ex = q[0] - p[0], ey = q[1] - p[1];
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-15) continue;
    const t = (p[0] * ey - p[1] * ex) / den;
    const u = (p[0] * dy - p[1] * dx) / den;
    if (t > 0 && u >= -1e-12 && u <= 1 + 1e-12) return [t * dx, t * dy];
  }
  throw new Error("ray misses the ring");
}

/** The polygon of radius r from angle a0 to a1 counter clockwise: the two ray hits and the vertices between. */
function polyArc(r: number, a0: number, a1: number): Vec2[] {
  const ring = circle(r, [0, 0], TOGGLE_WALL_SEGMENTS);
  const span = a1 - a0;
  const norm = (a: number): number => { const t = (a - a0) % (2 * Math.PI); return t < 0 ? t + 2 * Math.PI : t; };
  const mid = ring.filter((p) => { const t = norm(Math.atan2(p[1], p[0])); return t > 1e-9 && t < span - 1e-9; }).sort((p, q) => norm(Math.atan2(p[1], p[0])) - norm(Math.atan2(q[1], q[0])));
  return [rayHit(ring, a0), ...mid, rayHit(ring, a1)];
}

/** An annular sector between the wall polygons of r0 and r1, a0 to a1 rad, counter clockwise. */
function wallSector(r0: number, r1: number, a0: number, a1: number): Vec2[] {
  return [...polyArc(r1, a0, a1), ...polyArc(r0, a0, a1).reverse()];
}

/** The lip hole, part2a.js inGate: round, square (inscribed half width r) or octagon (inscribed r). */
function gateRing(gate: ToggleParams["gate"], r: number): Vec2[] {
  if (gate === "square") return rect(-r, -r, r, r);
  if (gate === "octagon") {
    const R = r / Math.cos(Math.PI / 8);
    return Array.from({ length: 8 }, (_, i): Vec2 => [R * Math.cos((2 * i + 1) * Math.PI / 8), R * Math.sin((2 * i + 1) * Math.PI / 8)]);
  }
  return circle(r, [0, 0], TOGGLE_WALL_SEGMENTS);
}

/** The TPU lathe profile, part2d.js lines 397 to 405 (texture flags dropped: the revolve route has no heightfield). */
export function toggleStickProfile(G: ToggleG): Vec2[] {
  const e = TOGGLE_EPS, tt = G.topTrace;
  const zf0 = tt.z0 + e, zf1 = tt.z1 - e;
  const tpu: Vec2[] = [[0, zf0], [G.rf, zf0], [G.rf, zf1], [G.rn, zf1], [G.rn, G.zci]];
  if (G.rs > G.rn + 1e-6) tpu.push([G.rs, G.zci]);
  if (G.zcb > G.zci + 1e-6) tpu.push([G.rs, G.zcb]);
  tpu.push([G.Rd, G.zcb + (G.Rd - G.rs)]);
  tpu.push([G.Rd, G.zrim]);
  const top = G.capTop.pts;
  for (let k = 1; k < top.length; k++) tpu.push([(top[k] as [number, number, boolean])[0], (top[k] as [number, number, boolean])[1]]);
  return dedupe(tpu);
}

/** The cTPU collar profile, part2d.js lines 407 to 411. */
export function toggleCollarProfile(G: ToggleG): Vec2[] {
  const e = TOGGLE_EPS;
  const col: Vec2[] = [[G.rn + e, G.zn1]];
  if (G.riser > 1e-6) col.push([G.r0, G.zn1 + (G.r0 - G.rn) - e]);
  col.push([G.r0, G.zb0], [G.r1, G.zb1]);
  if (G.r1 - G.rs > 2 * e) col.push([G.rs + e, G.zci - e]);
  if (G.rs - G.rn > 2 * e || !(G.r1 - G.rs > 2 * e)) col.push([G.rn + e, G.zci - e]);
  return dedupe(col);
}

/** part2a.js lathe, lines 110 to 117: repeated points and a closing duplicate are dropped. */
function dedupe(profile: readonly Vec2[]): Vec2[] {
  const clean: Vec2[] = [];
  for (const p of profile) {
    const q = clean[clean.length - 1];
    if (q && Math.abs(q[0] - p[0]) < 1e-6 && Math.abs(q[1] - p[1]) < 1e-6) continue;
    clean.push(p);
  }
  while (clean.length > 2 && Math.abs((clean[0] as Vec2)[0] - (clean[clean.length - 1] as Vec2)[0]) < 1e-6 && Math.abs((clean[0] as Vec2)[1] - (clean[clean.length - 1] as Vec2)[1]) < 1e-6) clean.pop();
  return clean;
}

/** Where a direction's lead sector meets the top trace layer, local (u, v), for the host's lead. */
export function toggleLeadFoot(G: ToggleG, k: number): Vec2 {
  const a = (G.sectors[k] as { c: number }).c;
  return [G.Re * Math.cos(a), G.Re * Math.sin(a)];
}

export function toggleApply(input: ApplyIn<ToggleParams>, id: string): ApplyOut {
  const P = input.params;
  const f: Frame = frameOf(input.face, id);
  if (Math.abs(f.z) > 1e-9) {
    throw commandError({ code: "E_SCHEMA", path: "/face/origin/2", got: f.z, expected: "0, the bed", hint: `place ${id} on the bed face: the TOGGLE floor stack is measured from the bed` });
  }
  const s = pipStack(input.profile, input.draft.machine, { body: "petg", trace: "cpla" });
  const G = toggleSolve(P, s.layer);
  const e = new Emit(f, s);
  const L = G.L, tt = G.topTrace, fit = locateFit(input.profile);
  const names = TOGGLE_NAMES[G.dirs];

  // The stick and the collar (part2d.js lathes), 192 segments each.
  e.body("stick", "tpu95", e.revolve(toggleStickProfile(G), TOGGLE_LATHE_SEGMENTS));
  e.body("collar", "ctpu", e.revolve(toggleCollarProfile(G), TOGGLE_LATHE_SEGMENTS));
  if (P.tex !== "none") e.warnings.push({ code: "TEXTURE", text: `cap texture ${P.tex} is not built: the lathe route with a heightfield has not landed; the cap prints smooth, ${P.texH} mm under the solved top` });

  // Wall contacts (part2d.js lines 283 to 292): a lead sector from the top trace layer to the pad zone, then the pad.
  G.sectors.forEach((sec, k) => {
    const net = names[k] as string, hw = 0.5 / G.Re;
    e.conductor(`conductor.lead${k}`, net, wallSector(G.Rw, G.Rw + G.pd, sec.c - hw, sec.c + hw), tt.z0, G.zB0, 1.0);
    e.conductor(`conductor.pad${k}`, net, wallSector(G.Rw, G.Rw + G.pd, sec.a0, sec.a1), G.zB0, G.zB1, G.pd);
    e.feature({ kind: "port", id: `port.dir${k}`, net, type: "signal", interface: "digital" });
  });
  // The common ring and the COM bridge as one cPLA body (a conductor region is one ring with no
  // hole). The original paints ring, bridge (Rw + pd - 0.3 to RA + 0.5) and column into one raster
  // (part2d.js lines 286 to 288); here the bridge stops at the column's inner face, RA - 0.5, so
  // the union of the three is the original's while no two bodies share a side plane: the bridge
  // and column on one ray, as two bodies, leave edges touching after the stage 6 inset and the
  // stage 8 union refuses them (computed, M06-T09 build). The body joins COM through the column.
  const wall = circle(G.Rw, [0, 0], TOGGLE_WALL_SEGMENTS), outer = circle(G.Rw + G.pd, [0, 0], TOGGLE_WALL_SEGMENTS);
  const phiA = (P.comGap + 0.5) * 2 * Math.PI / G.dirs, ha = 0.5 / G.RA;
  e.body("ring", "cpla", { route: "csg", op: "union", of: [
    { route: "prism", outline: [place(f, outer), place(f, [...wall].reverse())], z: [G.zA0, G.zA1] },
    e.prism(wallSector(G.Rw + G.pd - 0.3, G.RA - 0.5, phiA - ha, phiA + ha), G.zA0, G.zA1),
  ] });
  e.conductor("conductor.column", P.common, wallSector(G.RA - 0.5, G.RA + 0.5, phiA - ha, phiA + ha), tt.z0, G.zA1, 1.0);
  e.feature({ kind: "port", id: "port.common", net: P.common, type: "gnd", interface: "digital" });

  // Well, roof steps, gate through the roof and lip, and the lathe keep-outs (part2d.js lines 275 to 281).
  e.pocket("pocket.well", wall, G.zr0, G.zr0 - G.zf, fit, G.restBand);
  // A roof step inside the gate cuts nothing (part2b.js occ: air where r < rd or in the gate), so
  // only the steps wider than the gate are declared; a redundant one reads as a 0.2 mm wall to CHK-PRT-04.
  for (let k = 0; k < G.K; k++) {
    const rd = G.Rw - (k + 1) * L;
    if (rd > G.rh) e.pocket(`pocket.roof${k}`, circle(rd, [0, 0], TOGGLE_WALL_SEGMENTS), G.zr0 + (k + 1) * L, L, fit, G.restBand);
  }
  e.pocket("pocket.gate", gateRing(G.gate, G.rh), G.zT, G.zT - G.zr0, fit, G.rh - G.rs);
  e.pocket("pocket.foot", circle(G.rf + G.cons, [0, 0], TOGGLE_WALL_SEGMENTS), tt.z1, tt.z1 - tt.z0, fit, G.cons);
  e.pocket("pocket.neck", circle(G.rn + G.cons, [0, 0], TOGGLE_WALL_SEGMENTS), G.zf, G.zf - tt.z1, fit, G.cons);

  const rp = toggleRhoP(input.profile);
  const ph = physics(G, P as ToggleState, rp.ohmCm, []);
  const st = stemStress(G);
  e.metric("host.top", G.zT, "mm", "body top the stick was solved under: roof top plus the 3 layer lip", []);
  e.metric("host.size", G.size, "mm", "body outline the original sizes for this preset (part2d.js layoutXY)", []);
  e.metric("stick.zf", G.zf, "mm", "floor stack top, where the neck starts", []);
  e.metric("stick.topTrace", tt.z0, "mm", "bottom of the top trace layer, where each lead foot lands", []);
  e.metric("stick.Rw", G.Rw, "mm", "well radius", []);
  e.metric("stick.gateD", 2 * G.rh, "mm", "lip hole solved so the stem stops at tilt plus overtravel", []);
  e.metric("stick.thContact", G.thContact, "deg", `band meets the wall, set ${G.alpha}`, []);
  e.metric("stick.thStop", G.thStop, "deg", `stem meets the lip, target ${G.thS}`, []);
  e.metric("stick.restBand", G.restBand, "mm", "band to wall at rest", []);
  e.metric("stick.squeeze", G.squeeze, "mm", "band reach past the wall at the stop", []);
  e.metric("stick.Fc", ph.Fc, "N", "force at contact, over TOGGLE's declared modulus E", NO_ROW);
  e.metric("stick.Fs", ph.Fs, "N", "force at the stop, over TOGGLE's declared modulus E", NO_ROW);
  e.metric("stick.strain", ph.strain, "ratio", "neck strain at the stop", []);
  e.metric("stick.rCollar", ph.rCollar, "ohm", "collar path, TOGGLE's declared cTPU resistivity", NO_ROW);
  e.metric("stick.ring", ph.ring, "ohm", "common ring, Protopasta printed along from profile", [rp.tier]);
  e.metric("stick.stemStress", st.sigmaMPa, "MPa", `20 N side push at the cap top on the ${2 * G.rn} mm neck core, lever ${st.leverMm.toFixed(2)} mm; limit ${TOGGLE_STEM_LIMIT_MPA} as PIP prices its stem`, [], "informational", "fits");
  if (st.sigmaMPa >= TOGGLE_STEM_LIMIT_MPA) e.warnings.push({ code: "FIT", text: `stick: stem stress at a 20 N side push is ${st.sigmaMPa.toFixed(1)} MPa, limit ${TOGGLE_STEM_LIMIT_MPA}; thicken the neck or move to a full stem with a collar as PIP does` });
  for (const w of G.warn) e.warnings.push({ code: "TOGGLE", text: w });
  return e.out();
}

