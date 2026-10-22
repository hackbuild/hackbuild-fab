// `npm test -w core` runs vitest from core/, where the root config does not
// apply. This carries the same global setup and timeout floor for that run.

import { defineConfig } from "vitest/config";
import { testTimeout } from "../vitest.config.ts";

export default defineConfig({
  test: {
    globalSetup: ["test/global-setup.ts"],
    include: ["test/**/*.test.ts"],
    testTimeout,
    fsModuleCache: true,
  },
});
