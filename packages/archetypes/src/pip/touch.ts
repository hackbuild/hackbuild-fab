// The PIP touch comb key (pip.md 5.3, canon touch-comb-key), ported from
// originals/pip/files/haft-src/src/model.js lines 113 to 136 (the touch
// branch), 478 (its post resistance) and 544 to 546 (its fits rows), and
// layout.js line 381 (its terminals). Defaults layout.js line 37.
//
// A PETG boss rises from the host top through the bezel; two cPLA combs
// lie in its top 0.72 mm, the sense comb on the key net and the drive comb
// on the common rail (3V3 in PIP). A fingertip bridges them. Each comb is
// the union of a spine and its fingers clipped by the comb disc; here each
// piece is its own conductor region on the comb's net, so the union is the
// partition's (stage 5) and the per-slot volume equals PIP's union.

import { z } from "zod";
import { commandError, type ApplyIn, type ApplyOut, type DerivedValue, type ProfileLookup, type SchemaLike, type Vec2 } from "@hackbuild/spec";
import { sectionResistance } from "@hackbuild/profile";
import {
  EZ, circle, clipHalf, clipRect, dv, fitMetric, fitRow, fitWarnings, frameOf, mm, pipStack, snapUp,
  type FitRow, type PipStack,
} from "./common.js";
import { Emit } from "./emit.js";

/** Touch key params, PIP defaults (layout.js line 37; route.post line 28; stack.bezel line 27). */
export const touchParams = z.object({
  /**
   * Boss and comb disc diameter, mm. Bounded to the PIP bench slider, 8 to 20
   * (haft-src/bench/part1.html line 265): the reach rule keeps only fingers
   * within about sqrt(3.2 rc) of the centre, so a wider disc grows the boss
   * and leaves most of it without electrode.
   */
  d: z.number().min(8).max(20).default(12),
  /** Finger width, mm. */
  finger: z.number().positive().default(1.0),
  /** Gap between a finger and the other comb, mm. */
  gap: z.number().positive().default(0.8),
  /** Spine width, mm. */
  spine: z.number().positive().default(1.8),
  /** PETG rim round the comb disc, mm. */
  rim: z.number().nonnegative().default(0.6),
  /** Bezel thickness the boss rises through, mm (stack.bezel). */
  bezel: z.number().nonnegative().default(2.4),
  /** Terminal and spine post radius, mm (route.post). */
  post: z.number().positive().default(0.6),
  /** Host top, mm from the bed; 0 places the top at the floor need. */
  top: z.number().nonnegative().default(0),
  /** The sense comb's net. */
  net: z.string().min(1).default("KEY"),
  /** The drive comb's net. */
  common: z.string().min(1).default("3V3"),
}).strict();
export type TouchParams = z.infer<typeof touchParams>;
export const TOUCH_PARAMS = touchParams as unknown as SchemaLike<unknown, TouchParams>;
export const TOUCH_DEFAULTS: TouchParams = touchParams.parse({});

export function touchZ(T: TouchParams, s: PipStack) {
  const need = s.z.floor + 1.44;
  const top = T.top > 0 ? T.top : snapUp(need, s.layer);
  const zbt = top + T.bezel;
  return { need, top, zbt, zt0: zbt - 0.72 };
}

/**
 * One comb as one ring: the disc left of the spine's inner edge, with each
 * finger's part right of that edge spliced into it. This is PIP's
 * union(spine, fingers) intersected with the disc (model.js lines 117 to
 * 128) for a comb anchored at -x; a finger the reach rule keeps has both
 * root corners inside the disc, so each finger joins the spine along a
 * whole edge and the ring stays simple.
 */
function leftComb(disc: readonly Vec2[], xs: number, fingers: readonly { y0: number; y1: number; x1: number }[]): Vec2[] {
  const spine = clipHalf(disc, 1, 0, xs);
  // Start at the inner edge's top vertex: the ring runs round the left arc to its bottom vertex, then up the edge.
  const near = (p: Vec2): boolean => Math.abs(p[0] - xs) < 1e-12;
  const i = spine.findIndex((p, j) => near(p) && near(spine[(j + 1) % spine.length] as Vec2) && (spine[(j + 1) % spine.length] as Vec2)[1] > p[1]);
  const ring = [...spine.slice(i + 1), ...spine.slice(0, i + 1)];
  const out: Vec2[] = [...ring];
  for (const f of [...fingers].sort((a, b) => a.y0 - b.y0)) {
    const q = clipRect(disc, xs, f.y0, f.x1, f.y1);
    const k = q.findIndex((p) => near(p) && Math.abs(p[1] - f.y0) < 1e-12);
    const walk = [...q.slice(k), ...q.slice(0, k)];
    const end = walk.findIndex((p) => near(p) && Math.abs(p[1] - f.y1) < 1e-12);
    out.push(...walk.slice(0, end + 1));
  }
  return out;
}

const mirror = (ring: readonly Vec2[]): Vec2[] => ring.map(([x, y]): Vec2 => [-x, y]).reverse();

