// The printed rotary pot (tang-r6.md 4.4, canon printed-rotary-pot), ported
// from originals/tang-r6/files/src/04_design.js lines 194 to 231 (one pot's
// tracks on face layer L1), 369 to 374 (its stop block) and 413 to 420 (L1
// split for the arc ends), and 05_design.js D.buildRotor (lines 97 to 121);
// readouts from 04_design.js line 443,
// 05_design.js lines 258 to 274 (rotor checks) and 299 to 301 (leaf force).
// Defaults are the pots row, 03_design.js line 22; the face stack is
// D.faceStack (04_design.js lines 47 to 51) on the machine layer.
//
// The archetype sits on the face underside, the face the rotor rides, with
// its outward normal: L1 lies from the surface 3 layers into the face, the
// arc ends' lower half (2 layers) on the surface and the bus pads behind
// them, the stop block standing out of the face. Seen from outside, the
// underside reads mirrored, so local (u, v) is the original's (x, -y) about
// the pot centre, and the face prints pad side down as the original prints
// it (05_design.js line 158). The rotor prints flat, bumps up (line 165),
// on the bed a face thickness below the face where rotorAt puts it. The
// knurled cap (D.buildCap, lines 122 to 135) is TANG's knob, outside the
// canon row, and is not ported: its knurl is twelve Clipper differences
// whose micron-rounded crossings this port does not reproduce (0.0145 mm3
// off, computed).
//
// Where the original diffs a stub against the arc in Clipper, the
// declaration overlaps them and the mesh kernel's role priority (conductive
// TPU over conductive PLA) partitions the overlap the same way.

import { z } from "zod";
import { commandError, type ApplyIn, type ApplyOut, type DerivedValue, type ProfileLookup, type SchemaLike, type ShapeDecl, type Vec2 } from "@hackbuild/spec";
import { sectionResistance } from "@hackbuild/profile";
import { dv, frameOf, type Frame } from "../pip/common.js";
import { TangEmit, arcBand, circle, modulusOf, rect, rectC, rotate, strokeSquare, tangSnap, unionRings } from "./common.js";

const vec2 = z.tuple([z.number(), z.number()]);

/** Pot params, TANG R6 defaults (03_design.js line 22), mm and deg. */
export const potParams = z.object({
  /** Resistive arc radius, width, sweep (deg). */
  arcR: z.number().positive().default(6.5),
  arcW: z.number().positive().default(1.0),
  sweep: z.number().positive().max(359).default(300),
  /** Collector ring radius, width, sweep (deg). */
  colR: z.number().positive().default(9.5),
  colW: z.number().positive().default(2.0),
  colSweep: z.number().positive().max(359).default(270),
  /** Arc material: conductive TPU or conductive PLA (arcMat). */
  arcMat: z.enum(["ctpu", "cpla"]).default("ctpu"),
  /** D shaft diameter and flat, mm. */
  shaftD: z.number().positive().default(6.0),
  flat: z.number().nonnegative().default(0.5),
  /** Hub, core square, arm width, arm thickness, hub height, bump height, bump width, mm. */
  hubD: z.number().positive().default(9),
  coreD: z.number().positive().default(4),
  armW: z.number().positive().default(3.6),
  armT: z.number().positive().default(1.68),
  hubH: z.number().positive().default(1.44),
  bumpH: z.number().positive().default(1.92),
  bumpD: z.number().positive().default(2.2),
  /** Signal arm tip radius and balance arm radius, mm. */
  tipR: z.number().positive().default(12.5),
  balR: z.number().positive().default(11.0),
  /** Shaft length past the face (the cap's bore depth, bore), stop block depth, mm. */
  bore: z.number().positive().default(8),
  stopH: z.number().positive().default(2.4),
  /** Trace width of the end stubs and wiper lead (el.traceW, 03_design.js line 26), mm. */
  traceW: z.number().positive().default(1.0),
  /**
   * The 3V3 and GND buses the end stubs run to, as offsets along v from the
   * pot centre: the original's buses at y -45 and -48.5 (04_design.js line
   * 191) under pots at y -33, mirrored. mm.
   */
  v33Bus: z.number().default(12),
  gndBus: z.number().default(15.5),
  /** Where the rotor stands on the bed, local (u, v); absent leaves it out. mm. */
  rotorAt: vec2.optional(),
  wiper: z.string().min(1).default("PW1"),
  v33: z.string().min(1).default("3V3"),
  gnd: z.string().min(1).default("GND"),
}).strict();
export type PotParams = z.infer<typeof potParams>;
export const POT_PARAMS = potParams as unknown as SchemaLike<unknown, PotParams>;
export const POT_DEFAULTS: PotParams = potParams.parse({});

