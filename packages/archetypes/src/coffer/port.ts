// The COFFER six-edge port standard (coffer record 5.1 and 5.2, canon
// coffer-port), ported from originals/coffer/files/hexcore.py: the
// interlock dict P (lines 22 to 43), the frames apo, nvec, tvec, uv and
// neighbour_offset (lines 47 to 63), hexagon (lines 65 to 75), the port
// pads, ground tabs and ground ring (lines 125 to 156), and the port gates
// gen_coffer.py `gates` computes from them (lines 323 to 333: port slot,
// pad and tab seam gaps, fits 4 inch tape). Every length is the original's
// declared value, mm; the copper is adhesive copper tape cut on a vinyl
// cutter (profile material copper-tape, vendor).
//
// Frames, as the original states them (hexcore.py lines 11 to 16): tile
// local mm, y up, origin at the tile centre; edge e has outward normal at
// 30 + 60 e deg, and (u, v) runs along the edge and inward from it.

import { z } from "zod";
import type { DerivedValue, SchemaLike, Vec2 } from "@hackbuild/spec";
import { insetConvex, roundedConvex } from "./fillet.js";
import { dv } from "../pip/common.js";

/** Six names, one per pad position in u order; null skips the position (hexcore.py line 127). */
const padNames = z.array(z.string().min(1).nullable()).length(6);

export const cofferPortParams = z.object({
  /** Hex side, flat top, mm (hexcore.py line 24). */
  s: z.number().positive().default(54.0),
  /** Outline corner rounding, mm (line 25). */
  cornerR: z.number().nonnegative().default(3.2),
  /** Copper tape roll width, the hard height limit, mm (line 26). */
  tapeW: z.number().positive().default(101.6),
  /** Ground ring band, v of its outer and inner boundary, mm (lines 27 to 28). */
  ringOut: z.number().positive().default(6.5),
  ringIn: z.number().positive().default(9.5),
  /** Ground tab positions along each edge, mm (line 29). */
  tabU: z.array(z.number()).default([-21.0, 0.0, 21.0]),
  /** Ground tab width, mm (line 30); the tab is a flat-capped trace this wide. */
  tabLen: z.number().positive().default(6.5),
  /** Tab tip short of the outline, mm (line 31). */
  tabV: z.number().nonnegative().default(1.1),
  /** Signal pad positions along a signal edge, mm (line 32). */
  padU: z.array(z.number()).length(6).default([-14.0, -8.5, -3.0, 3.0, 8.5, 14.0]),
  /** Signal pad along u and across v, mm (lines 33 to 34). */
  padW: z.number().positive().default(4.4),
  padH: z.number().positive().default(3.4),
  /** Pad centre from the edge, mm (line 35). */
  padV: z.number().positive().default(3.2),
  /** Pad corner rounding, mm (line 135, `rounded(pts, 0.8)`). */
  padR: z.number().nonnegative().default(0.8),
  /** Ring window half span along a signal edge, mm (line 36; the cut spans u -winU to +winU). */
  winU: z.number().positive().default(20.0),
  /** The signal edges: each carries the six pads and a window in the ring (PORT_EDGE 4, line 45; M1 uses 2 and 5). */
  windows: z.array(z.number().int().min(0).max(5)).min(1).default([4]),
  /** Edges whose centre tab is skipped (gen_coffer.py line 297 default: the port edge). */
  skipCentre: z.array(z.number().int().min(0).max(5)).default([4]),
  /** Net names of the six pads on each signal edge, in windows order; working names, the original names them per tile. */
  pads: z.array(padNames).default([["P1", "P2", "P3", "P4", "P5", "P6"]]),
  /** Ground net name (gen_coffer.py line 303). */
  gnd: z.string().min(1).default("GND"),
}).strict();
export type CofferPortParams = z.infer<typeof cofferPortParams>;
export const COFFER_PORT_PARAMS = cofferPortParams as unknown as SchemaLike<unknown, CofferPortParams>;
export const COFFER_PORT_DEFAULTS: CofferPortParams = cofferPortParams.parse({});

/** Round-join segments per quarter turn the original passes: hexagon 24 (hexcore.py line 74), rounded 20 (line 82). */
export const COFFER_QUAD_SEGS = { hexagon: 24, rounded: 20 } as const;

const rad = (d: number): number => (d * Math.PI) / 180;

