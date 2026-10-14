// The PIP flex cone key (pip.md 5.1, canon flex-cone-key), ported from
// originals/pip/files/haft-src/src/layout.js flexDims (lines 149 to 160),
// the flex terminals (line 374), the body need and key floor (lines 222
// to 231), and model.js lines 63 to 88 (the flex branch), 468 to 469
// (its switch resistance) and 523 to 528 (its fits rows). The keys
// flex-pair reference ports the same lines (D-223); both read the same
// defaults (layout.js line 35).
//
// The archetype sits on the stack floor face: z of the face is the floor
// (pads flush), x and y the key centre, u the direction of the split's
// normal (PIP draws the split across x). The host top is `top` when set,
// else the key's own need snapped up a layer, as layout.js line 228 does
// for a body holding only this key.

import { z } from "zod";
import { commandError, type ApplyIn, type ApplyOut, type DerivedValue, type ProfileLookup, type SchemaLike, type Vec2 } from "@hackbuild/spec";
import { sectionResistance } from "@hackbuild/profile";
import {
  EZ, circle, locateFit, clipRect, dv, fitMetric, fitRow, fitWarnings, frameOf, mm, pipStack, rect, snapN, snapUp,
  type FitRow, type PipStack,
} from "./common.js";
import { Emit } from "./emit.js";

const deg = Math.PI / 180;

/** Flex key params, PIP defaults (layout.js line 35; route.post line 28; stack.bezel line 27). */
export const flexParams = z.object({
  /** Key face diameter, mm. */
  face: z.number().positive().default(10),
  /** Cone height Hs, mm. */
  Hs: z.number().positive().default(4.0),
  /** Cone half angle from vertical, deg. */
  alpha: z.number().positive().lt(90).default(40),
  /** Cone wall thickness normal to the wall, mm. */
  wall: z.number().positive().default(0.6),
  /** Hole at the cone top the cap bridges, mm. */
  hole: z.number().positive().default(3.6),
  /** cTPU cap thickness, mm. */
  cap: z.number().positive().default(0.72),
  /** Face disc thickness, mm. */
  faceT: z.number().positive().default(1.2),
  /** Face height above the bezel top, mm. */
  protrude: z.number().nonnegative().default(2.6),
  /** Contact gap as a percentage of the cone height, percent. */
  gapPct: z.number().positive().default(45),
  /** Split between the column halves, mm. */
  colGap: z.number().positive().default(0.8),
  /** Bezel thickness the face stands proud of, mm (stack.bezel). */
  bezel: z.number().nonnegative().default(2.4),
  /** Terminal post radius, mm (route.post). */
  post: z.number().positive().default(0.6),
  /** Host top, mm from the bed; 0 places the top at this key's own need. */
  top: z.number().nonnegative().default(0),
  /** The key's net. */
  net: z.string().min(1).default("KEY"),
  /** The common net, the other column half. */
  common: z.string().min(1).default("GND"),
  /** Least contact force the contact declares, N (declared, as keys/flex-pair; no coupon). */
  forceMinN: z.number().positive().default(0.5),
  /** Largest closed-contact resistance the contact declares, ohm (declared, as keys/flex-pair; no coupon). */
  maxOhm: z.number().positive().default(2e6),
}).strict();
export type FlexParams = z.infer<typeof flexParams>;
export const FLEX_PARAMS = flexParams as unknown as SchemaLike<unknown, FlexParams>;
export const FLEX_DEFAULTS: FlexParams = flexParams.parse({});

/** flexDims, layout.js lines 149 to 160. */
export function flexDims(F: FlexParams) {
  const a = F.alpha * deg;
  const wallH = F.wall / Math.sin((90 - F.alpha) * deg);
  const rh = F.hole / 2, rnt = rh + wallH;
  const rsb = rnt + F.Hs * Math.tan(a);
  const gap = Math.max(1.2, (F.gapPct / 100) * F.Hs);
  const rFace = F.face / 2;
  const flare = Math.max(0, rFace - rnt);
  const keyH = F.Hs + F.cap + 0.24 + flare + F.faceT;
  const colR = Math.max(0.9, rh - 0.2);
  return { a, wallH, rh, rnt, rsb, gap, rFace, flare, keyH, colR, wellR: rsb + 0.6 };
}

/** Where the key sits in z on this stack: host top, key floor, column top (layout.js lines 222 to 231). */
export function flexZ(F: FlexParams, s: PipStack) {
  const fd = flexDims(F);
  const need = Math.max(s.z.floor + 1.44, s.z.floor + fd.keyH - F.protrude - F.bezel);
  const top = F.top > 0 ? F.top : snapUp(need, s.layer);
  const zf = snapN(Math.max(s.z.floor, top + F.bezel + F.protrude - fd.keyH), s.layer);
  return { fd, need, top, zf, colTop: zf + F.Hs - fd.gap, off: fd.colR + 0.55 + F.post };
}

