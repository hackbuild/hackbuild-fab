// `npm test -w packages/sim` runs vitest from packages/sim, where the root
// vitest.config.ts does not apply, so a test with no timeout argument fell
// to the vitest default of 5000 ms. The sash-sweep all-pairs check timed out
// there under full-suite parallelism (99 s wall, load about 19, measured on
// the owner's MacBookAir10,1, M02 verifier round 2) while the root run, at
// the 60000 ms floor, passed it. packages/sim/vitest.config.ts carries the
// root floor; this test fails without it.

import { expect, it } from "vitest";

it("a test with no timeout argument runs under the root suite floor", (ctx) => {
  expect(ctx.task.timeout).toBe(60_000);
});

it("an explicit timeout argument still wins over the floor", (ctx) => {
  expect(ctx.task.timeout).toBe(120_000);
}, 120_000);
