// Rounded and chamfered corners of an (r, z) revolve profile (PLAN.md 3.3
// "round parts in the revolve profile"; geometry-strategy.md section 6 item
// 5). Ports the TENON tip fillet (part2.js buildTip, lines 414 to 418: the
// flat face, then n points on a quarter circle of radius rf round to the
// rim) for any corner angle, and the OGEE16 hub root fillet (printed.scad
// knob_hub, lines 318 to 321: a cone d1 HUB_D + 3 to d2 HUB_D over 1.5, a
// 45 deg flat across the root corner) as a chamfer set back c along both
// legs. Points are not snapped; the revolve route snaps and welds (D-054).
// cos and sin come from the D-175 table, never Math.cos or Math.sin, so a
// profile gives one meshHash in node and WebKit.

import type { Mm, Vec2 } from "@hackbuild/spec";
import { geomError } from "./cs.js";
import { UNIT_CIRCLE_MAX_SEGMENTS, unitCircle } from "./unit-circle.js";

interface Corner {
  readonly p: Vec2;
  /** Unit vectors from the corner along the incoming and outgoing legs. */
  readonly u1: Vec2;
  readonly u2: Vec2;
  /** Leg lengths, mm. */
  readonly l1: Mm;
  readonly l2: Mm;
  /** cos and sin of the angle between the legs; sin carries the turn sign. */
  readonly cos: number;
  readonly sin: number;
}

function corner(points: readonly Vec2[], i: number): Corner {
  const n = points.length;
  if (n < 3 || !Number.isInteger(i) || i < 0 || i >= n) {
    throw geomError({ code: "E_SCHEMA", path: "/index", got: { i, points: n }, expected: "a point index of a loop of 3 or more points", hint: "name an existing corner of the profile" });
  }
  const p = points[i]!, a = points[(i + n - 1) % n]!, b = points[(i + 1) % n]!;
  const l1 = Math.hypot(a[0] - p[0], a[1] - p[1]), l2 = Math.hypot(b[0] - p[0], b[1] - p[1]);
  const u1: Vec2 = [(a[0] - p[0]) / l1, (a[1] - p[1]) / l1], u2: Vec2 = [(b[0] - p[0]) / l2, (b[1] - p[1]) / l2];
  const cos = u1[0] * u2[0] + u1[1] * u2[1], sin = u1[0] * u2[1] - u1[1] * u2[0];
  if (!(l1 > 0 && l2 > 0) || Math.abs(sin) < 1e-9) {
    throw geomError({ code: "E_SCHEMA", path: `/points/${i}`, got: p, expected: "a corner between two legs of nonzero length that are not in line", hint: "drop the duplicate or straight point, or pick a real corner" });
  }
  return { p, u1, u2, l1, l2, cos, sin };
}

function setback(c: Corner, t: Mm, i: number): void {
  if (!(t < c.l1 && t < c.l2)) {
    throw geomError({ code: "E_UNSAT", path: `/points/${i}`, got: { setback: t, legs: [c.l1, c.l2] }, expected: "a setback shorter than both legs of the corner", hint: "shrink the radius or chamfer, or lengthen the legs" });
  }
}

/**
 * Corner i replaced by n + 1 points on the circle of radius r tangent to
 * both legs, from the tangent point on the incoming leg to the one on the
 * outgoing leg. n must make the step a whole fraction of a turn of at most
 * UNIT_CIRCLE_MAX_SEGMENTS parts (a 90 deg corner takes any n up to 64).
 */
export function roundCorner(points: readonly Vec2[], i: number, r: Mm, n: number): Vec2[] {
  if (!(Number.isFinite(r) && r > 0)) throw geomError({ code: "E_SCHEMA", path: "/r", got: r, expected: "a positive radius in mm", hint: "give the corner a positive radius" });
  const c = corner(points, i);
  // tan(theta / 2) = sin / (1 + cos), theta the angle between the legs.
  const t = (r * (1 + c.cos)) / Math.abs(c.sin);
  setback(c, t, i);
  // m points per turn with sweep pi - theta in n steps; atan2 only picks m, the points read the table.
  const m = (2 * Math.PI * n) / (Math.PI - Math.atan2(Math.abs(c.sin), c.cos));
  const mi = Math.round(m);
  if (!(Number.isInteger(n) && n >= 1) || Math.abs(m - mi) > 1e-6 || mi > UNIT_CIRCLE_MAX_SEGMENTS) {
    throw geomError({ code: "E_SCHEMA", path: "/n", got: n, expected: `a whole step count whose step is a turn fraction of at most ${UNIT_CIRCLE_MAX_SEGMENTS} parts`, hint: "for a 90 deg corner use 1 to 64 steps; for other angles a count that divides the sweep into table steps" });
  }
  const s = Math.sign(c.sin);
  const t1: Vec2 = [c.p[0] + c.u1[0] * t, c.p[1] + c.u1[1] * t];
  const t2: Vec2 = [c.p[0] + c.u2[0] * t, c.p[1] + c.u2[1] * t];
  const o: Vec2 = [t1[0] - s * r * c.u1[1], t1[1] + s * r * c.u1[0]];
  const v: Vec2 = [t1[0] - o[0], t1[1] - o[1]];
  // the arc turns opposite to the legs: from the incoming leg toward the outgoing one round the centre
  const dir = -s;
  const arc: Vec2[] = [t1];
  for (let k = 1; k < n; k++) {
    const [co, si0] = unitCircle(k, mi);
    const si = dir * si0;
    arc.push([o[0] + v[0] * co - v[1] * si, o[1] + v[0] * si + v[1] * co]);
  }
  arc.push(t2);
  return [...points.slice(0, i), ...arc, ...points.slice(i + 1)];
}

/** Corner i replaced by a flat set back c along both legs (two points). */
export function chamferCorner(points: readonly Vec2[], i: number, c: Mm): Vec2[] {
  if (!(Number.isFinite(c) && c > 0)) throw geomError({ code: "E_SCHEMA", path: "/c", got: c, expected: "a positive setback in mm", hint: "give the chamfer a positive setback" });
  const k = corner(points, i);
  setback(k, c, i);
  const a: Vec2 = [k.p[0] + k.u1[0] * c, k.p[1] + k.u1[1] * c];
  const b: Vec2 = [k.p[0] + k.u2[0] * c, k.p[1] + k.u2[1] * c];
  return [...points.slice(0, i), a, b, ...points.slice(i + 1)];
}
