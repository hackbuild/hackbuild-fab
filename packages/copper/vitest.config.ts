// `npm test -w packages/copper` runs vitest from packages/copper, where the
// root config does not apply. This carries the root timeout floor for that
// run; one sweep design routes in up to 8 s (computed, 2026-10-08) when
// three test files share the machine.

import { defineConfig } from "vitest/config";
import { testTimeout } from "../../vitest.config.ts";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    testTimeout,
  },
});
