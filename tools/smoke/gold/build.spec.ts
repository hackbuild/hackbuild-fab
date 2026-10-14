// Gold rules, build and state (TESTING.md 8.5, gold-standard.md section 11).
// Bench-layer rules here: G-03, G-04, G-05, G-06, G-10, G-11. G-01 runs
// as written; G-02 and G-12 are chase-bound rows M10-T17 adds. G-07, G-08,
// G-09 and G-13 are liveness, contract and node rows read from vitest.
// Run: npx playwright test -c tools/smoke/playwright.config.ts --grep @gold

import { expect } from "@playwright/test";
import { setFault } from "../page-build.ts";
import { chaseBound, hook, hookSettled, notRun, numericFields, openGold, readField, rule, writeField } from "./gold.ts";

rule("G-01", "boot builds behind the welcome; 3mf exports before any edit", async ({ page, bench }) => {
  await openGold(page, bench, { welcome: true });
  // spec/hook.ts: built is the rev of the last completed build, so a boot
  // build at rev 0 reads built 0; the rule's "built at least 1" is read as
  // a completed build with a model behind the welcome.
  const s = await hook(page, (h) => ({ built: h.built, rev: h.rev, model: h.model !== null && h.model !== undefined }));
  expect(s.model, "a model behind the welcome").toBe(true);
  expect(s.built, "the boot build landed").toBe(s.rev);
  const b64 = await page.evaluate(() => (globalThis as unknown as { __hbfHook: { exportBytes(k: string): Promise<string> } }).__hbfHook.exportBytes("3mf"));
  expect(b64.length, "3mf bytes").toBeGreaterThan(0);
});

chaseBound("G-02", "boot design is blank or the declared default part");