const rad = (d: number): number => (d * Math.PI) / 180;
/** The arc gap is centred south, toward the wall (04_design.js line 198), deg. */
const GAP_A = 270;
/** The end stubs start this far inside the arc's inner edge (line 207), mm. */
const STUB_IN = 0.3;
/** The wiper lead runs this far past the collector (line 226), mm. */
const LEAD_PAST = 3;

/** D.faceStack, 04_design.js lines 47 to 51: L1 3, sep 2, L2 3, sep2 2, pad 3 layers. */
export const tangFaceStack = (layer: number) => ({ l1: 3 * layer, lower: 2 * layer, t: 13 * layer });

/**
 * One pot's L1 regions, stop block and rotor in the original's frame
 * about the pot centre (y south negative), every vertex on the micron grid.
 */
export function potGeometry(P: PotParams, layer: number) {
  const a0 = GAP_A + (360 - P.sweep) / 2, a1 = a0 + P.sweep;
  const c0 = GAP_A + (360 - P.colSweep) / 2, c1 = c0 + P.colSweep;
  const arc = arcBand(0, 0, P.arcR - P.arcW / 2, P.arcR + P.arcW / 2, a0, a1, 64);
  const col = arcBand(0, 0, P.colR - P.colW / 2, P.colR + P.colW / 2, c0, c1, 64);
  const rIn = P.arcR - P.arcW / 2 + STUB_IN;
  const r3 = -P.v33Bus / Math.sin(rad(a0));
  const rG = -P.gndBus / Math.sin(rad(a1 - 360));
  const e3: Vec2 = [r3 * Math.cos(rad(a0)), r3 * Math.sin(rad(a0))];
  const eG: Vec2 = [rG * Math.cos(rad(a1)), rG * Math.sin(rad(a1))];
  const s3 = strokeSquare([rIn * Math.cos(rad(a0)), rIn * Math.sin(rad(a0))], e3, P.traceW);
  const sG = strokeSquare([rIn * Math.cos(rad(a1)), rIn * Math.sin(rad(a1))], eG, P.traceW);
  const wv: Vec2 = [0, P.colR + P.colW / 2 + LEAD_PAST];
  const lead = strokeSquare([0, P.colR - 0.3], wv, P.traceW);
  const halfBlock = 180 - P.colSweep / 2 + 4;
  const stop = arcBand(0, 0, P.tipR - 0.6, P.tipR + 1.4, 270 - halfBlock, 270 + halfBlock, 24);
  const st = tangFaceStack(layer);

  // D.buildRotor, 05_design.js lines 97 to 121.
  const armT = tangSnap(P.armT, layer), hubH = tangSnap(P.hubH, layer), bumpH = tangSnap(P.bumpH, layer);
  const shaftL = st.t + P.bore;
  const armRect = (ang: number, r1: number): Vec2[] => rotate(rect(0, -P.armW / 2, r1, P.armW / 2), ang, 0, 0);
  const core = rectC(0, 0, P.coreD, P.coreD);
  const bumps = ([[90, P.arcR], [90, P.colR], [210, P.colR], [330, P.colR]] as const).map(([ang, r]) => circle(r * Math.cos(rad(ang)), r * Math.sin(rad(ang)), P.bumpD / 2, 20));
  const rotor = {
    hub: circle(0, 0, P.coreD / 2 + 1.8, 32), arms: [armRect(90, P.tipR), armRect(210, P.balR), armRect(330, P.balR)], core, bumps,
    hubDisc: circle(0, 0, P.hubD / 2, 40), shaft: circle(0, 0, P.shaftD / 2, 40), shaftCut: rect(-P.shaftD, -P.shaftD, P.shaftD / 2 - P.flat, P.shaftD),
    armT, hubH, bumpH, shaftL, hubTop: armT + hubH, bumpTop: armT + bumpH,
  };
  return { a0, a1, c0, c1, arc, col, s3, sG, e3, eG, rIn, r3, rG, wv, lead, stop, st, rotor };
}
type PotGeom = ReturnType<typeof potGeometry>;

