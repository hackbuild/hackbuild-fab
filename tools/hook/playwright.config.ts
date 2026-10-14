// BenchHook conformance (M09-T12), the D-214 error, refusal and clamp
// spec (M09-T11) and the roundtrip row against fixture pages. System
// Chrome, as M03 and the smoke suite run it; three benches at a time, each
// test under 9 minutes.
// Run: npx playwright test -c tools/hook/playwright.config.ts

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["conformance.spec.ts", "errors.spec.ts", "roundtrip.spec.ts"],
  workers: 3,
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  outputDir: "../../out/hook/test-results",
  globalSetup: "./global-setup.ts",
  globalTeardown: "./report.ts",
  use: { channel: "chrome", headless: true },
});
