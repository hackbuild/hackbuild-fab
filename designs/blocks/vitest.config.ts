// `npm test -w designs/blocks` runs vitest from designs/blocks, where the
// root config does not apply. This carries the root timeout floor; the
// pretest `tsc -b` builds the packages the seats import.

import { defineConfig } from "vitest/config";
import { testTimeout } from "../../vitest.config.ts";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    testTimeout,
  },
});
