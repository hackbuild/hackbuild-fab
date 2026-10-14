// M02-T01 step 5: the Park-Miller minimal standard generator. Expected values
// are published, not produced by the code under test: 16807 and 282475249
// are the first two states from seed 1 (the card's acceptance), and
// 1043618065 is the state after 10000 draws from seed 1, the check value in
// Park and Miller, "Random number generators: good ones are hard to find",
// CACM 31(10), 1988.

import { describe, expect, test } from "vitest";
import { isThrownCommandError } from "@hackbuild/spec";
import { createPrng } from "../src/prng.js";

function codeOf(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf.code;
    throw e;
  }
  return "none";
}

describe("Park-Miller minimal standard (M02-T01)", () => {
  test("seed 1 gives 16807 then 282475249 (computed, the published sequence)", () => {
    const p = createPrng(1);
    expect(p.nextInt()).toBe(16807);
    expect(p.nextInt()).toBe(282475249);
  });

  test("the default seed is 1", () => {
    const p = createPrng();
    expect(p.nextInt()).toBe(16807);
  });

  test("state after 10000 draws from seed 1 is 1043618065 (the 1988 check value)", () => {
    const p = createPrng(1);
    let x = 0;
    for (let i = 0; i < 10000; i += 1) x = p.nextInt();
    expect(x).toBe(1043618065);
  });

  test("next() is the state over 2^31 - 1, as PIP test/sweep.mjs rnd() returns", () => {
    const p = createPrng(1);
    expect(p.next()).toBe(16807 / 2147483647);
    expect(p.next()).toBe(282475249 / 2147483647);
  });

  test("two generators from one seed agree; seeds 1 and 2 differ", () => {
    const a = createPrng(7);
    const b = createPrng(7);
    const c = createPrng(8);
    const xs = Array.from({ length: 50 }, () => a.nextInt());
    expect(Array.from({ length: 50 }, () => b.nextInt())).toEqual(xs);
    expect(c.nextInt()).not.toBe(xs[0]);
  });

  test("seed 0, a negative, a fraction or the modulus is E_SCHEMA", () => {
    for (const s of [0, -1, 1.5, 2147483647, Number.NaN]) expect(codeOf(() => createPrng(s))).toBe("E_SCHEMA");
    expect(codeOf(() => createPrng(2147483646))).toBe("none");
  });
});
