// `npm test -w packages/sim` runs vitest from packages/sim, where the root
// config does not apply. This carries the root timeout floor for that run
// (test/timeout-floor.test.ts).

import { defineConfig } from "vitest/config";
import { testTimeout } from "../../vitest.config.ts";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    testTimeout,
  },
});
