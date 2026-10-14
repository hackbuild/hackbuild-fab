// Unit-circle points from the committed table of D-175. Geometry generators
// read cos and sin here and never call Math.cos or Math.sin, because WebKit's
// trig is not bit-identical to V8's and a circle ring must give one meshHash
// in node, Chromium and WebKit. Every table value is the correctly rounded
// float64 (scripts/unit-circle.mjs), so the eight-way fold below is exact and
// a ring is symmetric about both axes and both diagonals wherever its point
// count allows.

import type { Mm, Ring, Vec2 } from "@hackbuild/spec";
import { geomError } from "./cs.js";
import { circularSegments } from "./rrect.js";
import { q } from "./snap.js";
import { UNIT_CIRCLE_MAX_SEGMENTS, UNIT_CIRCLE_MIN_SEGMENTS, UNIT_CIRCLE_TABLE } from "./unit-circle.table.js";

export { UNIT_CIRCLE_MAX_SEGMENTS, UNIT_CIRCLE_MIN_SEGMENTS } from "./unit-circle.table.js";

/** Largest table denominator, 8 * UNIT_CIRCLE_MAX_SEGMENTS; keys are q * KEY_BASE + p. */
const KEY_BASE = 8 * UNIT_CIRCLE_MAX_SEGMENTS + 1;

const TABLE: ReadonlyMap<number, readonly [number, number]> = (() => {
  const m = new Map<number, readonly [number, number]>();
  for (let k = 0; k < UNIT_CIRCLE_TABLE.length; k += 4) {
    m.set(UNIT_CIRCLE_TABLE[k]! * KEY_BASE + UNIT_CIRCLE_TABLE[k + 1]!, [UNIT_CIRCLE_TABLE[k + 2]!, UNIT_CIRCLE_TABLE[k + 3]!]);
  }
  return m;
})();

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/** Negation that never yields -0, so a hash sees one zero. */
function neg(v: number): number {
  return v === 0 ? 0 : -v;
}

/** Refuse a point count outside the table, E_SCHEMA. */
export function checkSegments(n: number, path = "/segments"): void {
  if (!Number.isInteger(n) || n < UNIT_CIRCLE_MIN_SEGMENTS || n > UNIT_CIRCLE_MAX_SEGMENTS) {
    throw geomError({
      code: "E_SCHEMA", path, got: n,
      expected: `an integer from ${UNIT_CIRCLE_MIN_SEGMENTS} to ${UNIT_CIRCLE_MAX_SEGMENTS}`,
      hint: `pass a point count from ${UNIT_CIRCLE_MIN_SEGMENTS} to ${UNIT_CIRCLE_MAX_SEGMENTS}; the committed unit-circle table covers that range (D-175)`,
    });
  }
}

/**
 * Point i of an n-point unit circle, [cos, sin] of the turn fraction i/n,
 * counter-clockwise from +x. n is an integer from UNIT_CIRCLE_MIN_SEGMENTS
 * to UNIT_CIRCLE_MAX_SEGMENTS; i is any integer and wraps modulo n.
 */
export function unitCircle(i: number, n: number): Vec2 {
  checkSegments(n);
  if (!Number.isInteger(i)) {
    throw geomError({ code: "E_SCHEMA", path: "/index", got: i, expected: "an integer point index", hint: "pass a whole point index; the table holds whole fractions of a turn" });
  }
  const m = ((i % n) + n) % n;
  const a = 8 * m;
  const o = Math.floor(a / n);
  const r = a - o * n;
  const num = o % 2 === 0 ? r : n - r;
  const den = 8 * n;
  const d = gcd(num, den);
  const v = TABLE.get((den / d) * KEY_BASE + num / d);
  if (v === undefined) throw new Error(`unit-circle table has no row ${num / d}/${den / d}; regenerate it with packages/geom/scripts/unit-circle.mjs`);
  const [c, s] = v;
  switch (o) {
    case 0: return [c, s];
    case 1: return [s, c];
    case 2: return [neg(s), c];
    case 3: return [neg(c), s];
    case 4: return [neg(c), neg(s)];
    case 5: return [neg(s), neg(c)];
    case 6: return [s, neg(c)];
    default: return [c, neg(s)];
  }
}

/**
 * Counter-clockwise circle of radius r, mm, centred at `at`, starting on +x,
 * each point snapped to the 1/1024 mm grid (D-054). segments is a count and
 * defaults to circularSegments(r), clamped up to UNIT_CIRCLE_MIN_SEGMENTS.
 */
export function circleRing(r: Mm, at: Vec2 = [0, 0], segments: number = Math.max(UNIT_CIRCLE_MIN_SEGMENTS, circularSegments(r))): Ring {
  checkSegments(segments);
  return Array.from({ length: segments }, (_, i): Vec2 => {
    const [c, s] = unitCircle(i, segments);
    return [q(at[0] + r * c), q(at[1] + r * s)];
  });
}
