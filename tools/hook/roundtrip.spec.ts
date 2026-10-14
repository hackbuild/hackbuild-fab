// The conformance roundtrip row against a fixture page (M09-T12): a page
// whose loadDesign drops a field fails for fab and legacy origins; an
// intact page passes the legacy compare though its designJson text moves,
// and fails the fab compare, which wants the exact text back.
// Run: npx playwright test -c tools/hook/playwright.config.ts roundtrip

import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { ROOT } from "./benches.ts";
import { roundtrip } from "./roundtrip.ts";

const FIXTURE = pathToFileURL(path.join(ROOT, "tools/hook/fixtures/roundtrip.html")).href;

const outcome = (p: Promise<void>): Promise<string> => p.then(() => "pass", (e: unknown) => (e instanceof Error ? e.message : String(e)));

test("a loadDesign that drops a field fails the roundtrip row, legacy and fab", async ({ page }) => {
  await page.goto(`${FIXTURE}?drop`);
  expect(await outcome(roundtrip(page, "legacy", 1000))).toBe("state after loadDesign differs from the state loaded");
  await page.goto(`${FIXTURE}?drop`);
  expect(await outcome(roundtrip(page, "fab", 1000))).toBe("designJson after loadDesign differs from the text loaded");
});

test("an intact loadDesign passes the legacy compare; a moving designJson fails the fab compare", async ({ page }) => {
  await page.goto(FIXTURE);
  expect(await outcome(roundtrip(page, "legacy", 1000))).toBe("pass");
  expect(await outcome(roundtrip(page, "fab", 1000))).toBe("designJson after loadDesign differs from the text loaded");
});
