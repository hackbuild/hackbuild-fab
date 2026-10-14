// What the four PIP buttons share (M06-T08): the buried stack read from
// profile, PIP's layer snapping, PIP's circle and rectangle polygons, the
// face frame each button is placed on, convex clipping, and the fits row.
//
// Source of record: originals/pip/files/haft-src (haft (9), D-222), with
// pip-controller b137deb as the published copy. layout.js lines 27 to 28
// (stack, route), 58 to 59 (snapUp, snapN), 166 to 171 (the z stack);
// geom.js lines 78 to 100 (circle with its half step rotation, rect,
// rectC, poly) and 120 to 127 (lathe, rotated half a step); model.js
// lines 8 (EZ) and 26 to 29 (bleed, sep). Every slab of the stack is a
// profile constant (stack.skin, stack.trace, stack.iso, stack.overL2),
// the layer the machine preset's layer height, and the bleed the profile
// bleed row (D-084, default 0).

import {
  commandError, qualify,
  type BuildWarning, type DerivedValue, type FaceFrame, type FitClassId, type Metric, type ProfileLookup, type Ring, type Tier, type Vec2,
} from "@hackbuild/spec";
import { horizontalFrame, unitCircle } from "@hackbuild/geom";

/** PIP's EZ (model.js line 8): the overlap that keeps a profile vertex off a cavity face, mm. */
export const EZ = 0.02;

/** PIP's buried stack and the machine layer it snaps to, mm. */
export interface PipStack {
  readonly machine: string;
  readonly layer: number;
  readonly skin: number;
  readonly trace: number;
  readonly iso: number;
  /** PETG over trace layer 2 up to the floor: the second isolation plus the pad layer. */
  readonly overL2: number;
  /** Trace width as routed, mm (route.w). */
  readonly w: number;
  /** How far each conductive edge is drawn back, mm (route.bleed, D-084). */
  readonly bleed: number;
  /** sep() moves a post radius this far off w / 2 when it lands within it (model.js line 28). */
  readonly postSep: number;
  /** A terminal's layer disc stands this far past its post (model.js line 41). */
  readonly discPad: number;
  /** Tiers of the profile rows read, for qualify(). */
  readonly tiers: readonly Tier[];
  readonly z: {
    readonly l1: readonly [number, number];
    readonly l2: readonly [number, number];
    readonly pl: readonly [number, number];
    readonly floor: number;
  };
}

/** The stack from profile on the draft's machine (layout.js lines 166 to 171, model.js lines 26 to 29). */
export function pipStack(profile: ProfileLookup, machine: string, materials: { readonly body: string; readonly trace: string }): PipStack {
  const c = (id: string) => profile.constant(id);
  const skin = c("stack.skin"), trace = c("stack.trace"), iso = c("stack.iso"), overL2 = c("stack.overL2");
  const w = c("stack.traceWidth"), postSep = c("route.postSep"), discPad = c("route.discPad");
  const preset = profile.machine(machine).presets[0];
  if (preset === undefined) {
    throw commandError({ code: "E_REF", path: `/machines/${machine}/presets`, got: machine, expected: "a machine with a process preset", hint: `give machine ${machine} a preset; the PIP stack snaps to its layer height` });
  }
  const bleed = profile.bleed(machine, materials.body, materials.trace);
  const l1: [number, number] = [skin.value, skin.value + trace.value];
  const l2: [number, number] = [l1[1] + iso.value, l1[1] + iso.value + trace.value];
  const floor = l2[1] + overL2.value;
  return {
    machine, layer: preset.layer, skin: skin.value, trace: trace.value, iso: iso.value, overL2: overL2.value,
    w: w.value, bleed: bleed.bleed, postSep: postSep.value, discPad: discPad.value,
    tiers: [skin, trace, iso, overL2, w, postSep, discPad].map((r) => r.provenance.tier).concat([bleed.provenance.tier]),
    z: { l1, l2, pl: [l2[1] + iso.value, floor], floor },
  };
}

/** layout.js line 58: up to the next multiple of q from the bed. */
export const snapUp = (v: number, q: number): number => Math.ceil(v / q - 1e-9) * q;
/** layout.js line 59: the nearest multiple of q from the bed. */
export const snapN = (v: number, q: number): number => Math.round(v / q) * q;

/** model.js line 28: a post radius within postSep of w / 2 moves off it, then loses half the bleed. */
export function sep(s: PipStack, r: number): number {
  return (Math.abs(r - s.w / 2) < s.postSep ? s.w / 2 + s.postSep : r) - s.bleed / 2;
}

/**
 * geom.js line 76, segsFor: PIP's default circle point count for a radius.
 * SEG.n is P.seg, 40 at defaults (layout.js line 51, model.js line 12).
 */
export function segsFor(r: number, segN = 40): number {
  return Math.max(12, Math.min(96, Math.round(segN * Math.sqrt(Math.max(r, 0.2) / 3))));
}

/**
 * The placement frame on a horizontal upward face. Archetype coordinates
 * are (u, v) in the face, so a button rotates with face.u; z stays the
 * part's z, measured from the bed, as PIP measures it.
 */
export interface Frame {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Local (u, v) to part (x, y). */
  at(p: Vec2): Vec2;
  readonly ux: number;
  readonly uy: number;
}

