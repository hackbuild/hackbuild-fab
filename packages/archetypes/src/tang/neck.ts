// The membrane slider on the neck wall (tang-r6.md 4.5, canon
// membrane-slider-wall), ported from originals/tang-r6/files/src/05_design.js
// D.buildNeck (lines 38 to 94) and its box engine boxParts (lines 12 to
// 35); readouts from D.readouts (lines 327 to 333) and the press force note
// of D.runChecks (lines 293 to 297). Defaults are 03_design.js line 23.
//
// The neck is built in the original's print frame and placed on the face
// it is applied to: u along the neck, v the depth from the deck (the
// membrane at negative v), z across the width, layer by layer, so the 0.6
// mm air gap is an in-plane distance with no bridge (05_design.js line 159).
// boxParts lets a later box overwrite an earlier one of another slot; the
// boxes here meet only in the order the mesh kernel's role priority gives
// (conductive TPU over TPU over conductive PLA over PLA), which is the
// order they are declared in, so each slot is the union of its boxes less
// the cut boxes, as the original's bands are.

import { z } from "zod";
import { commandError, type ApplyIn, type ApplyOut, type DerivedValue, type ProfileLookup, type SchemaLike, type Vec2 } from "@hackbuild/spec";
import { sectionResistance } from "@hackbuild/profile";
import { dv, frameOf } from "../pip/common.js";
import { TANG_EZ, TangEmit, modulusOf, rect, tangSnap, um, type TangSlot } from "./common.js";

/** Neck params, TANG R6 defaults (03_design.js line 23), mm. */
export const neckParams = z.object({
  /** Neck length, mm. */
  L: z.number().positive().default(240),
  /** Neck width across the strip, the print height, mm. */
  W: z.number().positive().default(30),
  /** Beam depth from the deck, mm. */
  H: z.number().positive().default(12),
  /** Tenon length, waist included, mm. */
  tenon: z.number().positive().default(20),
  /** Tenon length inside the body, mm. */
  tIn: z.number().positive().default(18),
  /** Foot below the beam inside the body, mm. */
  foot: z.number().nonnegative().default(7),
  /** Waist step each side through the wall, mm. */
  waist: z.number().nonnegative().default(2),
  /** Peg socket side and depth, mm. */
  socket: z.number().positive().default(3.2),
  socketD: z.number().positive().default(4.6),
  /** Membrane cavity inset at each end, mm. */
  mstart: z.number().nonnegative().default(3),
  /** Deck wiper strip width and thickness, mm. */
  trackW: z.number().positive().default(6.8),
  trackT: z.number().positive().default(1.2),
  /** Conductive TPU strip width and thickness, mm. */
  condW: z.number().positive().default(11),
  condT: z.number().positive().default(0.8),
  /** TPU skin over the strip, mm. */
  tpuT: z.number().positive().default(0.8),
  /** Air gap between strip and deck, mm. */
  gap: z.number().positive().default(0.6),
  /** TPU rail width each edge, mm. */
  railW: z.number().positive().default(6),
  /** Deck lead width and thickness, mm. */
  leadW: z.number().positive().default(1.5),
  leadT: z.number().positive().default(1.2),
  /** Land length along the neck, height from the deck, width, pitch, mm. */
  landL: z.number().positive().default(10),
  landT: z.number().positive().default(6.0),
  landW: z.number().positive().default(6),
  landPitch: z.number().positive().default(9),
  /** Rail key into the deck, mm. */
  key: z.number().nonnegative().default(0.4),
  /** Net names. */
  v33: z.string().min(1).default("3V3"),
  wiper: z.string().min(1).default("W"),
  gnd: z.string().min(1).default("GND"),
}).strict();
export type NeckParams = z.infer<typeof neckParams>;
export const NECK_PARAMS = neckParams as unknown as SchemaLike<unknown, NeckParams>;
export const NECK_DEFAULTS: NeckParams = neckParams.parse({});

/** The deck leads start at the tenon top at x 14 (05_design.js lines 71 to 75), mm. */
const LEAD_X0 = 14;
/** Foot length along the neck (lines 67 to 68) and its reach across the width (footZ, line 51), mm. */
const FOOT_L = 2, FOOT_Z = 1.5;
/** End walls of the cavity (lines 58 to 59), mm. */
const WALL = 1.2;
/** Lands start 6 mm along the tenon (line 81), mm. */
const LAND_X = 6;