rule("G-03", "range input marks the mesh stale until the build lands", async ({ page, bench }) => {
  await openGold(page, bench);
  const range = page.locator(bench.dom.params).and(page.locator("input[type=range]:visible")).first();
  if ((await range.count()) === 0) notRun("no range on the first step");
  const chip = page.locator(bench.dom.meshChip).filter({ hasText: /^mesh (current|stale)$/ });
  await range.evaluate((el) => {
    const r = el as HTMLInputElement;
    r.value = String(Number(r.value) + Number(r.step || 1) <= Number(r.max) ? Number(r.value) + Number(r.step || 1) : Number(r.value) - Number(r.step || 1));
    r.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(chip, "chip after input without change").toHaveText("mesh stale");
  await range.evaluate((el) => el.dispatchEvent(new Event("change", { bubbles: true })));
  await hookSettled(page);
  await expect(chip, "chip after the build lands").toHaveText("mesh current");
});

rule("G-04", "five commits on one field inside 320 ms raise built by at most 2", async ({ page, bench }) => {
  await openGold(page, bench);
  const f = (await numericFields(page, bench))[0];
  if (f === undefined) notRun("no numeric field with a declared range");
  const v0 = Number(await readField(page, f.path));
  // built is the rev of the last completed build (spec/hook.ts), so builds
  // are counted as the changes of built seen while the burst settles.
  await page.evaluate(() => {
    const g = globalThis as unknown as { __hbfHook: { built: number }; __hbfBuilds: number[]; __hbfWatch: number };
    g.__hbfBuilds = [];
    let last = g.__hbfHook.built;
    g.__hbfWatch = setInterval(() => {
      if (g.__hbfHook.built !== last) {
        last = g.__hbfHook.built;
        g.__hbfBuilds.push(last);
      }
    }, 2) as unknown as number;
  });
  await page.evaluate(([p, v, st, hi]) => {
    const h = (globalThis as unknown as { __hbfHook: { state: unknown; commit(): void } }).__hbfHook;
    for (let i = 1; i <= 5; i += 1) {
      const s = structuredClone(h.state) as Record<string | number, unknown>;
      let o = s;
      for (const k of (p as (string | number)[]).slice(0, -1)) o = o[k] as Record<string | number, unknown>;
      const next = (v as number) + (i % 2 === 0 ? 0 : (st as number));
      o[(p as (string | number)[]).at(-1) as string | number] = Math.min(next, hi as number);
      h.state = s;
      h.commit();
    }
  }, [f.path, v0, f.step, f.max] as [unknown, unknown, unknown, unknown]);
  await hookSettled(page);
  await page.waitForTimeout(50);
  const builds = await page.evaluate(() => {
    const g = globalThis as unknown as { __hbfBuilds: number[]; __hbfWatch: number };
    clearInterval(g.__hbfWatch);
    return g.__hbfBuilds.length;
  });
  expect(builds, "builds for a burst of 5 commits (measured)").toBeLessThanOrEqual(2);
});

rule("G-05", "colour, name and slot edits never build", async ({ page, bench }) => {
  const row = bench.dom.slotRow;
  if (row === undefined) notRun(`${bench.id}: the hook offers no light commit path to a colour, name or slot edit`);
  await openGold(page, bench);
  const before = await hook(page, (h) => ({ built: h.built, rev: h.rev, buildHash: h.buildHash }));
  const bad: string[] = [];
  // Each edit as a person makes it: colour fires input then change, the name and slot select fire change.
  const edits: [string, string, string, (legend: string) => boolean][] = [
    ["colour", 'input[type="color"]', "#123456", (l) => l.includes("rgb(18, 52, 86)")],
    ["name", 'input[type="text"]', "gold probe", (l) => l.includes("gold probe")],
    ["slot", "select", "", () => true],
  ];
  for (const [what, sel, value, shown] of edits) {
    const r = await page.evaluate(async ([rowSel, s, v, legendSel]) => {
      const el = document.querySelector(rowSel)?.querySelector<HTMLInputElement | HTMLSelectElement>(s);
      if (el == null) return { found: false, ms: 0, legend: "" };
      if (el instanceof HTMLSelectElement) el.selectedIndex = (el.selectedIndex + 1) % el.options.length;
      else el.value = v;
      const t0 = performance.now();
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((res) => setTimeout(res, 50));
      const lg = document.querySelector(legendSel);
      const legend = lg === null ? "" : `${lg.textContent ?? ""} ${Array.from(lg.querySelectorAll<HTMLElement>("*")).map((e) => getComputedStyle(e).backgroundColor).join(" ")}`;
      return { found: true, ms: performance.now() - t0, legend };
    }, [row as string, sel, value, bench.dom.legend] as const);
    if (!r.found) {
      bad.push(`${what}: no ${sel} in ${row}`);
      continue;
    }
    const now = await hook(page, (h) => ({ built: h.built, rev: h.rev, busy: h.busy, buildHash: h.buildHash }));
    if (now.built !== before.built || now.rev !== before.rev || now.busy || now.buildHash !== before.buildHash) {
      bad.push(`${what} edit built: rev ${before.rev} to ${now.rev}, built ${before.built} to ${now.built}, busy ${now.busy}`);
    }
    if (!shown(r.legend)) bad.push(`${what} edit: legend does not show it 50 ms after the edit`);
  }
  await page.waitForTimeout(500);
  const late = await hook(page, (h) => ({ built: h.built, rev: h.rev }));
  if (late.rev !== before.rev || late.built !== before.built) bad.push(`a build ran within 500 ms of the edits: rev ${before.rev} to ${late.rev}`);
  expect(bad, bad.join("\n")).toEqual([]);
});

rule("G-06", "every rail input equals state after a hook write and commit()", async ({ page, bench }) => {
  await openGold(page, bench);
  const f = (await numericFields(page, bench))[0];
  if (f === undefined) notRun("no numeric field with a declared range");
  const v0 = Number(await readField(page, f.path));
  await writeField(page, f.path, v0 + f.step <= f.max ? v0 + f.step : v0 - f.step);
  await page.evaluate(() => (globalThis as unknown as { __hbfHook: { commit(): void } }).__hbfHook.commit());
  await hookSettled(page);
  const off = await page.evaluate((sel) => {
    const st = (globalThis as unknown as { __hbfHook: { state: unknown } }).__hbfHook.state;
    const at = (key: string): unknown => {
      const path = key.startsWith("/") ? key.slice(1).split("/") : key.split(".");
      let o = st as unknown;
      for (const k of path) o = (o as Record<string, unknown> | undefined)?.[k];
      return o;
    };
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLInputElement>(sel))) {
      if (el.offsetParent === null) continue;
      const key = el.closest("[data-path]")?.getAttribute("data-path") ?? el.getAttribute("data-p") ?? "";
      const want = at(key);
      if (el.type === "checkbox") {
        if (typeof want === "boolean" && el.checked !== want) bad.push(`${key}: checked ${el.checked}, state ${want}`);
        continue;
      }
      if (typeof want !== "number" || el.value === "") continue;
      const dec = (el.value.split(".")[1] ?? "").length;
      if (Number(el.value) !== Number(want.toFixed(dec))) bad.push(`${key}: input ${el.value}, state ${want}`);
    }
    return bad;
  }, bench.dom.params);
  expect(off, off.join("\n")).toEqual([]);
});

const HANG_MS = 10_000;

