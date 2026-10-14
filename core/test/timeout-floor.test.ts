// A test that runs a build without its own timeout gets the suite floor from
// vitest.config.ts, not the vitest default of 5000 ms. A cold build spawns a
// sandbox child and takes 4 to 6 s on the owner's machine with 21 test files
// in parallel, so a 5000 ms default failed export-warnings.test.ts in 5 of
// 8 runs (M00-T13 verifier round 2). The floor is the 60000 ms that the
// build tests in errors, store and build-sandbox already pass by hand; a
// test that needs more still passes its own value (gate.test.ts, 120000 ms).

import { expect, it } from "vitest";

it("a test with no timeout argument runs under the 60000 ms suite floor", (ctx) => {
  expect(ctx.task.timeout).toBe(60_000);
});

it("an explicit timeout argument still wins over the floor", (ctx) => {
  expect(ctx.task.timeout).toBe(120_000);
}, 120_000);
