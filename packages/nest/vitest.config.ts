// `npm test -w packages/nest` runs vitest from packages/nest, where the root
// config does not apply. This carries the root timeout floor for that run.

import { defineConfig } from "vitest/config";
import { testTimeout } from "../../vitest.config.ts";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    testTimeout,
  },
});