/** The pot's numbers: arc resistance (04_design.js line 443), rotor checks (05_design.js lines 258 to 267), leaf force (lines 299 to 301). */
export function potReadouts(P: PotParams, g: PotGeom, profile: ProfileLookup) {
  const row = P.arcMat === "ctpu" ? profile.resistivity("ctpu", "bulk", "printed") : profile.resistivity("cpla-protopasta", "along", "printed");
  const len = rad(P.sweep) * P.arcR;
  const arc = sectionResistance(row, len, P.arcW * g.st.l1);
  const ohm = typeof arc.ohm === "number" ? arc.ohm : arc.ohm[0];
  const preload = g.rotor.bumpTop - g.rotor.hubTop;
  const a0 = P.arcR - P.arcW / 2, a1 = P.arcR + P.arcW / 2, k0 = P.colR - P.colW / 2, k1 = P.colR + P.colW / 2;
  const marginArc = Math.min(P.arcR - a0, a1 - P.arcR), marginCol = Math.min(P.colR - k0, k1 - P.colR);
  const balCorner = Math.hypot(P.balR, P.armW / 2);
  const Lc = P.colR - P.hubD / 2, Ia = (P.armW * g.rotor.armT ** 3) / 12;
  const tpu = modulusOf(profile, "tpu95");
  const leaf = (3 * tpu.mpa * Ia * preload) / Lc ** 3;
  return {
    arcOhm: ohm, arcLen: len, arcTier: arc.tier, preload, marginArc, marginCol, balCorner, leaf, leafTier: tpu.tier,
    hubClear: a0 - (P.hubD / 2 + 0.8), arcColGap: k0 - (a1 + 0.8), stopClear: P.tipR - 0.6 - (balCorner + 0.5),
  };
}

export function potDerive(P: PotParams, profile: ProfileLookup, machine = "ffc5p"): Record<string, DerivedValue> {
  const g = potGeometry(P, layerOf(profile, machine));
  const r = potReadouts(P, g, profile);
  return {
    "R.arc": dv(r.arcOhm, "ohm", "rho sweep arcR / (arcW L1)", [r.arcTier]),
    arcLen: dv(r.arcLen, "mm", "sweep arcR", []),
    preload: dv(r.preload, "mm", "(armT + bumpH) - (armT + hubH), each snapped to the layer", []),
    hubTop: dv(g.rotor.hubTop, "mm", "armT + hubH", []),
    shaftL: dv(g.rotor.shaftL, "mm", "face thickness + bore", []),
    leafForce: dv(r.leaf, "N", "3 E (armW armT^3 / 12) preload / (colR - hubD / 2)^3", [r.leafTier]),
    marginArc: dv(r.marginArc, "mm", "bump centre margin on the arc", []),
    marginCol: dv(r.marginCol, "mm", "bump centre margin on the collector", []),
    balCorner: dv(r.balCorner, "mm", "hypot(balR, armW / 2)", []),
  };
}

function layerOf(profile: ProfileLookup, machine: string): number {
  const preset = profile.machine(machine).presets[0];
  if (preset === undefined) throw commandError({ code: "E_REF", path: `/machines/${machine}/presets`, got: machine, expected: "a machine with a process preset", hint: `give machine ${machine} a preset; the pot snaps to its layer height` });
  return preset.layer;
}

/** Original (x, y) to local (u, v): the underside seen from outside. */
const mirror = (ring: readonly Vec2[]): Vec2[] => ring.map(([x, y]): Vec2 => [x, -y]).reverse();

/** A frame shifted to a point of the face, for the rotor. */
function at(f: Frame, uv: readonly [number, number]): Frame {
  const [x, y] = f.at([uv[0], uv[1]]);
  return { ...f, x, y, at: ([u, v]) => [x + u * f.ux - v * f.uy, y + u * f.uy + v * f.ux] };
}