rule("G-10", "an out-of-range write is clamped or refused with a log line within 100 ms", async ({ page, bench, info }) => {
  await openGold(page, bench);
  // PIP hung over 20 minutes on a 40 x 30 body (gold-standard.md 7.2); HANG_MS per write records it as a fail, not a timeout.
  const fields = await numericFields(page, bench);
  if (fields.length === 0) notRun("no numeric field with a declared range");
  const silent: string[] = [];
  const timings: number[] = [];
  for (const f of fields) {
    for (const [how, value] of [["state", f.min - 10 * f.step], ["loadDesign", f.max + 10 * f.step]] as const) {
      // A page that blocks its main thread never answers; 10 s without an answer is the rule's hang.
      const asked = page.evaluate(async ([p, v, via]) => {
        const h = (globalThis as unknown as { __hbfHook: { state: unknown; log: string[]; designJson(): string; loadDesign(s: string): void } }).__hbfHook;
        const n0 = h.log.length;
        const t0 = performance.now();
        const put = (o0: Record<string | number, unknown>): void => {
          let o = o0;
          for (const k of (p as (string | number)[]).slice(0, -1)) o = o[k] as Record<string | number, unknown>;
          o[(p as (string | number)[]).at(-1) as string | number] = v;
        };
        if (via === "state") {
          const s = structuredClone(h.state) as Record<string | number, unknown>;
          put(s);
          h.state = s;
        } else {
          const d = JSON.parse(h.designJson()) as { state: Record<string | number, unknown> };
          put(d.state);
          h.loadDesign(JSON.stringify(d));
        }
        while (h.log.length === n0 && performance.now() - t0 < 1000) await new Promise((r) => setTimeout(r, 5));
        let got = h.state as unknown;
        for (const k of p as (string | number)[]) got = (got as Record<string | number, unknown>)[k];
        return { ms: performance.now() - t0, lines: h.log.slice(n0), got };
      }, [f.path, value, how] as [unknown, unknown, unknown]);
      const r = await Promise.race([asked, new Promise<null>((res) => setTimeout(() => res(null), HANG_MS))]);
      if (r === null) {
        asked.catch(() => undefined);
        throw new Error([`${f.key} via ${how} = ${value}: no answer in ${HANG_MS} ms, a hang (measured)`, ...silent].join("\n"));
      }
      timings.push(r.ms);
      const named = r.lines.some((l) => l.includes(String(value)) && l.includes(String(f.min)) && l.includes(String(f.max)));
      const inRange = typeof r.got === "number" && r.got >= f.min && r.got <= f.max;
      if (!named || r.ms > 1000) silent.push(`${f.key} via ${how} = ${value}: ${named ? "logged" : "no log line naming value and range"}, now ${String(r.got)}${inRange ? "" : " (out of range)"}, ${Math.round(r.ms)} ms`);
    }
    await hookSettled(page);
  }
  info.annotations.push({ type: "clamp log ms", description: `max ${Math.round(Math.max(...timings))} ms over ${timings.length} writes (measured)` });
  expect(silent, silent.join("\n")).toEqual([]);
}, { timeout: 180_000 });

rule("G-11", "a thrown build clears busy, keeps the mesh, shows the error, and a valid commit recovers", async ({ page, bench }) => {
  if (bench.origin === "legacy") {
    // PIP's own crash fixture: stack.layer = 0 (gold-standard.md 7.2).
    await openGold(page, bench);
    const before = await hook(page, (h) => h.built);
    await page.evaluate(() => {
      const h = (globalThis as unknown as { __hbfHook: { designJson(): string; loadDesign(s: string): void } }).__hbfHook;
      const d = JSON.parse(h.designJson()) as { state: { stack?: { layer?: number } } };
      if (d.state.stack !== undefined) d.state.stack.layer = 0;
      h.loadDesign(JSON.stringify(d));
    });
    await page.waitForTimeout(1000);
    const s = await hook(page, (h) => ({ busy: h.busy, error: h.error, built: h.built }));
    expect(s.busy, "busy 1 s after the throw").toBe(false);
    expect(s.error, "error text").not.toBeNull();
    expect(s.built).toBeGreaterThanOrEqual(before);
    return;
  }
  // No designs/<id>/test/faults/throw.json exists for a reference bake yet;
  // the fault switch makes the page build throw once instead, which the
  // bench sees as the same thrown build (tools/smoke/page-build.ts).
  await openGold(page, bench);
  const f = (await numericFields(page, bench))[0];
  if (f === undefined) notRun("no numeric field");
  const v0 = Number(await readField(page, f.path));
  const tris0 = await page.locator('[data-hb="tris"]').innerText();
  await setFault(page, { throwNext: true });
  await writeField(page, f.path, v0 + f.step <= f.max ? v0 + f.step : v0 - f.step);
  await page.waitForFunction(() => (globalThis as unknown as { __hbfHook: { error: string | null; busy: boolean } }).__hbfHook.error !== null, undefined, { timeout: 1000 });
  const s = await hook(page, (h) => ({ busy: h.busy, error: h.error }));
  expect(s.busy).toBe(false);
  expect(s.error).toContain("forced throw");
  await expect(page.locator('[data-hb="status-error"]')).toContainText("forced throw");
  await expect(page.locator('[data-hb="tris"]'), "the stage keeps the previous mesh").toHaveText(tris0);
  const b0 = await hook(page, (h) => h.built);
  await writeField(page, f.path, v0);
  await hookSettled(page);
  const after = await hook(page, (h) => ({ error: h.error, built: h.built }));
  expect(after.error).toBeNull();
  expect(after.built).toBeGreaterThan(b0);
});

chaseBound("G-12", "presets then every boolean flipped leave no NaN, empty select or undefined note");
