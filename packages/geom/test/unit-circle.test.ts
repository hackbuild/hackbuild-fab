// D-175: geometry generators take unit-circle points from the committed
// table and never call Math.cos or Math.sin. The table is regenerated here
// and compared byte for byte; Math.cos and Math.sin appear below only as an
// oracle for the values, never in the code under test.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { isThrownCommandError, type Ring, type Vec2 } from "@hackbuild/spec";
import { ATTEMPTS, ROTATION, ROTATION_STEP, UNIT_CIRCLE_MAX_SEGMENTS, UNIT_CIRCLE_MIN_SEGMENTS, circleRing, q, rrect, rrectRing, snapRing, unitCircle } from "../src/index.js";
import { EARCUT_ROTATION_TABLE } from "../src/unit-circle.table.js";
// @ts-expect-error the generator is plain ESM without declarations
import { committed, earcutRotation, exactCosSin, foldKey, generate, tableKeys } from "../scripts/unit-circle.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ULP1 = 2 ** -52;

/** The M-S formula Author.ring.circle used before the table, kept as the regression oracle. */
function trigCircle(r: number, at: Vec2, n: number): Ring {
  return Array.from({ length: n }, (_, i): Vec2 => {
    const a = (2 * Math.PI * i) / n;
    return [q(at[0] + r * Math.cos(a)), q(at[1] + r * Math.sin(a))];
  });
}

function codeOf(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf.code;
    throw e;
  }
  throw new Error("expected a CommandError");
}

describe("committed table (D-175)", () => {
  test("regenerating the table gives the committed file byte for byte", () => {
    expect(generate()).toBe(committed());
  });

  test("every key a ring of 3 to 256 points reads has a row", () => {
    const keys = new Set((tableKeys() as [number, number][]).map(([qq, p]) => `${qq}/${p}`));
    for (let n = UNIT_CIRCLE_MIN_SEGMENTS; n <= UNIT_CIRCLE_MAX_SEGMENTS; n++) {
      for (let i = 0; i < n; i++) {
        const { p, q: qq } = foldKey(i, n) as { p: number; q: number };
        expect(keys.has(`${qq}/${p}`)).toBe(true);
      }
    }
  });

  test("every row is within one ulp of Math.cos and Math.sin and on the unit circle", () => {
    for (const [qq, p] of tableKeys() as [number, number][]) {
      const [c, s] = exactCosSin(p, qq) as [number, number];
      const a = (2 * Math.PI * p) / qq;
      expect(Math.abs(c - Math.cos(a))).toBeLessThanOrEqual(ULP1);
      expect(Math.abs(s - Math.sin(a))).toBeLessThanOrEqual(ULP1);
      expect(Math.abs(c * c + s * s - 1)).toBeLessThanOrEqual(2 * ULP1);
    }
  });

  test("the earcut rotation rows follow earcut.ts and sit within one ulp of Math.cos and Math.sin", () => {
    expect(earcutRotation()).toEqual({ rotation: ROTATION, step: ROTATION_STEP, attempts: ATTEMPTS });
    expect(EARCUT_ROTATION_TABLE).toHaveLength(2 * ATTEMPTS);
    for (let k = 0; k < ATTEMPTS; k++) {
      const a = ROTATION + k * ROTATION_STEP;
      expect(Math.abs(EARCUT_ROTATION_TABLE[2 * k]! - Math.cos(a))).toBeLessThanOrEqual(ULP1);
      expect(Math.abs(EARCUT_ROTATION_TABLE[2 * k + 1]! - Math.sin(a))).toBeLessThanOrEqual(ULP1);
    }
  });

  test("exact values come out exact: cos 0, sin 30 degrees, the eighth turn", () => {
    expect(unitCircle(0, 12)).toEqual([1, 0]);
    expect(unitCircle(1, 12)[1]).toBe(0.5);
    expect(unitCircle(2, 12)[0]).toBe(0.5);
    expect(unitCircle(3, 12)).toEqual([0, 1]);
    const [c, s] = unitCircle(1, 8);
    expect(c).toBe(s);
    expect(Object.is(unitCircle(2, 4)[1], -0)).toBe(false);
    expect(Object.is(unitCircle(3, 4)[0], -0)).toBe(false);
  });
});

