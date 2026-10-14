// Touch targets at 390 (M09-T14 acceptance, UI.md section 11, G-54): on the
// welcome and on every step of each fab bake, every visible control is at
// least 44 x 44 px. The steps strip is selected as
// `nav[aria-label=steps] button`, never `[role=tab]`, so the test follows
// the strip itself and survives a role change in hackbuild-ui.
// Run: npx playwright test -c tools/smoke/playwright.config.ts targets.spec.ts

import { expect, test } from "@playwright/test";
import { startHost, type Host } from "./host-build.ts";
import { bakes, closeWelcome, HEIGHT, open, settled, smallTargets, stepButtons, writeReport, type SmallTarget } from "./measure.ts";

test.describe.configure({ timeout: 300_000 });

for (const bake of bakes().filter((b) => b.kind === "bench")) {
  test(`every target at least 44 x 44 px at 390 on ${bake.id}`, async ({ page }) => {
    test.skip(bake.host === null, `not run: ${bake.id} has no in-page build and no build host`);
    const host: Host = await startHost();
    try {
      await page.setViewportSize({ width: 390, height: HEIGHT });
      await open(page, bake, host);
      const small: Record<string, SmallTarget[]> = { welcome: await smallTargets(page) };
      await closeWelcome(page);
      const steps = stepButtons(page);
      const n = await steps.count();
      expect(n, "nav[aria-label=steps] button count").toBeGreaterThan(0);
      for (let i = 0; i < n; i += 1) {
        await steps.nth(i).click();
        await settled(page).catch(() => undefined);
        small[`step ${i + 1}`] = await smallTargets(page);
      }
      writeReport(`targets-${bake.id}.json`, { width: 390, floor: 44, qualifier: "measured", small });
      const lines = Object.entries(small).flatMap(([v, xs]) => xs.map((x) => `${v}: ${x.el} ${x.w} x ${x.h} px`));
      expect(lines, lines.join("\n")).toEqual([]);
    } finally {
      host.close();
    }
  });
}
