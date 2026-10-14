// src/trig.ts, the fdlibm port the SLUG solver calls (CI-03). Expected
// values come from outside the code under test: the three arguments where
// Node 22.18.0 on macOS arm64 and on Linux x64 returned different Math
// results in one SLUG trial, with the Linux x64 value (the fdlibm C
// result), and a sweep hash computed by this port in Node 22.18.0 on an
// Apple M1 (arm64) and in the node:22.18.0-bookworm-slim linux/amd64
// image (x64), equal on both (computed 2026-10-14). The host's Math gives
// the 1 ulp bound.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { createPrng } from "../src/prng.js";
import { atan, atan2, cos, sin, tan, TRIG_ARG_LIMIT } from "../src/trig.js";

/** sha256 of the sweep below, computed on arm64 and x64. */
const SWEEP_SHA256 = "b6d186469c8903724b1e87699da8a9e40df83b403a42c099d578b74275cec780";

const bits = new Float64Array(1);
const asInt = new BigInt64Array(bits.buffer);
/** Distance in units in the last place between two finite doubles of one sign. */
function ulps(a: number, b: number): bigint {
  bits[0] = a; const x = asInt[0]!;
  bits[0] = b; const y = asInt[0]!;
  return x > y ? x - y : y - x;
}

describe("fdlibm trigonometry in double arithmetic (CI-03)", () => {
  test("the three arguments that split x64 and arm64 in a SLUG trial give the fdlibm value", () => {
    expect(atan2(45.90391011678176, -12.601192711786767)).toBe(1.8387091669450373);
    expect(cos(4.988591168969966)).toBe(0.27270375703659977);
    expect(sin(3.4980861760661393)).toBe(-0.3489903731519864);
  });

  test("a seeded sweep of 80000 calls hashes as it did on arm64 and x64, each within 1 ulp of the host's Math", () => {
    const rng = createPrng(1);
    const h = createHash("sha256");
    const put = (v: number): void => { bits[0] = v; h.update(new Uint8Array(bits.buffer)); };
    let worst = 0n;
    const near = (a: number, b: number): void => { const d = ulps(a, b); if (d > worst) worst = d; };
    for (let i = 0; i < 20000; i++) {
      const x = (rng.next() * 2 - 1) * 2 ** (Math.floor(rng.next() * 44) - 24);
      const s = sin(x), c = cos(x), t = tan(x);
      put(s); put(c); put(t);
      near(s, Math.sin(x)); near(c, Math.cos(x)); near(t, Math.tan(x));
      const y = rng.next() * 2 - 1, xx = (rng.next() * 2 - 1) * 2 ** (Math.floor(rng.next() * 8) - 4);
      const a = atan2(y, xx);
      put(a);
      near(a, Math.atan2(y, xx));
    }
    expect(h.digest("hex")).toBe(SWEEP_SHA256);
    expect(worst <= 1n).toBe(true);
  });

  test("edges: zeros keep their sign, infinities give NaN or the quadrant angle", () => {
    expect(Object.is(sin(-0), -0)).toBe(true);
    expect(cos(0)).toBe(1);
    expect(Object.is(tan(-0), -0)).toBe(true);
    for (const f of [sin, cos, tan]) { expect(f(Infinity)).toBeNaN(); expect(f(NaN)).toBeNaN(); }
    expect(atan2(0, -1)).toBe(Math.PI);
    expect(atan2(-0, -1)).toBe(-Math.PI);
    expect(atan2(1, 0)).toBe(Math.PI / 2);
    expect(atan2(Infinity, -Infinity)).toBe(3 * Math.PI / 4);
    expect(atan2(1, 1)).toBe(Math.PI / 4);
    expect(atan(Infinity)).toBe(Math.PI / 2);
    expect(atan2(NaN, 1)).toBeNaN();
  });

  test("past 2^20 pi/2 the call stops naming the limit", () => {
    expect(sin(TRIG_ARG_LIMIT)).toBeCloseTo(Math.sin(TRIG_ARG_LIMIT), 12);
    expect(() => sin(TRIG_ARG_LIMIT * 2)).toThrow(/legal \|x\| up to 1647099/);
    expect(() => cos(-1e9)).toThrow(RangeError);
  });

  // A host Math call at a site whose arguments happen to agree on the
  // machine running the tests changes no trial hash there, so the record
  // tests cannot see it; the sources can.
  test("the capsule solver calls no host Math sine, cosine, tangent or arc function", () => {
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "capsule");
    const files = readdirSync(dir).filter((n) => n.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(readFileSync(path.join(dir, f), "utf8"), f).not.toMatch(/Math\.(a?sin|a?cos|a?tan2?|sinh|cosh|tanh)\(/);
  });
});