export function potApply(input: ApplyIn<PotParams>, id: string): ApplyOut {
  const P = input.params;
  const f = frameOf(input.face, id);
  const layer = layerOf(input.profile, input.draft.machine);
  const g = potGeometry(P, layer);
  const e = new TangEmit(f);
  const l1 = g.st.l1, lower = g.st.lower;
  const arcSlot = P.arcMat === "ctpu" ? "ctpu" : "cpla";

  // L1 regions (04_design.js lines 201 to 227, banded at lines 415 to 420).
  e.conductor("conductor.collector", P.wiper, mirror(g.col), -l1, 0, P.colW);
  e.conductor("conductor.wiperLead", P.wiper, mirror(g.lead), -l1, 0, P.traceW);
  e.conductor("conductor.v33End", P.v33, mirror(g.s3), -l1, 0, P.traceW);
  e.conductor("conductor.gndEnd", P.gnd, mirror(g.sG), -l1, 0, P.traceW);
  const arcFull = e.prism([mirror(g.arc)], -l1, 0);
  const behind = [e.prism([mirror(g.s3)], -l1, -lower), e.prism([mirror(g.sG)], -l1, -lower)];
  if (arcSlot === "ctpu") e.body("arc", "ctpu", { route: "csg", op: "difference", of: [arcFull, ...behind] });
  else e.body("arc", "cpla", arcFull, "conductor");
  // Stop block, PLA, standing out of the face (04_design.js lines 369 to 374, 395).
  e.body("stop", "pla", e.prism([mirror(g.stop)], 0, P.stopH));

  const st = g.st;
  if (P.rotorAt !== undefined) {
    const r = g.rotor, fr = at(f, P.rotorAt), er = new TangEmit(fr);
    const base = -st.t;
    // K.union of the hub and the arms, then K.diff of the core (lines 106 to 109): the core lies inside the hub, so it is the hole.
    const outer = r.arms.reduce((acc, arm) => unionRings(acc, arm), r.hub);
    const spider = er.prism([outer, [...r.core].reverse()], base, base + r.armT);
    e.body("rotor.spider", "ctpu", { route: "csg", op: "union", of: [spider, ...r.bumps.map((b) => er.prism([b], base + r.armT, base + r.bumpTop))] });
    e.body("rotor.core", "pla", { route: "csg", op: "union", of: [
      er.prism([r.core], base, base + r.armT),
      er.prism([r.hubDisc], base + r.armT, base + r.hubTop),
      { route: "csg", op: "intersection", of: [er.prism([r.shaft], base + r.hubTop, base + r.hubTop + r.shaftL), er.prism([r.shaftCut], base + r.hubTop, base + r.hubTop + r.shaftL)] },
    ] });
  } else {
    e.warnings.push({ code: "POT", text: "pot: rotor left out; give rotorAt to print it beside the face" });
  }

  e.feature({ kind: "port", id: "port.wiper", net: P.wiper, type: "signal", interface: "analog" });
  e.feature({ kind: "port", id: "port.v33", net: P.v33, type: "power", interface: "analog" });
  e.feature({ kind: "port", id: "port.gnd", net: P.gnd, type: "gnd", interface: "analog" });

  const r = potReadouts(P, g, input.profile);
  e.metric("pot.R.arc", r.arcOhm, "ohm", `arc ${P.sweep} deg of r ${P.arcR} at ${P.arcW} x ${l1.toFixed(2)} mm (04_design.js line 443)`, [r.arcTier]);
  e.metric("pot.preload", r.preload, "mm", "bump top less hub top (05_design.js line 120)", []);
  e.metric("pot.leafForce", r.leaf, "N", `each leaf at ${r.preload.toFixed(2)} mm preload (05_design.js line 301)`, [r.leafTier]);
  e.metric("pot.marginArc", r.marginArc, "mm", "bump centre margin on the arc (line 262)", []);
  e.metric("pot.marginCol", r.marginCol, "mm", "bump centre margin on the collector (line 262)", []);
  e.metric("pot.hubClear", r.hubClear, "mm", "arc inner edge less hub radius less 0.8 (line 263), at least 0", []);
  e.metric("pot.arcColGap", r.arcColGap, "mm", "collector inner edge less arc outer edge less 0.8 (line 264), at least 0", []);
  e.metric("pot.stopClear", r.stopClear, "mm", "stop inner edge less balance arm corner less 0.5 (lines 265 to 266), at least 0", []);
  for (const [k, v, text] of [["hubClear", r.hubClear, "hub reaches the arc: hubD too large or arcR too small"], ["arcColGap", r.arcColGap, "arc and collector too close"], ["stopClear", r.stopClear, "balance arm corners reach the stop block"]] as const) {
    if (v < 0) e.warnings.push({ code: "FIT", text: `pot ${k} ${v.toFixed(2)} mm: ${text}` });
  }
  e.metric("pot.terminal.v33", `${g.e3[0].toFixed(3)} ${(-g.e3[1]).toFixed(3)}`, undefined, "3V3 stub end, local u v, where the bus meets it", []);
  e.metric("pot.terminal.gnd", `${g.eG[0].toFixed(3)} ${(-g.eG[1]).toFixed(3)}`, undefined, "GND stub end, local u v", []);
  e.metric("pot.terminal.wiper", `${g.wv[0].toFixed(3)} ${(-g.wv[1]).toFixed(3)}`, undefined, "wiper lead end, local u v", []);
  return e.out();
}
