// Number fields and the status strip at 390 and at 1280 on every bake in
// dist/bench (the list is read from the files present, never typed). Two
// measures per bench and step:
//   fields: every rendered input[type=number] shows its whole value, that
//     is scrollWidth is at most clientWidth. Measured 2026-11-02 before the
//     fix, desktop: midi-pad key pitch 19.05 scrolled 62 px in a 52 px box
//     at 390 and 62 in 60 at 1280; access-switch beam 0.55 scrolled 54 in 52
//     at 390.
//   strip: the status strip takes at most two rows and at most STRIP_MAX_PX
//     at 390, and the mesh state, the build time and the warning count stay
//     on screen. Measured 2026-11-02 before the fix: four lines, 148 px of a
//     844 px frame (midi-pad, all five other benches the same); after, two
//     rows, 80 px.
// Run on both projects: desktop keeps the browser's own number spinner
// rules, touch-390 is hasTouch and isMobile (the 44 px log toggle sets the
// first row's height there).
// Run: npx playwright test -c tools/smoke/playwright.config.ts fields-390.spec.ts --project desktop

import { expect, test, type Page } from "@playwright/test";
import { bakes, closeWelcome, open, settled, shot, stepButtons, TARGET_PX, writeReport } from "./measure.ts";

test.describe.configure({ timeout: 300_000 });

const WIDTHS = [390, 1280] as const;
const HEIGHT = 844;
/** Rows the strip may take at 390. */
const STRIP_ROWS_MAX = 2;
/**
 * Strip height bound at 390, px. Two rows are the 44 px log toggle row, a
 * 17 px chip row, 6 px of padding above and below, a 4 px row gap and the
 * 3 px top rule (80 px, computed and measured); the bound leaves 16 px for
 * a fallback font.
 */
const STRIP_MAX_PX = 2 * TARGET_PX + 8;

interface Field { label: string; value: string; scrollWidth: number; clientWidth: number }
interface Strip { height: number; rows: number; offscreen: string[]; missing: string[] }

const numberFields = (page: Page): Promise<Field[]> =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLInputElement>("input[type=number]"))
      .filter((e) => e.clientWidth > 0 && getComputedStyle(e).visibility !== "hidden")
      .map((e) => ({ label: e.getAttribute("aria-label") ?? e.name, value: e.value, scrollWidth: e.scrollWidth, clientWidth: e.clientWidth })));

/** Rows are clusters of strip items whose vertical ranges overlap; a display:contents wrapper has no box and is looked through. */
const strip = (page: Page): Promise<Strip> =>
  page.evaluate(() => {
    const el = document.querySelector('[data-hb="status"]') as HTMLElement;
    const flat = (n: Element): Element[] => Array.from(n.children).flatMap((c) => (getComputedStyle(c).display === "contents" ? flat(c) : [c]));
    const items = flat(el)
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .sort((a, b) => a.top - b.top);
    let rows = 0;
    let bottom = -Infinity;
    for (const r of items) {
      if (r.top >= bottom - 0.5) rows += 1;
      bottom = Math.max(bottom, r.bottom);
    }
    const must = ["chip-mesh", "build-ms", "chip-warn"];
    const missing = must.filter((id) => {
      const n = el.querySelector(`[data-hb="${id}"]`);
      return n === null || n.getBoundingClientRect().width === 0;
    });
    const offscreen = must.flatMap((id) => {
      const n = el.querySelector(`[data-hb="${id}"]`);
      if (n === null) return [];
      const r = n.getBoundingClientRect();
      return r.left < 0 || r.right > window.innerWidth ? [id] : [];
    });
    return { height: el.getBoundingClientRect().height, rows, offscreen, missing };
  });

for (const width of WIDTHS) {
  test.describe(`@all-projects number fields and status strip at ${width}`, () => {
    test.use({ viewport: { width, height: HEIGHT } });
    for (const bake of bakes().filter((b) => b.kind === "bench")) {
      test(`${bake.id} at ${width}: full values, strip rows and height`, async ({ page }, info) => {
        test.skip(bake.build === null, `not run: ${bake.id} carries no in-page build`);
        await open(page, bake);
        await closeWelcome(page);
        const n = await stepButtons(page).count();
        expect(n, "steps strip buttons").toBeGreaterThan(0);
        const clipped: string[] = [];
        const stripFails: string[] = [];
        const rows: { step: number; fields: number; strip: Strip }[] = [];
        let seen = 0;
        for (let i = 0; i < n; i += 1) {
          await stepButtons(page).nth(i).click();
          await settled(page).catch(() => undefined);
          const fields = await numberFields(page);
          seen += fields.length;
          for (const f of fields) {
            if (f.scrollWidth > f.clientWidth) clipped.push(`step ${i + 1}: ${f.label} shows part of ${f.value}, scrollWidth ${f.scrollWidth} px over clientWidth ${f.clientWidth} px (measured)`);
          }
          const s = await strip(page);
          rows.push({ step: i + 1, fields: fields.length, strip: s });
          if (s.rows > STRIP_ROWS_MAX) stripFails.push(`step ${i + 1}: strip takes ${s.rows} rows, at most ${STRIP_ROWS_MAX} (measured)`);
          if (width === 390 && s.height > STRIP_MAX_PX) stripFails.push(`step ${i + 1}: strip is ${s.height} px tall at 390, bound ${STRIP_MAX_PX} px (measured)`);
          if (s.missing.length > 0) stripFails.push(`step ${i + 1}: strip lacks ${s.missing.join(", ")}`);
          if (s.offscreen.length > 0) stripFails.push(`step ${i + 1}: ${s.offscreen.join(", ")} past the viewport edge`);
        }
        expect(seen, "number fields seen across the steps").toBeGreaterThan(0);
        await page.screenshot({ path: shot(`fields-390-${info.project.name}-${bake.id}-${width}.png`) });
        writeReport(`fields-390-${info.project.name}-${bake.id}-${width}.json`, { bake: bake.id, project: info.project.name, width, qualifier: "measured", bound: { rows: STRIP_ROWS_MAX, px: STRIP_MAX_PX }, steps: rows });
        expect(clipped, clipped.join("\n")).toEqual([]);
        expect(stripFails, stripFails.join("\n")).toEqual([]);
      });
    }
  });
}
