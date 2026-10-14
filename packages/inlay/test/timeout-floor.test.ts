// `npm test -w packages/inlay` runs vitest from packages/inlay, where the
// root config does not apply. Under that run the split tests that replay
// COLLAR buildMesh took 5329 ms under load (measured, M03 verifier round 2)
// and failed the vitest default of 5000 ms; vitest.config.ts here carries the
// root 60000 ms floor.

import { expect, it } from "vitest";

it("a test with no timeout argument runs under the 60000 ms suite floor", (ctx) => {
  expect(ctx.task.timeout).toBe(60_000);
});
