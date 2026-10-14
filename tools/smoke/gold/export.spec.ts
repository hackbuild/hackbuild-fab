// Gold rules, export (TESTING.md 8.5). Bench-layer rules here: G-46 and
// G-51. G-47, G-48 and G-49 are chase-bound rows M10-T17 adds; G-50 is a
// check row.
// Run: npx playwright test -c tools/smoke/playwright.config.ts --grep @gold

import { expect } from "@playwright/test";
import JSZip from "jszip";
import { chaseBound, hook, hookSettled, notRun, numericFields, openGold, readField, rule, writeField } from "./gold.ts";

/** The 3D/*.model texts of a 3MF, the geometry an export carries, by entry name. */
async function models(b64: string): Promise<string> {
  const zip = await JSZip.loadAsync(Buffer.from(b64, "base64"));
  const names = Object.keys(zip.files).filter((n) => /^3D\/.*\.model$/i.test(n)).sort();
  const parts = await Promise.all(names.map(async (n) => `${n}\n${await zip.file(n)?.async("string") ?? ""}`));
  return parts.join("\n");
}

const export3mf = (page: import("@playwright/test").Page): Promise<string> =>
  page.evaluate(() => (globalThis as unknown as { __hbfHook: { exportBytes(k: string): Promise<string> } }).__hbfHook.exportBytes("3mf"));

rule("G-46", "commit then export 3mf with no wait gives the new rev's bytes", async ({ page, bench }) => {
  await openGold(page, bench);
  const f = (await numericFields(page, bench))[0];
  if (f === undefined) notRun("no numeric field");
  const v0 = Number(await readField(page, f.path));
  if (bench.origin === "legacy") {
    // A legacy 3MF carries no Metadata/hackbuild_chase.json; the new rev's
    // geometry is the export taken once the build settles, and the old rev's
    // is the export taken before the write.
    const old = await models(await export3mf(page));
    await writeField(page, f.path, v0 + f.step <= f.max ? v0 + f.step : v0 - f.step);
    const b64 = await page.evaluate(async () => {
      const h = (globalThis as unknown as { __hbfHook: { commit(): void; exportBytes(k: string): Promise<string> } }).__hbfHook;
      h.commit();
      return h.exportBytes("3mf");
    });
    await hookSettled(page);
    const fresh = await models(await export3mf(page));
    const got = await models(b64);
    expect(fresh, `${f.key} moved no geometry; pick a field that does`).not.toBe(old);
    expect(got === fresh ? "new rev" : got === old ? "old rev" : "neither rev", "geometry of the no-wait export").toBe("new rev");
    return;
  }
  await writeField(page, f.path, v0 + f.step <= f.max ? v0 + f.step : v0 - f.step);
  const b64 = await page.evaluate(async () => {
    const h = (globalThis as unknown as { __hbfHook: { commit(): void; exportBytes(k: string): Promise<string> } }).__hbfHook;
    h.commit();
    return h.exportBytes("3mf");
  });
  await hookSettled(page);
  const now = await hook(page, (h) => h.buildHash);
  const zip = await JSZip.loadAsync(Buffer.from(b64, "base64"));
  const meta = await zip.file("Metadata/hackbuild_chase.json")?.async("string");
  expect(meta, "Metadata/hackbuild_chase.json in the 3MF").toBeDefined();
  expect((JSON.parse(meta as string) as { buildHash?: string }).buildHash).toBe(now);
});

chaseBound("G-47", "two exports of each kind give equal artifact hashes");
chaseBound("G-48", "the card holds each declared section for every preset");
chaseBound("G-49", "the export row lists each finding; a block fail refuses with no gate");

rule("G-51", "an unknown export kind rejects with unknown export kind: bogus", async ({ page, bench }) => {
  await openGold(page, bench);
  const r = await page.evaluate(async () => {
    try {
      await (globalThis as unknown as { __hbfHook: { exportBytes(k: string): Promise<string> } }).__hbfHook.exportBytes("bogus");
      return { error: false, name: "", message: "resolved" };
    } catch (e) {
      return { error: e instanceof Error, name: e instanceof Error ? e.constructor.name : typeof e, message: e instanceof Error ? e.message : String(e) };
    }
  });
  expect(r.name, "an Error, never a TypeError").toBe("Error");
  expect(r.message).toBe("unknown export kind: bogus");
});
