// `npm test -w packages/<name>` runs vitest from the package, where the
// root config does not apply. This carries the root timeout floor for that run.

import { defineConfig } from "vitest/config";
import { testTimeout } from "../../vitest.config.ts";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    testTimeout,
  },
});