/** hexcore.py line 47: the apothem of a flat-top hexagon of side s, mm. */
export const apo = (s: number): number => (s * Math.sqrt(3)) / 2;
/** hexcore.py lines 51 to 55: the outward normal and the tangent of edge e. */
export function nvec(e: number): Vec2 {
  const a = rad(30 + 60 * e);
  return [Math.cos(a), Math.sin(a)];
}
export function tvec(e: number): Vec2 {
  const a = rad(30 + 60 * e);
  return [-Math.sin(a), Math.cos(a)];
}
/** hexcore.py lines 57 to 60: edge local (u, v) to tile local. */
export function uv(P: CofferPortParams, e: number, u: number, v: number): Vec2 {
  const n = nvec(e), t = tvec(e), A = apo(P.s);
  return [n[0] * (A - v) + t[0] * u, n[1] * (A - v) + t[1] * u];
}
/** hexcore.py lines 62 to 63: the centre of the neighbour across edge e. */
export function neighbourOffset(P: CofferPortParams, e: number): Vec2 {
  const n = nvec(e), A = apo(P.s);
  return [2 * A * n[0], 2 * A * n[1]];
}

/** hexcore.py lines 65 to 75: the flat-top hexagon inset by a constant apothem distance, corners rounded r. */
export function hexagon(P: CofferPortParams, inset: number, r: number): Vec2[] {
  const A = apo(P.s) - inset;
  const ss = (A * 2) / Math.sqrt(3);
  const pts = Array.from({ length: 6 }, (_, k): Vec2 => [ss * Math.cos(rad(60 * k)), ss * Math.sin(rad(60 * k))]);
  return r > 0 ? roundedConvex(pts, r, COFFER_QUAD_SEGS.hexagon) : pts;
}

/** The tile outline (gen_coffer.py line 296). */
export const outline = (P: CofferPortParams): Vec2[] => hexagon(P, 0, P.cornerR);

export interface PortPad { readonly net: string; readonly e: number; readonly u: number; readonly xy: Vec2; readonly ring: Vec2[] }

/** hexcore.py lines 126 to 136: the signal pads of edge e, centre at uv(e, u, padV), corners rounded padR. */
export function portPads(P: CofferPortParams, e: number, names: readonly (string | null)[]): PortPad[] {
  const n = nvec(e), t = tvec(e);
  const hw = P.padW / 2, hh = P.padH / 2;
  const out: PortPad[] = [];
  P.padU.forEach((u, i) => {
    const net = names[i];
    if (net === null || net === undefined) return;
    const c = uv(P, e, u, P.padV);
    const pts = ([[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]] as const).map(([du, dv]): Vec2 => [c[0] + t[0] * du - n[0] * dv, c[1] + t[1] * du - n[1] * dv]);
    out.push({ net, e, u, xy: c, ring: roundedConvex(pts, P.padR, COFFER_QUAD_SEGS.rounded) });
  });
  return out;
}

/**
 * hexcore.py lines 138 to 144: the ground tabs of edge e. A tab is
 * `trace([c0, c1], tabLen, cap=2)`, a segment from v tabV to ringOut + 0.5
 * buffered flat-capped, which is the rectangle tabLen wide over it.
 */
export function gndTabs(P: CofferPortParams, e: number, skipCentre: boolean): { readonly u: number; readonly ring: Vec2[] }[] {
  const t = tvec(e), h = P.tabLen / 2;
  return P.tabU.filter((u) => !(skipCentre && Math.abs(u) < 1e-6)).map((u) => {
    const c0 = uv(P, e, u, P.tabV), c1 = uv(P, e, u, P.ringOut + 0.5);
    return { u, ring: [[c0[0] - t[0] * h, c0[1] - t[1] * h], [c1[0] - t[0] * h, c1[1] - t[1] * h], [c1[0] + t[0] * h, c1[1] + t[1] * h], [c0[0] + t[0] * h, c0[1] + t[1] * h]] };
  });
}

/** hexcore.py lines 150 to 155: the window cut from the ring on a signal edge. */
export function ringWindow(P: CofferPortParams, e: number): Vec2[] {
  const w = P.winU;
  return [uv(P, e, -w, P.ringOut - 1.0), uv(P, e, w, P.ringOut - 1.0), uv(P, e, w, P.ringIn + 1.0), uv(P, e, -w, P.ringIn + 1.0)];
}

function inside(win: readonly Vec2[], p: Vec2): boolean {
  const c = insetConvex(win, 0);
  return c.every((a, i) => {
    const b = c[(i + 1) % c.length] as Vec2;
    return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) > 0;
  });
}

