// Gold rules, warnings and checks (TESTING.md 8.5). Bench-layer rules
// here: G-33, G-36 and the hook half of G-37 (the static half, CHK-LNT-06,
// is tools/gold/static.mjs). G-34, G-35 and G-38 are chase-bound rows
// M10-T17 adds; G-32 is a contract row and G-39 a check row.
// The check report a fab bench shows is read independently from the node
// build host (tools/smoke/host-build.ts) for the same state, never from the
// page, which builds itself (D-264).
// Run: npx playwright test -c tools/smoke/playwright.config.ts --grep @gold

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { ROOT } from "../measure.ts";
import type { Host } from "../host-build.ts";
import { chaseBound, hook, hookSettled, legacyRead, notRun, openGold, rule } from "./gold.ts";

interface Result { id: string; verdict: string }

async function report(page: Page, oracle: () => Promise<Host>): Promise<Result[]> {
  const host = await oracle();
  const state = await hook(page, (h) => h.state);
  const out = (await host.build(state)) as { report: { results: Result[] } };
  return out.report.results;
}

async function lastStep(page: Page, steps: string): Promise<void> {
  await page.locator(steps).last().click();
  await hookSettled(page);
}

// The `check` input of tools/gold/report.mjs (G-28, G-39, G-50): the boot
// design's check rows from the build host, one file per bench. A legacy
// page runs no CHK ids, so none is written and those rows grade not run.
rule("check report", "boot check rows into out/checks/<bench>.json", async ({ page, bench, oracle }) => {
  if (bench.origin === "legacy") notRun(`${bench.id}: the legacy page runs no CHK ids`);
  await openGold(page, bench);
  const results = await report(page, oracle);
  expect(results.length, "check rows from the build host").toBeGreaterThan(0);
  const file = path.join(ROOT, "out/checks", `${bench.id}.json`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify({ bench: bench.id, source: "node build host, boot design", results: results.map((r) => ({ id: r.id, verdict: r.verdict })) }, null, 1)}\n`);
});

rule("G-33", "the checks panel counts the checks that ran, zero reads zero", async ({ page, bench, oracle }) => {
  await openGold(page, bench);
  if (bench.origin === "legacy") notRun(`${bench.id}: the legacy page has no checks panel`);
  await lastStep(page, bench.dom.steps);
  const results = await report(page, oracle);
  const ran = results.filter((r) => r.verdict !== "skip").length;
  const text = await page.locator('[data-hb="checks"]').innerText();
  if (ran === 0) {
    expect(text, "zero checks ran").toMatch(/\b0 checks ran\b/);
    return;
  }
  const m = /(\d+) checks?\b[^.]*\bran\b/.exec(text);
  expect(m, `a count line naming how many checks ran (${ran}, computed by the build host); the panel reads: ${text.replace(/\s+/g, " ").slice(0, 160)}`).not.toBeNull();
  expect(Number(m?.[1])).toBe(ran);
});

rule("G-36", "on every step the status chip count equals the fail and warn findings", async ({ page, bench, oracle }) => {
  await openGold(page, bench);
  // A legacy page keeps its own warning list and no step scope; the chip is held to that list on every step.
  const want = bench.origin === "legacy"
    ? await legacyRead<number>(page, bench, "warnings")
    : (await report(page, oracle)).filter((r) => r.verdict === "fail" || r.verdict === "warn").length;
  const steps = page.locator(bench.dom.steps);
  const off: string[] = [];
  for (let i = 0; i < (await steps.count()); i += 1) {
    await steps.nth(i).click();
    await hookSettled(page);
    const chip = (await page.locator(bench.dom.warnChip).innerText()).trim();
    const n = chip === "no warnings" ? 0 : Number(/^(\d+)/.exec(chip)?.[1] ?? NaN);
    if (n !== want) off.push(`step ${i + 1}: chip "${chip}", ${want} fail and warn findings (computed by the build host)`);
  }
  expect(off, off.join("\n")).toEqual([]);
});

rule("G-37", "garbage and a schema failure leave the design, show an error chip, raise no dialog", async ({ page, bench }) => {
  await openGold(page, bench);
  const dialogs: string[] = [];
  page.on("dialog", (d) => {
    dialogs.push(`${d.type()}: ${d.message()}`);
    void d.dismiss();
  });
  const before = await hook(page, (h) => h.designJson());
  // garbage.bin: 64 bytes of a fixed byte ramp read as text, and a JSON that fails the schema.
  const garbage = Array.from({ length: 64 }, (_, i) => String.fromCharCode((i * 37) % 256)).join("");
  const bad: string[] = [];
  for (const [name, text] of [["garbage.bin", garbage], ["schema failure", JSON.stringify({ app: "not-this-bench", v: 1 })]] as const) {
    const threw = await page.evaluate((t) => {
      try {
        (globalThis as unknown as { __hbfHook: { loadDesign(s: string): void } }).__hbfHook.loadDesign(t);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    }, text);
    await page.waitForTimeout(300);
    const now = await hook(page, (h) => h.designJson());
    if (now !== before) bad.push(`${name}: the design changed`);
    const chip = bench.origin === "fab" ? page.locator('[data-hb="status-error"]') : page.locator(`${bench.dom.status} .err, ${bench.dom.status} [class~="err"]`);
    const text2 = (await chip.count()) === 0 ? "" : (await chip.first().innerText()).trim();
    if (text2 === "") bad.push(`${name}: no error chip with text${threw === null ? "" : ` (loadDesign threw: ${threw})`}`);
  }
  expect(dialogs, "dialog events").toEqual([]);
  expect(bad, bad.join("\n")).toEqual([]);
});

chaseBound("G-34", "a failing fixture builds and the viewer marks each finding's target");
chaseBound("G-35", "a click on a finding frames its target; a pair outlines both");
chaseBound("G-38", "one throwing instance is a placeholder with a warning, the rest unchanged");
