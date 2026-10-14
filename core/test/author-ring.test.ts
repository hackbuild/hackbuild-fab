// Author.ring (spec/build.ts, D-175): circle and roundRect are geom's table
// generators, snapped, so the ring a build.ts draws in node is the ring the
// Chromium and WebKit legs hash. The Author keeps no trig of its own.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Chase, Ring, Vec2 } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { circleRing, isSnapped, q, rrect, rrectRing, snapRing } from "@hackbuild/geom";
import { AUTHOR_CIRCLE_SEGMENTS, AUTHOR_CORNER_SEGMENTS, makeAuthor } from "../src/author.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const chase = { meta: { id: "author-ring", machines: ["ffc5p"] }, materials: [], params: [] } as unknown as Chase;
const k = makeAuthor(chase, createProfileLookup(loadProfile()), []);

const snapped = (ring: Ring): boolean => ring.every(([x, y]) => isSnapped(x) && isSnapped(y));

describe("Author.ring reads the D-175 table", () => {
  it("author.ts calls no Math.cos, Math.sin or Math.tan", () => {
    const text = readFileSync(path.join(here, "..", "src", "author.ts"), "utf8");
    expect(text).not.toMatch(/Math\.(cos|sin|tan)\s*\(/);
  });

  it("circle is geom circleRing at the Author default of 64 points", () => {
    expect(AUTHOR_CIRCLE_SEGMENTS).toBe(64);
    expect(k.ring.circle(3.3, [12.5, -4])).toEqual(circleRing(3.3, [12.5, -4], 64));
    expect(k.ring.circle(10, undefined, 7)).toEqual(circleRing(10, [0, 0], 7));
    expect(snapped(k.ring.circle(3.3, [12.5, -4]))).toBe(true);
  });

  it("circle keeps the M-S grid points, so flex-pair geometry holds", () => {
    const trig = (r: number, at: Vec2, n: number): Ring => Array.from({ length: n }, (_, i): Vec2 => {
      const a = (2 * Math.PI * i) / n;
      return [q(at[0] + r * Math.cos(a)), q(at[1] + r * Math.sin(a))];
    });
    for (const [r, at, n] of [[1.4, [-11, 0], 64], [2.05, [11, 0], 64], [0.9, [0, 6.5], 32], [10, [0, 0], 256]] as const) {
      expect(k.ring.circle(r, at, n)).toEqual(trig(r, at, n));
    }
  });

  it("roundRect is geom rrectRing at 8 points per corner quarter, snapped", () => {
    expect(AUTHOR_CORNER_SEGMENTS).toBe(8);
    const ring = k.ring.roundRect(60, 40, 4, [1, 2]);
    expect(ring).toEqual(snapRing(rrectRing(rrect(1, 2, 30, 20, 4), 32)));
    expect(ring).toHaveLength(36);
    expect(snapped(ring)).toBe(true);
  });

  it("roundRect clamps a corner radius above half the short side and repeats no vertex", () => {
    const ring = k.ring.roundRect(10, 6, 5);
    expect(ring).toEqual(snapRing(rrectRing(rrect(0, 0, 5, 3, 3), 32)));
    const keys = ring.map(([x, y]) => `${x},${y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("a circle point count outside 3 to 256 is E_SCHEMA", () => {
    expect(() => k.ring.circle(5, [0, 0], 2)).toThrow(expect.objectContaining({ hbf: expect.objectContaining({ code: "E_SCHEMA", path: "/segments" }) }));
  });
});