describe("generators read the table", () => {
  test("no source file in packages/geom/src calls Math.cos, Math.sin or Math.tan", () => {
    const src = path.join(here, "..", "src");
    for (const f of readdirSync(src).filter((x) => x.endsWith(".ts"))) {
      const text = readFileSync(path.join(src, f), "utf8");
      expect(text, f).not.toMatch(/Math\.(cos|sin|tan)\s*\(/);
    }
  });

  test("rings are exactly symmetric about the x axis, and about the diagonals when n is a multiple of 4", () => {
    for (let n = UNIT_CIRCLE_MIN_SEGMENTS; n <= UNIT_CIRCLE_MAX_SEGMENTS; n++) {
      for (let i = 1; i < n; i++) {
        const [c, s] = unitCircle(i, n);
        const [cm, sm] = unitCircle(n - i, n);
        expect(cm).toBe(c);
        expect(sm).toBe(s === 0 ? 0 : -s);
        if (n % 4 === 0) {
          const [cr, sr] = unitCircle(i + n / 4, n);
          expect(cr).toBe(s === 0 ? 0 : -s);
          expect(sr).toBe(c);
        }
      }
    }
  });

  test("index wraps modulo n", () => {
    expect(unitCircle(-1, 7)).toEqual(unitCircle(6, 7));
    expect(unitCircle(9, 7)).toEqual(unitCircle(2, 7));
  });

  test("circleRing at 3 to 256 points snaps to the same grid points as the M-S trig formula", () => {
    for (const [r, at] of [[10, [0, 0]], [0.75, [3.25, -1.5]], [2.6, [12.7, 8.4]], [22.5, [-31, 4.2]]] as const) {
      for (let n = UNIT_CIRCLE_MIN_SEGMENTS; n <= UNIT_CIRCLE_MAX_SEGMENTS; n++) {
        expect(circleRing(r, at, n)).toEqual(trigCircle(r, at, n));
      }
    }
  });

  test("circleRing defaults to circularSegments and starts on +x", () => {
    expect(circleRing(5)).toHaveLength(48);
    expect(circleRing(0.1)).toHaveLength(4);
    expect(circleRing(5, [1, 2], 6)[0]).toEqual([6, 2]);
  });

  test("rrectRing corners snap to the same points as the trig formula it replaced", () => {
    const trigRRect = (cx: number, cy: number, a: number, b: number, rc: number, quarter: number): Ring => {
      const out: Vec2[] = [];
      for (const [ox, oy, t0] of [[a - rc, -(b - rc), -Math.PI / 2], [a - rc, b - rc, 0], [-(a - rc), b - rc, Math.PI / 2], [-(a - rc), -(b - rc), Math.PI]] as const) {
        for (let i = 0; i <= quarter; i++) {
          const t = t0 + (i * (Math.PI / 2)) / quarter;
          out.push([q(cx + ox + rc * Math.cos(t)), q(cy + oy + rc * Math.sin(t))]);
        }
      }
      return out;
    };
    for (const [cx, cy, a, b, rc] of [[0, 0, 30, 20, 4], [5.5, -2, 12, 7, 1.25], [0, 0, 22, 15.84, 6.6]] as const) {
      for (const quarter of [1, 2, 8, 12, 64]) {
        expect(snapRing(rrectRing(rrect(cx, cy, a, b, rc), 4 * quarter))).toEqual(trigRRect(cx, cy, a, b, rc, quarter));
      }
    }
  });

  test("a point count outside 3 to 256 is E_SCHEMA", () => {
    expect(codeOf(() => circleRing(5, [0, 0], 2))).toBe("E_SCHEMA");
    expect(codeOf(() => circleRing(5, [0, 0], 257))).toBe("E_SCHEMA");
    expect(codeOf(() => circleRing(5, [0, 0], 7.5))).toBe("E_SCHEMA");
    expect(codeOf(() => unitCircle(0.5, 8))).toBe("E_SCHEMA");
    expect(codeOf(() => rrectRing(rrect(0, 0, 10, 10, 2), 260))).toBe("E_SCHEMA");
  });
});