/** One box of the original's print frame: x along, y depth, z across. */
export interface NeckBox {
  readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number; readonly z0: number; readonly z1: number;
  readonly slot: TangSlot | "cut"; readonly tag: string; readonly net?: string;
}

/** D.buildNeck lines 38 to 89: the boxes and the dims, layer from the machine. */
export function neckBoxes(N: NeckParams, layer: number) {
  const snap = (v: number): number => tangSnap(v, layer);
  const Wn = N.W, Hn = N.H, Ln = N.L;
  const railW = snap(N.railW), memT = N.gap + N.condT + N.tpuT;
  const xm0 = N.tenon + N.mstart, xm1 = Ln - N.mstart;
  const zc0 = snap(Wn / 2 - N.condW / 2), zc1 = snap(Wn / 2 + N.condW / 2);
  const zw0 = snap(Wn / 2 - N.trackW / 2 + 0.6), zw1 = snap(Wn / 2 + N.trackW / 2 - 0.2);
  const lp = N.landPitch, lw = N.landW / 2;
  const zA = Wn / 2 - lp, zW = Wn / 2, zB = Wn / 2 + lp;
  const Hin = Hn + N.foot;
  const F: NeckBox[] = [];
  const add = (b: NeckBox): void => { F.push(b); };
  add({ x0: 0, x1: N.tIn, y0: 0, y1: Hin, z0: 0, z1: Wn, slot: "pla", tag: "tenon" });
  add({ x0: N.tIn, x1: N.tenon, y0: 0, y1: Hn, z0: N.waist, z1: Wn - N.waist, slot: "pla", tag: "waist" });
  add({ x0: N.tenon, x1: Ln, y0: 0, y1: Hn, z0: 0, z1: Wn, slot: "pla", tag: "beam" });
  for (const [r0, r1] of [[0, railW], [Wn - railW, Wn]] as const) add({ x0: xm0 - WALL, x1: xm1 + WALL, y0: -memT, y1: N.key, z0: r0, z1: r1, slot: "tpu", tag: "rail" });
  add({ x0: xm0 - WALL, x1: xm0, y0: -memT, y1: 0, z0: railW, z1: Wn - railW, slot: "tpu", tag: "root wall" });
  add({ x0: xm1, x1: xm1 + WALL, y0: -memT, y1: 0, z0: railW, z1: Wn - railW, slot: "tpu", tag: "tip wall" });
  add({ x0: xm0, x1: xm1, y0: -memT, y1: -(N.gap + N.condT), z0: railW, z1: Wn - railW, slot: "tpu", tag: "membrane skin" });
  add({ x0: xm0, x1: xm1, y0: -(N.gap + N.condT), y1: -N.gap, z0: railW, z1: zc0, slot: "tpu", tag: "membrane edge" });
  add({ x0: xm0, x1: xm1, y0: -(N.gap + N.condT), y1: -N.gap, z0: zc1, z1: Wn - railW, slot: "tpu", tag: "membrane edge" });
  add({ x0: xm0, x1: xm1, y0: -(N.gap + N.condT), y1: -N.gap, z0: zc0, z1: zc1, slot: "ctpu", tag: "track" });
  add({ x0: xm0, x1: xm0 + FOOT_L, y0: -N.gap, y1: 0, z0: zc0, z1: zc0 + FOOT_Z, slot: "ctpu", tag: "root foot" });
  add({ x0: xm1 - FOOT_L, x1: xm1, y0: -N.gap, y1: 0, z0: zc1 - FOOT_Z, z1: zc1, slot: "ctpu", tag: "tip foot" });
  add({ x0: xm0, x1: xm0 + FOOT_L, y0: 0, y1: N.trackT, z0: zA + lw - 2, z1: zc0 + FOOT_Z - 0.3, slot: "cpla", tag: "v33Pad", net: N.v33 });
  add({ x0: LEAD_X0, x1: xm0 + 1, y0: 0, y1: N.leadT, z0: zA + lw - 2, z1: zA + lw - 2 + N.leadW, slot: "cpla", tag: "v33Lead", net: N.v33 });
  add({ x0: xm1 - FOOT_L, x1: xm1, y0: 0, y1: N.trackT, z0: zc1 - FOOT_Z + 0.3, z1: zB - lw + 2, slot: "cpla", tag: "gndPad", net: N.gnd });
  add({ x0: LEAD_X0, x1: xm1 - 1, y0: 0, y1: N.leadT, z0: zB - lw + 2 - N.leadW, z1: zB - lw + 2, slot: "cpla", tag: "gndReturn", net: N.gnd });
  add({ x0: LEAD_X0, x1: xm1 - 3, y0: 0, y1: N.trackT, z0: zw0, z1: zw1, slot: "cpla", tag: "wiperStrip", net: N.wiper });
  const uPeg = LAND_X + N.landL / 2;
  const lands = [{ net: N.v33, z: zA, tag: "landV33" }, { net: N.wiper, z: zW, tag: "landW" }, { net: N.gnd, z: zB, tag: "landGnd" }];
  for (const l of lands) {
    add({ x0: LAND_X, x1: LAND_X + N.landL, y0: 0, y1: N.landT, z0: l.z - lw, z1: l.z + lw, slot: "cpla", tag: l.tag, net: l.net });
    add({ x0: uPeg - N.socket / 2, x1: uPeg + N.socket / 2, y0: -1, y1: N.socketD, z0: l.z - N.socket / 2, z1: l.z + N.socket / 2, slot: "cut", tag: `socket${l.tag.slice(4)}` });
  }
  // boxParts rounds every z to the micron (05_design.js line 13).
  const boxes = F.map((b) => ({ ...b, z0: um(b.z0), z1: um(b.z1) }));
  const trackLen = (xm1 - FOOT_L) - (xm0 + FOOT_L);
  return { boxes, railW, memT, xm0, xm1, zc0, zc1, zw0, zw1, zA, zW, zB, uPeg, trackLen, Hin };
}
type NeckDims = ReturnType<typeof neckBoxes>;