/** The six flex fits rows, model.js lines 523 to 528; floors from profile where it holds them. */
export function flexFits(F: FlexParams, profile: ProfileLookup): FitRow[] {
  const fd = flexDims(F);
  const gapFloor = profile.constant("key.flexGapFloor").value;
  const bridgeMax = profile.constant("key.capBridgeMax").value;
  const splitMin = profile.constant("key.splitMin").value;
  const wallGap = fd.rh + fd.gap * Math.tan(fd.a) - fd.colR;
  const bezR = fd.rFace + 0.5;
  return [
    fitRow("flex key", "contact gap", fd.gap, mm(fd.gap), fd.gap >= gapFloor, `${((100 * fd.gap) / F.Hs).toFixed(0)} percent of the cone`),
    fitRow("flex key", "cap bridge", F.hole, mm(F.hole), F.hole <= bridgeMax, "conductive TPU spanning the hole, unsupported"),
    fitRow("flex key", "split between halves", F.colGap, mm(F.colGap), F.colGap >= splitMin, "exposed, a string across it reads as a press"),
    fitRow("flex key", "column to cone wall", wallGap, mm(wallGap), wallGap > 0.5, "at the top of the column"),
    fitRow("flex key", "face through bezel hole", 2 * (bezR - fd.rFace), mm(2 * (bezR - fd.rFace)), true, "diametral, the bezel drops over the key"),
    fitRow("flex key", "stands proud of the bezel", F.protrude, mm(F.protrude), F.protrude >= 0.8, ""),
  ];
}

/** The switch path of a pressed flex key, model.js lines 468 to 469, through profile sectionResistance. */
export function flexSwitch(F: FlexParams, s: PipStack, profile: ProfileLookup) {
  const { fd, zf } = flexZ(F, s);
  const ctpu = profile.resistivity("ctpu", "bulk", "printed");
  const cplaZ = profile.resistivity("cpla", "through", "printed");
  const span = sectionResistance(ctpu, F.colGap + fd.colR, F.cap * fd.colR * 2);
  const through = sectionResistance(ctpu, F.cap, (Math.PI * fd.colR ** 2) / 2);
  const colTop = zf + F.Hs - fd.gap;
  const column = sectionResistance(cplaZ, colTop - s.z.floor, Math.PI * (fd.colR * 0.7) ** 2);
  const n = (v: number | readonly [number, number]): number => (typeof v === "number" ? v : v[0]);
  return {
    rsw: n(span.ohm) + 2 * n(through.ohm),
    column: 2 * n(column.ohm),
    tiers: [span.tier, through.tier, column.tier],
  };
}

export function flexDerive(F: FlexParams, profile: ProfileLookup, machine = "ffc5p"): Record<string, DerivedValue> {
  const s = pipStack(profile, machine, { body: "petg", trace: "cpla" });
  const { fd, top, zf, colTop } = flexZ(F, s);
  const sw = flexSwitch(F, s, profile);
  const out: Record<string, DerivedValue> = {
    wallH: dv(fd.wallH, "mm", "wall / sin(90 - alpha)", []),
    rsb: dv(fd.rsb, "mm", "hole / 2 + wallH + Hs tan(alpha)", []),
    gap: dv(fd.gap, "mm", "max(1.2, gapPct / 100 x Hs)", []),
    keyH: dv(fd.keyH, "mm", "Hs + cap + 0.24 + max(0, face / 2 - rnt) + faceT", []),
    colR: dv(fd.colR, "mm", "max(0.9, hole / 2 - 0.2)", []),
    wellR: dv(fd.wellR, "mm", "rsb + 0.6", []),
    top: dv(top, "mm", "snapUp(max(floor + 1.44, floor + keyH - protrude - bezel), layer) unless top is set", s.tiers),
    floor: dv(zf, "mm", "snapN(max(floor, top + bezel + protrude - keyH), layer)", s.tiers),
    colTop: dv(colTop, "mm", "key floor + Hs - gap", s.tiers),
    "R.switch": dv(sw.rsw, "ohm", "rhoT (colGap + colR) / (cap 2 colR) + 2 rhoT cap / (pi colR^2 / 2)", sw.tiers),
    "R.column": dv(sw.column, "ohm", "2 rhoZ (colTop - floor) / (pi (0.7 colR)^2)", sw.tiers),
  };
  for (const r of flexFits(F, profile)) if (r.n !== null) out[`fits.${r.name}`] = dv(r.n, r.unit ?? "mm", `${r.group}: ${r.name}`, []);
  return out;
}