/** The two combs, model.js lines 117 to 128: sense anchored left, drive right, fingers alternating. */
export function touchCombs(T: TouchParams, bleed: number) {
  const rc = T.d / 2 - T.rim, fw = Math.max(0.4, T.finger - bleed);
  const disc = circle(rc, [0, 0], 64);
  const pitch = T.finger + T.gap;
  const nF = Math.floor((2 * rc) / pitch);
  const y0 = -((nF - 1) * pitch) / 2;
  const sense: { y0: number; y1: number; x1: number }[] = [];
  const drive: { y0: number; y1: number; x1: number }[] = [];
  for (let k = 0; k < nF; k++) {
    const yy = y0 + k * pitch;
    const reach = Math.sqrt(Math.max(0, rc * rc - Math.pow(Math.abs(yy) + fw / 2, 2)));
    if (reach < rc - T.spine + 0.2) continue;
    // A drive finger runs from x = rc back to -rc + spine + gap; mirrored, it is a left finger to rc - spine - gap.
    (k % 2 === 0 ? sense : drive).push({ y0: yy - fw / 2, y1: yy + fw / 2, x1: rc - T.spine - T.gap });
  }
  const xs = -rc + T.spine;
  return {
    rc, fw, xs: rc - T.spine / 2, fingers: sense.length + drive.length,
    sense: leftComb(disc, xs, sense),
    drive: mirror(leftComb(mirror(disc), xs, drive)),
  };
}

/** The three touch fits rows, model.js lines 544 to 546. */
export function touchFits(T: TouchParams): FitRow[] {
  return [
    fitRow("touch pad", "comb gap", T.gap, mm(T.gap), T.gap >= 0.6, "exposed, skin bridges it"),
    fitRow("touch pad", "finger width", T.finger, mm(T.finger), T.finger >= 0.6, ""),
    fitRow("touch pad", "boss through the bezel", 0.6, mm(0.6), true, "diametral, flush with the bezel top"),
  ];
}

/** The sense post from the floor to the comb, model.js line 478, through profile sectionResistance. */
export function touchPost(T: TouchParams, s: PipStack, profile: ProfileLookup) {
  const { top } = touchZ(T, s);
  const cplaZ = profile.resistivity("cpla", "through", "printed");
  const r = sectionResistance(cplaZ, top + T.bezel - s.z.floor, Math.PI * T.post ** 2);
  return { ohm: typeof r.ohm === "number" ? r.ohm : r.ohm[0], tiers: [r.tier] };
}

export function touchDerive(T: TouchParams, profile: ProfileLookup, machine = "ffc5p"): Record<string, DerivedValue> {
  const s = pipStack(profile, machine, { body: "petg", trace: "cpla" });
  const { top, zt0 } = touchZ(T, s);
  const c = touchCombs(T, s.bleed);
  const post = touchPost(T, s, profile);
  const out: Record<string, DerivedValue> = {
    top: dv(top, "mm", "snapUp(floor + 1.44, layer) unless top is set", s.tiers),
    combBottom: dv(zt0, "mm", "top + bezel - 0.72", s.tiers),
    fingers: dv(c.fingers, "count", "fingers left after those the disc would cut off their spine", []),
    "R.post": dv(post.ohm, "ohm", "rhoZ (top + bezel - floor) / (pi post^2)", post.tiers),
  };
  for (const r of touchFits(T)) if (r.n !== null) out[`fits.${r.name}`] = dv(r.n, r.unit ?? "mm", `${r.group}: ${r.name}`, []);
  return out;
}

export function touchApply(input: ApplyIn<TouchParams>, id: string): ApplyOut {
  const T = input.params;
  const s = pipStack(input.profile, input.draft.machine, { body: "petg", trace: "cpla" });
  const f = frameOf(input.face, id);
  if (Math.abs(f.z - s.z.floor) > 1e-6) {
    throw commandError({ code: "E_SCHEMA", path: "/face/origin/2", got: f.z, expected: `the stack floor ${s.z.floor.toFixed(2)} mm`, hint: `place ${id} on the stack floor face, where the pads sit flush` });
  }
  const { need, top, zbt, zt0 } = touchZ(T, s);
  if (top < need - 1e-9) {
    throw commandError({ code: "E_SCHEMA", path: "/params/top", got: top, expected: `at least ${need.toFixed(2)} mm`, hint: `raise the host top to ${snapUp(need, s.layer).toFixed(2)} mm or leave top 0` });
  }
  const e = new Emit(f, s);
  const c = touchCombs(T, s.bleed);
  // The boss through the bezel (model.js line 115), a PETG body on the host top.
  e.body("boss", "petg", e.prism(circle(T.d / 2, [0, 0], 64), top - EZ, zbt));
  e.conductor("conductor.comb", T.net, c.sense, zt0, zbt + EZ, c.fw);
  e.conductor("conductor.combCommon", T.common, c.drive, zt0, zbt + EZ, c.fw);
  // Spine posts down to the floor (model.js lines 131 to 132), then the routed terminals under them (layout.js line 381).
  e.conductor("conductor.rise", T.net, circle(T.post, [-c.xs, 0], 20), s.z.floor - EZ, zt0 + EZ, 2 * T.post);
  e.conductor("conductor.riseCommon", T.common, circle(T.post, [c.xs, 0], 20), s.z.floor - EZ, zt0 + EZ, 2 * T.post);
  e.terminal("", T.net, [-c.xs, 0], T.post);
  e.terminal("Common", T.common, [c.xs, 0], T.post);

  e.feature({ kind: "port", id: "port.key", net: T.net, type: "signal", interface: "touch" });
  e.feature({ kind: "port", id: "port.common", net: T.common, type: "power", interface: "touch" });

  e.metric("host.top", top, "mm", "host top the key was placed under: the floor need snapped up a layer, or the top asked for", s.tiers);
  e.metric("key.fingers", c.fingers, "count", `${c.fingers} fingers, ${T.finger} mm wide at ${T.finger + T.gap} mm pitch`, []);
  const post = touchPost(T, s, input.profile);
  e.metric("key.R.post", post.ohm, "ohm", "sense post from the floor to the comb (model.js line 478)", post.tiers);
  const rows = touchFits(T);
  for (const r of rows) e.metrics.push(fitMetric("key", r, []));
  e.warnings.push(...fitWarnings(rows));
  return e.out();
}