/** Every crossing of segment p to q with the boundary of a convex window: the parameter t along p to q and the point. */
function crossings(win: readonly Vec2[], p: Vec2, q: Vec2): { t: number; x: Vec2 }[] {
  const out: { t: number; x: Vec2 }[] = [];
  for (let i = 0; i < win.length; i++) {
    const a = win[i] as Vec2, b = win[(i + 1) % win.length] as Vec2;
    const r: Vec2 = [q[0] - p[0], q[1] - p[1]], s: Vec2 = [b[0] - a[0], b[1] - a[1]];
    const den = r[0] * s[1] - r[1] * s[0];
    if (den === 0) continue;
    const t = ((a[0] - p[0]) * s[1] - (a[1] - p[1]) * s[0]) / den;
    const v = ((a[0] - p[0]) * r[1] - (a[1] - p[1]) * r[0]) / den;
    if (t > 0 && t <= 1 && v >= 0 && v <= 1) out.push({ t, x: [p[0] + t * r[0], p[1] + t * r[1]] });
  }
  return out;
}

interface Run { readonly from: number; readonly to: number; readonly pts: Vec2[] }

/**
 * The runs of a ring outside every window, each from the window it leaves
 * to the window it enters. A window may cut a ring between two vertices,
 * so crossings are found per segment, not from vertex membership.
 */
function runs(ring: readonly Vec2[], wins: readonly (readonly Vec2[])[]): Run[] {
  const at = (p: Vec2): number => wins.findIndex((w) => inside(w, p));
  const start = ring.findIndex((p) => at(p) < 0);
  const r = [...ring.slice(start), ...ring.slice(0, start)];
  const out: Run[] = [];
  let cur: { from: number; pts: Vec2[] } | null = { from: -1, pts: [] };
  let inWin = -1;
  r.forEach((p, i) => {
    const q = r[(i + 1) % r.length] as Vec2;
    if (cur !== null) cur.pts.push(p);
    const events = wins.flatMap((w, k) => crossings(w, p, q).map((c) => ({ ...c, k }))).sort((x, y) => x.t - y.t);
    for (const ev of events) {
      if (inWin < 0 && cur !== null) {
        cur.pts.push(ev.x);
        out.push({ from: cur.from, to: ev.k, pts: cur.pts });
        cur = null;
        inWin = ev.k;
      } else if (inWin === ev.k) {
        cur = { from: ev.k, pts: [ev.x] };
        inWin = -1;
      }
    }
  });
  // The run open at the end wraps through index 0 into the first run, which left no window.
  const first = out[0];
  if (cur !== null && first !== undefined && first.from === -1) {
    const open: { from: number; pts: Vec2[] } = cur;
    out[0] = { from: open.from, to: first.to, pts: [...open.pts, ...first.pts] };
  }
  return out;
}

/**
 * hexcore.py lines 146 to 156: the ground ring band between v ringOut and
 * ringIn with a window cut on every signal edge, one ring per piece (a
 * band cut by k windows is k pieces, each one ring with no hole).
 */
export function gndRing(P: CofferPortParams, windows: readonly number[]): Vec2[][] {
  const outer = hexagon(P, P.ringOut, P.cornerR);
  const inner = hexagon(P, P.ringIn, P.cornerR);
  const wins = windows.map((e) => ringWindow(P, e));
  const o = runs(outer, wins), i = runs(inner, wins);
  return o.map((ro) => {
    const ri = i.find((x) => x.from === ro.from && x.to === ro.to);
    if (ri === undefined) throw new Error("coffer ring: no inner run between the windows an outer run spans");
    return [...ro.pts, ...[...ri.pts].reverse()];
  });
}

/** gen_coffer.py lines 316 to 333: the numbers the port gates compute, at the params given. */
export function cofferPortDerive(P: CofferPortParams): Record<string, DerivedValue> {
  const ring = outline(P);
  const ys = ring.map((p) => p[1]), xs = ring.map((p) => p[0]);
  const height = Math.max(...ys) - Math.min(...ys);
  const width = Math.max(...xs) - Math.min(...xs);
  return {
    apothem: dv(apo(P.s), "mm", "s sqrt(3) / 2 (hexcore.py line 47)", []),
    width: dv(width, "mm", "outline bounds in x after the corner rounding", []),
    height: dv(height, "mm", "outline bounds in y (gen_coffer.py line 322)", []),
    tapeMargin: dv(P.tapeW - 4.0 - height, "mm", "tapeW - 4 - height; the fits 4 inch tape gate holds at 0 or more (gen_coffer.py line 323)", []),
    padSeamGap: dv(2 * (P.padV - P.padH / 2), "mm", "2 (padV - padH / 2), gate at least 2.0 (gen_coffer.py line 329)", []),
    tabSeamGap: dv(2 * P.tabV, "mm", "2 tabV, gate at least 1.4 (gen_coffer.py line 330)", []),
    ringBand: dv(P.ringIn - P.ringOut, "mm", "ringIn - ringOut (hexcore.py lines 27 to 28)", []),
  };
}