export function flexApply(input: ApplyIn<FlexParams>, id: string): ApplyOut {
  const F = input.params;
  const s = pipStack(input.profile, input.draft.machine, { body: "petg", trace: "cpla" });
  const f = frameOf(input.face, id);
  if (Math.abs(f.z - s.z.floor) > 1e-6) {
    throw commandError({ code: "E_SCHEMA", path: "/face/origin/2", got: f.z, expected: `the stack floor ${s.z.floor.toFixed(2)} mm`, hint: `place ${id} on the stack floor face, where the pads sit flush` });
  }
  const { fd, need, top, zf, colTop, off } = flexZ(F, s);
  if (top < need - 1e-9) {
    throw commandError({ code: "E_SCHEMA", path: "/params/top", got: top, expected: `at least ${need.toFixed(2)} mm`, hint: `raise the host top to ${snapUp(need, s.layer).toFixed(2)} mm or leave top 0 for the key's own need` });
  }
  const e = new Emit(f, s);
  const lay = s.layer;
  const zl = s.z;
  const o: Vec2 = [0, 0];

  // Split column halves, the stubs to the terminals, the terminal posts and their layer discs (model.js lines 63 to 70, 41, 50).
  const cg2 = (F.colGap + s.bleed) / 2;
  const col = circle(fd.colR, o, 40);
  e.conductor("conductor.col", F.net, clipRect(col, cg2, -5, 5, 5), zl.pl[0], colTop, fd.colR - cg2);
  e.conductor("conductor.colCommon", F.common, clipRect(col, -5, -5, -cg2, 5), zl.pl[0], colTop, fd.colR - cg2);
  e.conductor("conductor.stub", F.net, rect(cg2 + 0.3, -0.6, off, 0.6), zl.pl[0], zl.floor + EZ, 1.2);
  e.conductor("conductor.stubCommon", F.common, rect(-off, -0.6, -cg2 - 0.3, 0.6), zl.pl[0], zl.floor + EZ, 1.2);
  e.terminal("", F.net, [off, 0], F.post);
  e.terminal("Common", F.common, [-off, 0], F.post);
  if (fd.colR + 0.6 > fd.rh + fd.gap * Math.tan(fd.a)) e.warnings.push({ code: "COLUMN_WALL", text: `${id}: contact column nearly touches the cone wall` });

  // TPU cone with its buried foot ring, the cTPU cap, the key top (model.js lines 73 to 86).
  const rIn = fd.rsb - fd.wallH;
  const zc0 = zf + F.Hs, zc1 = zc0 + F.cap;
  const kt = (zc0 + EZ - zf) / F.Hs;
  const zIn = zf + (EZ * F.Hs) / Math.max(0.1, rIn - fd.rh);
  e.body("cone", "tpu95", e.revolve([
    [rIn - EZ, zl.floor - lay], [fd.rsb, zl.floor - lay], [fd.rsb, zf + EZ], [fd.rsb + (fd.rnt - fd.rsb) * kt, zc0 + EZ],
    [rIn + (fd.rh - rIn) * kt, zc0 + EZ], [rIn - EZ, zIn],
  ], 64));
  e.body("cap", "ctpu", e.prism(circle(fd.rnt + 0.3, o, 64), zc0, zc1));
  const zA = zc1 + lay;
  e.body("top", "tpu95", e.revolve([
    [0, zc1 - EZ], [fd.rnt, zc1 - EZ], [fd.rnt, zA], [fd.rFace, zA + fd.flare], [fd.rFace, zf + fd.keyH], [0, zf + fd.keyH],
  ], 64));

  // The well and, when the key floor rises, the bore under the cone (model.js lines 82 and 87).
  const locate = locateFit(input.profile);
  e.pocket("pocket.well", circle(fd.wellR, o, 64), top, top - zf, locate, fd.wellR - fd.rsb);
  if (zf > zl.floor + 1e-6) e.pocket("pocket.under", circle(rIn, o, 64), zf + EZ, zf + EZ - zl.floor, locate, 0);

  e.feature({ kind: "contact", id: "contact.key", a: "conductor.col", b: "conductor.colCommon", forceMinN: F.forceMinN, maxOhm: F.maxOhm, gap: fd.gap, coneH: F.Hs, actuator: "cap", axis: [0, 0, -1] });
  e.feature({ kind: "port", id: "port.key", net: F.net, type: "signal", interface: "digital" });
  e.feature({ kind: "port", id: "port.common", net: F.common, type: "gnd", interface: "digital" });

  const tiers = s.tiers;
  e.metric("host.top", top, "mm", "host top the key was placed under: the key's need snapped up a layer, or the top asked for", tiers);
  e.metric("key.travel", fd.gap, "mm", `${Math.round((100 * fd.gap) / F.Hs)} percent of the cone`, [], "CHK-KEY-01", "keys");
  e.metric("key.height", fd.keyH, "mm", "cone, cap, collar, flare and face", []);
  e.metric("key.rsb", fd.rsb, "mm", "cone base radius", []);
  e.metric("key.wallH", fd.wallH, "mm", "horizontal thickness of the cone wall", []);
  const feel = fd.wallH / F.Hs;
  e.metric("key.feel", feel, undefined, `${feel < 0.16 ? "soft" : feel < 0.24 ? "medium" : "stiff"}: wall across over cone height, soft under 0.16, medium under 0.24 (PIP bench/part3.js line 431)`, []);
  const sw = flexSwitch(F, s, input.profile);
  e.metric("key.R.switch", sw.rsw, "ohm", "cap across the split and through to both halves (model.js line 469)", sw.tiers);
  const rows = flexFits(F, input.profile);
  for (const r of rows) e.metrics.push(fitMetric("key", r, []));
  e.warnings.push(...fitWarnings(rows));
  return e.out();
}
