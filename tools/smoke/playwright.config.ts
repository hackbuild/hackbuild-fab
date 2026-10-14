// The smoke suite (M09-T14): system Chrome with swiftshader GL, as PIP
// test/smoke.py launches chromium. Project desktop runs the smoke specs at
// a 1280 px start; project touch-390 is hasTouch and isMobile at 390 x 844
// and runs the touch-only pass. With --grep @gold the same two projects run
// the gold specs instead (touch-tagged rules on touch-390) and the JSON
// reporter writes out/smoke/gold-playwright.json, which
// tools/gold/report.mjs reads (TESTING.md 8.5).
// Run: npx playwright test -c tools/smoke/playwright.config.ts
// Gold: npx playwright test -c tools/smoke/playwright.config.ts --grep @gold

import { defineConfig } from "@playwright/test";

const GL = ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"];
const gold = process.argv.some((a) => a.includes("@gold"));

export default defineConfig({
  testDir: ".",
  retries: 0,
  workers: 2,
  timeout: 300_000,
  outputDir: "../../out/smoke/test-results",
  reporter: [["list"], ["json", { outputFile: `../../out/smoke/${gold ? "gold-playwright" : "playwright"}.json` }]],
  use: { channel: "chrome", headless: true, launchOptions: { args: GL } },
  projects: [
    {
      name: "desktop",
      testMatch: gold ? ["gold/*.spec.ts"] : ["smoke.spec.ts", "legacy-report.spec.ts", "targets.spec.ts", "welcome.spec.ts", "rail.spec.ts", "drive.spec.ts", "page-build.spec.ts"],
      grepInvert: /@touch/,
      use: { viewport: { width: 1280, height: 844 } },
    },
    {
      name: "touch-390",
      testMatch: gold ? ["gold/*.spec.ts"] : ["touch.spec.ts"],
      grep: gold ? /@touch/ : /touch-only/,
      use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
    },
  ],
});