export function frameOf(face: FaceFrame, id: string, place = "give it the floor face of the buried stack"): Frame {
  // one frame home (geom horizontalFrame): a tilted face and a non-unit u are both E_SCHEMA here
  const h = horizontalFrame(face, "/face", { code: "E_SCHEMA", hint: `archetype ${id} places on an upward horizontal face; ${place}` });
  const [x, y, z] = h.basis.origin;
  const [ux, uy] = h.basis.u;
  return { x, y, z, ux, uy, at: h.at };
}

/** geom.js line 79: a circle of n points rotated half a step, from the D-175 table, local (u, v). */
export function circle(r: number, c: Vec2, n: number): Vec2[] {
  return Array.from({ length: n }, (_, i): Vec2 => {
    const [cs, sn] = unitCircle(2 * i + 1, 2 * n);
    return [c[0] + r * cs, c[1] + r * sn];
  });
}

/** geom.js line 84: an axis-aligned rectangle, counter-clockwise. */
export function rect(x0: number, y0: number, x1: number, y1: number): Vec2[] {
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

/** Rotation by a turn fraction i / n from the D-175 table: [cos, sin]. */
export const turn = (i: number, n: number): Vec2 => unitCircle(i, n);

/** geom.js line 85, rectC: a w x h rectangle centred at c, turned by (cos, sin). */
export function rectC(c: Vec2, w: number, h: number, cs: number, sn: number): Vec2[] {
  return ([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as const).map(([u, v]): Vec2 => [c[0] + u * cs - v * sn, c[1] + u * sn + v * cs]);
}

/** Signed area times two; positive counter-clockwise. */
export function area2(ring: readonly Vec2[]): number {
  let a = 0;
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length] as Vec2;
    a += p[0] * q[1] - q[0] * p[1];
  });
  return a;
}

/** geom.js line 88, poly: a ring wound counter-clockwise. */
export function ccw(ring: readonly Vec2[]): Vec2[] {
  return area2(ring) < 0 ? [...ring].reverse() : [...ring];
}

/** Sutherland-Hodgman clip of a ring by the half plane a x + b y <= c. */
export function clipHalf(ring: readonly Vec2[], a: number, b: number, c: number): Vec2[] {
  const out: Vec2[] = [];
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length] as Vec2;
    const dp = a * p[0] + b * p[1] - c;
    const dq = a * q[0] + b * q[1] - c;
    if (dp <= 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
      const t = dp / (dp - dq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  });
  return out;
}

/** A ring clipped to an axis-aligned rectangle (the intersect of a convex region with a rect). */
export function clipRect(ring: readonly Vec2[], x0: number, y0: number, x1: number, y1: number): Vec2[] {
  let r = clipHalf(ring, -1, 0, -x0);
  r = clipHalf(r, 1, 0, x1);
  r = clipHalf(r, 0, -1, -y0);
  return clipHalf(r, 0, 1, y1);
}

/** Local ring to part coordinates through the frame. */
export const place = (f: Frame, ring: readonly Vec2[]): Ring => ring.map((p) => f.at(p));

/** A derived output, computed over the tiers of the rows it read; null marks a row it needed and did not find (spec qualify, D-007). */
export function dv(value: number, unit: string, equation: string, tiers: readonly (Tier | null)[]): DerivedValue {
  return { value, unit, equation, ...qualify(tiers) };
}

/** One PIP fits row (model.js line 512): the value as PIP prints it, ok, and the note. */
export interface FitRow {
  readonly group: string;
  readonly name: string;
  readonly value: string;
  readonly ok: boolean;
  readonly note: string;
  /** The number behind the printed value, in its unit; null for a text row. */
  readonly n: number | null;
  readonly unit: string | null;
}

/** model.js line 513: two decimals and " mm". */
export const mm = (v: number): string => `${v.toFixed(2)} mm`;

export function fitRow(group: string, name: string, n: number | null, value: string, ok: boolean, note = "", unit: string | null = "mm"): FitRow {
  return { group, name, value, ok, note, n, unit: n === null ? null : unit };
}

/** A fits row as a Part IR metric, informational, with the archetype's group. */
export function fitMetric(prefix: string, row: FitRow, tiers: readonly Tier[]): Metric {
  const slug = row.name.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    id: `${prefix}.fits.${slug}`, value: row.n ?? row.value, ...(row.unit === null ? {} : { unit: row.unit }), ...qualify(tiers),
    note: `${row.group}: ${row.name} ${row.value}${row.ok ? "" : " (not ok)"}${row.note === "" ? "" : `, ${row.note}`}`,
    gate: "informational", group: "fits",
  };
}

/** A warning when a fits row is not ok, as PIP warns (model.js line 610). */
export function fitWarnings(rows: readonly FitRow[]): BuildWarning[] {
  return rows.filter((r) => !r.ok).map((r) => ({ code: "FIT", text: `${r.group}: ${r.name} is ${r.value}${r.note === "" ? "" : `, ${r.note}`}` }));
}

/** The fit class every PIP well and slot declares: LOCATE, read from profile so an unknown class is E_REF. */
export function locateFit(profile: ProfileLookup): FitClassId {
  const id = "LOCATE" as FitClassId;
  profile.fit(id);
  return id;
}
