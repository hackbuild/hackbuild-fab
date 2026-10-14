// Two COFFER tile interiors as the canon names them: the K6 hex keys (canon
// hex-key, coffer record 5.4, gen_coffer.py `tile_K6` lines 40 to 52) and
// the D1 four-phase resolver dial (canon resolver-dial, record 5.7,
// `tile_D1` lines 168 to 182, with hexcore.py `hexlet` lines 97 to 102 and
// `polar_band` lines 114 to 123). Only what the original computes in plain
// arithmetic is ported: the key and band outlines before the generator's
// shapely unions and its buffer smoothing, and the numbers those outlines
// carry. Lengths in mm, angles in degrees, every value the original's own.

import { z } from "zod";
import type { DerivedValue, SchemaLike, Vec2 } from "@hackbuild/spec";
import { roundedConvex } from "./fillet.js";
import { COFFER_QUAD_SEGS } from "./port.js";
import { dv } from "../pip/common.js";

const rad = (d: number): number => (d * Math.PI) / 180;

export const hexKeyParams = z.object({
  /** Hexlet circumradius, mm (gen_coffer.py line 42, s 10.7). */
  s: z.number().positive().default(10.7),
  /** Grout between neighbouring keys, mm (line 42, g 4.4). */
  grout: z.number().positive().default(4.4),
  /** Corner rounding, mm (line 51, hexlet(..., 1.2)). */
  r: z.number().nonnegative().default(1.2),
  /** Rosette centre y, mm (line 42, cy 5.6). */
  cy: z.number().default(5.6),
  /** Pointy top, so the rosette interlocks (line 51, flat=False). */
  flat: z.boolean().default(false),
}).strict();
export type HexKeyParams = z.infer<typeof hexKeyParams>;
export const HEX_KEY_PARAMS = hexKeyParams as unknown as SchemaLike<unknown, HexKeyParams>;
export const HEX_KEY_DEFAULTS: HexKeyParams = hexKeyParams.parse({});

/** hexcore.py lines 97 to 102: a hex electrode of circumradius s about c, corners rounded r. */
export function hexlet(c: Vec2, s: number, r: number, flat: boolean): Vec2[] {
  const off = flat ? 0 : 30;
  const pts = Array.from({ length: 6 }, (_, k): Vec2 => [c[0] + s * Math.cos(rad(60 * k + off)), c[1] + s * Math.sin(rad(60 * k + off))]);
  return roundedConvex(pts, r, COFFER_QUAD_SEGS.rounded);
}

/** gen_coffer.py lines 43 to 52: the six key centres K1 to K6 at 0, 60 to 300 deg, pitch sqrt(3) s + grout. */
export function hexKeyCentres(K: HexKeyParams): { readonly net: string; readonly c: Vec2 }[] {
  const d = Math.sqrt(3) * K.s + K.grout;
  return [0, 60, 120, 180, 240, 300].map((a) => ({ net: `K${a / 60 + 1}`, c: [d * Math.cos(rad(a)), K.cy + d * Math.sin(rad(a))] }));
}

export function hexKeyDerive(K: HexKeyParams): Record<string, DerivedValue> {
  return {
    acrossFlats: dv(Math.sqrt(3) * K.s, "mm", "sqrt(3) s, the hexlet across the flats", []),
    pitch: dv(Math.sqrt(3) * K.s + K.grout, "mm", "sqrt(3) s + grout (gen_coffer.py line 43)", []),
    sharpArea: dv((3 * Math.sqrt(3) / 2) * K.s * K.s, "mm2", "3 sqrt(3) / 2 s^2, the hexagon before its corners round", []),
  };
}

export const resolverDialParams = z.object({
  /** Dial centre, mm (gen_coffer.py line 170). */
  cx: z.number().default(0.0),
  cy: z.number().default(5.6),
  /** Inner radius and annulus width, mm (line 171: r_in 9.0, W 21.5; r_out 30.5). */
  rIn: z.number().positive().default(9.0),
  W: z.number().positive().default(21.5),
  /** Modulation depth (line 171, m 0.35). */
  m: z.number().min(0).max(1).default(0.35),
  /** Gap between bands, mm (line 171, gap 1.05). */
  gap: z.number().nonnegative().default(1.05),
  /** Sweep start and end, deg (line 172: -62.5 to 242.5, 305 deg). */
  a0: z.number().default(-62.5),
  a1: z.number().default(242.5),
  /** Polar samples per band (line 179, 300). */
  steps: z.number().int().positive().default(300),
}).strict();
export type ResolverDialParams = z.infer<typeof resolverDialParams>;
export const RESOLVER_DIAL_PARAMS = resolverDialParams as unknown as SchemaLike<unknown, ResolverDialParams>;
export const RESOLVER_DIAL_DEFAULTS: ResolverDialParams = resolverDialParams.parse({});

/** gen_coffer.py lines 173 to 174: the share of the annulus below band k at angle a. */
export function cum(D: ResolverDialParams, a: number, k: number): number {
  let s = 0;
  for (let j = 0; j < k; j++) s += (1.0 + D.m * Math.cos(rad(a - 90 * j))) / 4.0;
  return s;
}

/** The inner and outer radius of band k (0 to 3) at angle a, half the gap off each internal boundary (lines 178 to 179). */
export function bandRadii(D: ResolverDialParams, a: number, k: number): readonly [number, number] {
  return [D.rIn + D.W * cum(D, a, k) + (k > 0 ? D.gap / 2 : 0), D.rIn + D.W * cum(D, a, k + 1) - (k < 3 ? D.gap / 2 : 0)];
}

/** hexcore.py lines 114 to 123: band k sampled over the sweep, outer edge then inner edge reversed (before the 0.3 mm smoothing). */
export function dialBand(D: ResolverDialParams, k: number): Vec2[] {
  const o: Vec2[] = [], i: Vec2[] = [];
  for (let n = 0; n <= D.steps; n++) {
    const a = D.a0 + ((D.a1 - D.a0) * n) / D.steps;
    const [r0, r1] = bandRadii(D, a, k);
    o.push([D.cx + r1 * Math.cos(rad(a)), D.cy + r1 * Math.sin(rad(a))]);
    i.push([D.cx + r0 * Math.cos(rad(a)), D.cy + r0 * Math.sin(rad(a))]);
  }
  return [...o, ...i.reverse()];
}

/** Band k's width at angle a with no gap: W cum(a, k + 1) - W cum(a, k) = W (1 + m cos(a - 90 k)) / 4. */
export const bandWidth = (D: ResolverDialParams, a: number, k: number): number => D.W * (cum(D, a, k + 1) - cum(D, a, k));

/** The decode the record states (coffer 5.7): atan2(D2 - D4, D1 - D3), deg in [0, 360). */
export function decodeAngle(w: readonly [number, number, number, number]): number {
  const a = (Math.atan2(w[1] - w[3], w[0] - w[2]) * 180) / Math.PI;
  return a < 0 ? a + 360 : a;
}

export function resolverDialDerive(D: ResolverDialParams): Record<string, DerivedValue> {
  return {
    rOut: dv(D.rIn + D.W, "mm", "rIn + W", []),
    sweep: dv(D.a1 - D.a0, "deg", "a1 - a0", []),
    blind: dv(360 - (D.a1 - D.a0), "deg", "360 - sweep: the notch where the traces leave, masked in firmware", []),
    swing: dv((D.m * D.W) / 2, "mm", "w1 - w3 = (m W / 2) cos a", []),
  };
}
