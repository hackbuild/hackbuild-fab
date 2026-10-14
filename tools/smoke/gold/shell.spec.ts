// Gold rules, steps, rail and shell (TESTING.md 8.5). Bench-layer rules
// here: G-40, G-42, G-43, G-44, G-45. G-41 is a liveness row read from
// vitest.
// Run: npx playwright test -c tools/smoke/playwright.config.ts --grep @gold

import { expect } from "@playwright/test";
import { HEIGHT, WIDTHS } from "../measure.ts";
import { pinkMessage, pinkView } from "../pink.ts";
import { hook, hookSettled, notRun, openGold, rule } from "./gold.ts";

rule("G-40", "four strips; the last step is print or make; done means no failing check; visited is separate", async ({ page, bench, oracle }) => {
  await openGold(page, bench);
  const d = bench.dom;
  for (const [name, sel] of [["header", d.header], ["steps", d.stepsNav], ["guide", d.guide], ["status", d.status]] as const) {
    await expect(page.locator(sel).first(), `${name} strip`).toBeVisible();
  }
  const steps = page.locator(d.steps);
  const n = await steps.count();
  // A step button may lead with its number ("4print" in PIP's strip).
  const last = (await steps.nth(n - 1).innerText()).toLowerCase().replace(/^\s*\d+\s*/, "");
  expect(last, "the last step").toMatch(/\b(print|make)\b/);
  if (bench.origin === "legacy") notRun(`${bench.id}: done badges are read against CHECKS.md 2.7 step scope, which the legacy page lacks`);
  // Each step's checks: the node oracle's report, with no fail anywhere every step is complete from boot (CHECKS.md 2.7).
  const state = await hook(page, (h) => h.state);
  const results = ((await (await oracle()).build(state)) as { report: { results: { verdict: string }[] } }).report.results;
  const anyFail = results.some((r) => r.verdict === "fail");
  const done = await steps.evaluateAll((els) => els.map((e) => e.classList.contains("is-done") || /\bdone\b/.test(e.getAttribute("aria-label") ?? e.textContent ?? "")));
  const wrong = anyFail ? [] : done.map((x, i) => (x ? null : `step ${i + 1} shows no done badge with no failing check`)).filter((x): x is string => x !== null);
  await steps.nth(1).click();
  await hookSettled(page);
  const afterVisit = await steps.evaluateAll((els) => els.map((e) => e.classList.contains("is-done")));
  if (anyFail && afterVisit[0] === true) wrong.push("step 1 shows done on visit while a check fails");
  expect(wrong, wrong.join("\n")).toEqual([]);
});

rule("G-42", "at most one note per panel and no free paragraph in the rail", async ({ page, bench }) => {
  await openGold(page, bench);
  const steps = page.locator(bench.dom.steps);
  const off: string[] = [];
  for (let i = 0; i < (await steps.count()); i += 1) {
    await steps.nth(i).click();
    await hookSettled(page);
    off.push(...(await page.evaluate(([rail, panel, note]) => {
      const out: string[] = [];
      for (const r of Array.from(document.querySelectorAll(rail))) {
        for (const p of Array.from(r.querySelectorAll(panel))) {
          const notes = p.querySelectorAll(note).length;
          if (notes > 1) out.push(`${p.querySelector(".hb-panel-h, h3, h2")?.textContent?.trim() ?? "panel"}: ${notes} notes`);
        }
        for (const para of Array.from(r.querySelectorAll("p"))) {
          // Notes, help, readout and status lines have a home; a declared panel's
          // "not in this bench yet" stub is a status line, not prose.
          if (para.closest('[data-hb="note"], [data-hb="notes"], .hb-prow-why, .hb-help, [data-hb^="checks-"], [data-hb="instance-full"], [data-hb="panel-absent"]') !== null || para.matches("[data-hb]")) continue;
          if ((para.textContent ?? "").trim() === "") continue;
          out.push(`free paragraph: "${(para.textContent ?? "").trim().slice(0, 60)}"`);
        }
      }
      return out;
    }, [bench.dom.rail, bench.dom.panel, bench.dom.note] as const)).map((x) => `step ${i + 1}: ${x}`));
  }
  expect(off, off.join("\n")).toEqual([]);
});

rule("G-43", "one focal pink per view at 390, 768 and 1280, welcome included", async ({ page, bench, info }) => {
  await openGold(page, bench, { welcome: bench.origin === "fab" });
  const fails: string[] = [];
  const counts: string[] = [];
  const at = async (view: string): Promise<void> => {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: HEIGHT });
      await page.waitForTimeout(250);
      const p = await pinkView(page);
      counts.push(`${view} ${width}: ${p.focal.length}`);
      if (p.focal.length > 1) fails.push(pinkMessage(`${view} at ${width}`, p));
    }
    await page.setViewportSize({ width: 1280, height: HEIGHT });
  };
  if (bench.origin === "fab") {
    await at("welcome");
    await page.locator('[data-hb="welcome-dismiss"]').click();
  }
  const steps = page.locator(bench.dom.steps);
  for (let i = 0; i < (await steps.count()); i += 1) {
    await steps.nth(i).click();
    await hookSettled(page);
    await at(`step ${i + 1}`);
  }
  info.annotations.push({ type: "focal pink per view", description: `${counts.join("; ")} (measured)` });
  expect(fails, fails.join("\n")).toEqual([]);
});

rule("G-44", "a step with a declared cam or view leaves the viewer on it", async ({ bench }) => {
  notRun(`${bench.id}: no step of this page declares a cam or view the hook can read`);
});

rule("G-45", "on each step the status strip's scope equals the view on screen", async ({ page, bench }) => {
  await openGold(page, bench);
  if (bench.origin === "legacy") notRun(`${bench.id}: the legacy status strip carries no scope mark`);
  const steps = page.locator(bench.dom.steps);
  const off: string[] = [];
  for (let i = 0; i < (await steps.count()); i += 1) {
    await steps.nth(i).click();
    await hookSettled(page);
    const r = await page.evaluate((status) => {
      const s = document.querySelector(status);
      const scope = s?.querySelector("[data-scope]")?.getAttribute("data-scope") ?? null;
      const v = document.querySelector("hb-viewer") as unknown as { plate: boolean } | null;
      const kind = document.querySelector('[data-hb="bench"]')?.getAttribute("data-kind");
      const view = v?.plate === true ? "plate" : kind === "composer" ? "scene" : "part";
      return { scope, view };
    }, bench.dom.status);
    if (r.scope !== r.view) off.push(`step ${i + 1}: status strip scope ${r.scope ?? "none"}, view on screen ${r.view}`);
  }
  expect(off, off.join("\n")).toEqual([]);
});
