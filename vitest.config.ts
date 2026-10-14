import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// A cold build spawns a sandbox child and took 4 to 6 s (measured) under a
// full parallel run; 60000 ms is the floor for a test without its own
// timeout (core/test/timeout-floor.test.ts). core/vitest.config.ts imports
// it, since `npm test -w core` runs vitest from core/ and never reads this
// file.
export const testTimeout = 60_000;

export default defineConfig({
  // packages/ui tests import single-file components (M09-T07).
  plugins: [vue()],
  test: {
    // tsc -b before any test, so tests never run against a stale dist (core/test/global-setup.ts).
    globalSetup: ["core/test/global-setup.ts"],
    testTimeout,
    include: ["spec/test/**/*.test.ts", "tools/test/**/*.test.ts", "tools/test-support/**/*.test.ts", "tools/parity/**/*.test.ts", "packages/*/test/**/*.test.ts", "reference/**/test/**/*.test.ts", "designs/**/test/**/*.test.ts", "core/test/**/*.test.ts"],
  },
});
