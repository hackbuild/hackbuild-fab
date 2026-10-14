// The seeded generator every M02 trial runner draws from (D-136): the
// Park-Miller minimal standard, state = state x 16807 mod (2^31 - 1), as PIP
// (was HAFT) test/sweep.mjs line 7 runs it. Seed 1 by default. The product
// stays below 2^53, so float arithmetic is exact on every architecture.

import { commandError } from "@hackbuild/spec";

export const PARK_MILLER_A = 16807;
export const PARK_MILLER_M = 2147483647;

export interface Prng {
  /** Next state, an integer 1 to 2^31 - 2. */
  nextInt(): number;
  /** Next state over the modulus, in (0, 1); the value sweep.mjs rnd() returns. */
  next(): number;
}

export function createPrng(seed = 1): Prng {
  if (!Number.isInteger(seed) || seed < 1 || seed >= PARK_MILLER_M) {
    throw commandError({ code: "E_SCHEMA", path: "/seed", got: String(seed), expected: `an integer 1 to ${PARK_MILLER_M - 1}`, hint: "seed 0 or a multiple of the modulus sticks at 0; pass an integer seed from 1" });
  }
  let state = seed;
  const nextInt = (): number => {
    state = (state * PARK_MILLER_A) % PARK_MILLER_M;
    return state;
  };
  return { nextInt, next: () => nextInt() / PARK_MILLER_M };
}