const overlaps = (a: NeckBox, b: NeckBox): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1 && a.z0 < b.z1 && b.z0 < a.z1;

/**
 * The rings of one net in one z band: the union of its boxes there less the
 * cut boxes, on the grid of their edges, each component traced
 * counter-clockwise. The original keeps one prism per box (lines 23 to 26)
 * and its kernel unions them per slab (02_kernel.js lines 185 to 220); the
 * union is declared here so no two conductor regions of one net overlap. A
 * component with a hole cannot be one conductor region and is E_SCHEMA.
 * Given a second z, the rings cover what both bands cover: the footprint
 * the original's meshPart welds two slabs over (its foot prism).
 */
export function netRings(boxes: readonly NeckBox[], cuts: readonly NeckBox[], zm: number, zb?: number): Vec2[][] {
  const at = (z: number) => ({ live: boxes.filter((b) => b.z0 <= z && b.z1 >= z), holes: cuts.filter((b) => b.z0 <= z && b.z1 >= z) });
  const { live, holes } = at(zm);
  const second = zb === undefined ? undefined : at(zb);
  const all = [...live, ...holes, ...(second === undefined ? [] : [...second.live, ...second.holes])];
  const xs = [...new Set(all.flatMap((b) => [b.x0, b.x1]))].sort((p, q) => p - q);
  const ys = [...new Set(all.flatMap((b) => [b.y0, b.y1]))].sort((p, q) => p - q);
  const nx = xs.length - 1, ny = ys.length - 1;
  const inBox = (b: NeckBox, i: number, j: number): boolean => {
    const cx = ((xs[i] as number) + (xs[i + 1] as number)) / 2, cy = ((ys[j] as number) + (ys[j + 1] as number)) / 2;
    return cx > b.x0 && cx < b.x1 && cy > b.y0 && cy < b.y1;
  };
  const cover = (i: number, j: number, l: readonly NeckBox[], h: readonly NeckBox[]): boolean => l.some((b) => inBox(b, i, j)) && !h.some((b) => inBox(b, i, j));
  const on = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < nx && j < ny && cover(i, j, live, holes) && (second === undefined || cover(i, j, second.live, second.holes));
  // Directed boundary edges of covered cells, counter-clockwise about each cell, keyed by start corner.
  const next = new Map<string, [number, number][]>();
  const push = (a: [number, number], b: [number, number]): void => { const k = `${a[0]},${a[1]}`; next.set(k, [...(next.get(k) ?? []), b]); };
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    if (!on(i, j)) continue;
    if (!on(i, j - 1)) push([i, j], [i + 1, j]);
    if (!on(i + 1, j)) push([i + 1, j], [i + 1, j + 1]);
    if (!on(i, j + 1)) push([i + 1, j + 1], [i, j + 1]);
    if (!on(i - 1, j)) push([i, j + 1], [i, j]);
  }
  const loops: [number, number][][] = [];
  for (const [k0, list] of next) {
    while (list.length > 0) {
      const start = k0.split(",").map(Number) as [number, number];
      const loop: [number, number][] = [start];
      let at = list.shift() as [number, number];
      while (`${at[0]},${at[1]}` !== k0 || loop.length === 0) {
        loop.push(at);
        const out = next.get(`${at[0]},${at[1]}`) ?? [];
        const nxt = out.shift();
        if (nxt === undefined) break;
        at = nxt;
      }
      loops.push(loop);
    }
  }
  const rings = loops.map((l) => {
    // Drop collinear corners.
    const keep = l.filter((p, i) => {
      const a = l[(i + l.length - 1) % l.length] as [number, number], c = l[(i + 1) % l.length] as [number, number];
      return !((a[0] === p[0] && p[0] === c[0]) || (a[1] === p[1] && p[1] === c[1]));
    });
    return keep.map(([i, j]): Vec2 => [um(xs[i] as number), um(ys[j] as number)]);
  });
  const area2 = (r: readonly Vec2[]): number => r.reduce((s, p, i) => { const q = r[(i + 1) % r.length] as Vec2; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
  if (rings.some((r) => area2(r) < 0)) {
    throw commandError({ code: "E_SCHEMA", path: "/params", got: rings.length, expected: "conductor regions without holes", hint: "a cut leaves a hole in a deck conductor; keep each socket opening through one face of its land" });
  }
  return rings;
}

/** The neck's resistances and press force (05_design.js lines 293 to 297, 327 to 333) from profile rows. */
export function neckReadouts(N: NeckParams, d: NeckDims, profile: ProfileLookup) {
  const cpla = profile.resistivity("cpla-protopasta", "along", "printed");
  const ctpu = profile.resistivity("ctpu", "bulk", "printed");
  const tpu = modulusOf(profile, "tpu95");
  const n = (v: number | readonly [number, number]): number => (typeof v === "number" ? v : v[0]);
  const track = sectionResistance(ctpu, d.trackLen, N.condW * N.condT);
  const leadA = sectionResistance(cpla, d.xm0 - LEAD_X0, N.leadW * N.leadT);
  const leadB = sectionResistance(cpla, d.xm1 - LEAD_X0, N.leadW * N.leadT);
  const wiper = sectionResistance(cpla, d.xm1 - LEAD_X0, (d.zw1 - d.zw0) * N.trackT);
  // runChecks reads the raw railW for the span (line 294), not the snapped rail.
  const span = N.W - 2 * N.railW, t = N.condT + N.tpuT;
  const I = (N.condW * t ** 3) / 12;
  const E = tpu.mpa;
  const press = (192 * E * I * N.gap) / span ** 3;
  return {
    trackR: n(track.ohm), leadA: n(leadA.ohm), leadB: n(leadB.ohm), wiperR: n(wiper.ohm), press, span, t,
    tiers: { track: [track.tier], cpla: [cpla.provenance.tier], press: [tpu.tier] },
  };
}

export function neckDerive(N: NeckParams, profile: ProfileLookup, machine = "ffc5p"): Record<string, DerivedValue> {
  const layer = layerOf(profile, machine);
  const d = neckBoxes(N, layer);
  const r = neckReadouts(N, d, profile);
  return {
    trackLen: dv(d.trackLen, "mm", "(xm1 - 2) - (xm0 + 2)", []),
    xm0: dv(d.xm0, "mm", "tenon + mstart", []),
    xm1: dv(d.xm1, "mm", "L - mstart", []),
    "R.track": dv(r.trackR, "ohm", "rho_ctpu trackLen / (condW condT)", r.tiers.track),
    "R.leadA": dv(r.leadA, "ohm", "rho_cpla (xm0 - 14) / (leadW leadT)", r.tiers.cpla),
    "R.leadB": dv(r.leadB, "ohm", "rho_cpla (xm1 - 14) / (leadW leadT)", r.tiers.cpla),
    "R.wiper": dv(r.wiperR, "ohm", "rho_cpla (xm1 - 14) / ((zw1 - zw0) trackT)", r.tiers.cpla),
    pressForce: dv(r.press, "N", "192 E (condW t^3 / 12) gap / (W - 2 railW)^3, t = condT + tpuT", r.tiers.press),
  };
}

function layerOf(profile: ProfileLookup, machine: string): number {
  const preset = profile.machine(machine).presets[0];
  if (preset === undefined) throw commandError({ code: "E_REF", path: `/machines/${machine}/presets`, got: machine, expected: "a machine with a process preset", hint: `give machine ${machine} a preset; the neck snaps to its layer height` });
  return preset.layer;
}

export function neckApply(input: ApplyIn<NeckParams>, id: string): ApplyOut {
  const N = input.params;
  const f = frameOf(input.face, id);
  const d = neckBoxes(N, layerOf(input.profile, input.draft.machine));
  const e = new TangEmit(f);
  const cuts = d.boxes.filter((b) => b.slot === "cut");
  const box = (b: NeckBox) => e.prism([rect(b.x0, b.y0, b.x1, b.y1)], b.z0, b.z1);
  // Each slot is cut by the boxes of the slots ahead of it and by the cut boxes, as boxParts
  // overwrites (lines 21 to 31), so no two bodies overlap and the kernel partitions nothing.
  const ahead: Record<"pla" | "tpu" | "ctpu", readonly (TangSlot | "cut")[]> = { ctpu: ["cut"], tpu: ["ctpu", "cut"], pla: ["ctpu", "tpu", "cpla", "cut"] };
  for (const slot of ["pla", "tpu", "ctpu"] as const) {
    const of = d.boxes.filter((b) => b.slot === slot && b.net === undefined);
    if (of.length === 0) continue;
    const solid = of.length === 1 ? box(of[0] as NeckBox) : { route: "csg" as const, op: "union" as const, of: of.map(box) };
    const hit = d.boxes.filter((c) => c !== undefined && ahead[slot].includes(c.slot) && of.some((b) => overlaps(b, c)));
    const name = slot === "pla" ? "beam" : slot === "tpu" ? "membrane" : "track";
    e.body(name, slot, hit.length === 0 ? solid : { route: "csg", op: "difference", of: [solid, ...hit.map(box)] });
  }
  // Conductive boxes, per net and z band, as the union of that net's boxes less the cuts.
  const conductive = d.boxes.filter((x) => x.net !== undefined);
  for (const net of [...new Set(conductive.map((b) => b.net as string))]) {
    const mine = conductive.filter((b) => b.net === net);
    const hit = cuts.filter((c) => mine.some((b) => overlaps(b, c)));
    const zs = [...new Set([...mine, ...hit].flatMap((b) => [b.z0, b.z1]))].sort((p, q) => p - q);
    zs.slice(0, -1).forEach((z0, i) => {
      const z1 = zs[i + 1] as number;
      netRings(mine, hit, (z0 + z1) / 2).forEach((ring, k) => {
        const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
        const w = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
        e.conductor(`conductor.${net}.${i}.${k}`, net, ring, z0, z1, w);
      });
      // A foot over the shared footprint welds this band to the next, EZ either side
      // (02_kernel.js lines 212 to 216), so stacked bands of one net overlap.
      const z2 = zs[i + 2];
      if (z2 !== undefined) netRings(mine, hit, (z0 + z1) / 2, (z1 + z2) / 2).forEach((ring, k) => {
        e.conductor(`conductor.${net}.${i}.foot${k}`, net, ring, z1 - TANG_EZ, z1 + TANG_EZ, 2 * TANG_EZ);
      });
    });
  }
  e.feature({ kind: "port", id: "port.wiper", net: N.wiper, type: "signal", interface: "analog" });
  e.feature({ kind: "port", id: "port.v33", net: N.v33, type: "power", interface: "analog" });
  e.feature({ kind: "port", id: "port.gnd", net: N.gnd, type: "gnd", interface: "analog" });

  const r = neckReadouts(N, d, input.profile);
  e.metric("neck.trackLen", d.trackLen, "mm", "track between the feet, (xm1 - 2) - (xm0 + 2)", []);
  e.metric("neck.R.track", r.trackR, "ohm", "conductive TPU strip over the track length (05_design.js line 329)", r.tiers.track);
  e.metric("neck.R.leadA", r.leadA, "ohm", "deck 3V3 lead (line 330)", r.tiers.cpla);
  e.metric("neck.R.leadB", r.leadB, "ohm", "deck GND return (line 331)", r.tiers.cpla);
  e.metric("neck.R.wiper", r.wiperR, "ohm", "deck wiper strip (line 332)", r.tiers.cpla);
  e.metric("neck.pressForce", r.press, "N", `about ${r.press.toFixed(1)} N to make contact over a ${r.span} mm span, ${r.t.toFixed(2)} mm TPU wall, gap ${N.gap} mm (line 296)`, r.tiers.press);
  e.metric("neck.memT", d.memT, "mm", "membrane depth: gap, strip and skin", []);
  return e.out();
}
