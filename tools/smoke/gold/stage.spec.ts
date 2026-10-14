// Gold rules, stage and drive (TESTING.md 8.5). Bench-layer rules here:
// G-14 to G-18 and G-21 (touch). G-19, G-20, G-22 and G-23 are chase-bound
// rows M10-T17 adds; G-24 is the person review of section 13.
// Run: npx playwright test -c tools/smoke/playwright.config.ts --grep @gold

import { expect, type Page } from "@playwright/test";
import JSZip from "jszip";
import { chaseBound, hook, hookSettled, legacyRead, notRun, numericFields, openGold, rule, writeField } from "./gold.ts";
import type { StageObject } from "../../hook/legacy-adapters.ts";

interface Inspect { bodies: { id: string; role: string; opacity: number }[]; screen: [number, number, number, number] | null; width: number; height: number }

const inspect = (page: Page): Promise<Inspect> =>
  page.evaluate(() => {
    const v = document.querySelector("hb-viewer") as unknown as { inspect(): Inspect } | null;
    if (v === null) throw new Error("no hb-viewer");
    return v.inspect();
  });

/** Per object triangle count and bounds of a 3MF's meshes, read from 3D/*.model. */
async function threeMf(b64: string): Promise<{ tris: number; lo: number[]; hi: number[] }> {
  const zip = await JSZip.loadAsync(Buffer.from(b64, "base64"));
  let tris = 0;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const name of Object.keys(zip.files).filter((n) => /^3D\/.*\.model$/i.test(n))) {
    const xml = await zip.file(name)?.async("string") ?? "";
    tris += (xml.match(/<triangle\b/g) ?? []).length;
    for (const m of xml.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)) {
      for (let a = 0; a < 3; a += 1) {
        const v = Number(m[a + 1]);
        lo[a] = Math.min(lo[a] as number, v);
        hi[a] = Math.max(hi[a] as number, v);
      }
    }
  }
  return { tris, lo, hi };
}

type Part = { tris: number; lo: number[]; hi: number[] };

/** Per build item of a 3MF, the parts of its object: a mesh object, or each component of a component object, in order. */
async function threeMfItems(b64: string): Promise<Part[][]> {
  const zip = await JSZip.loadAsync(Buffer.from(b64, "base64"));
  const objects = new Map<string, string>();
  for (const name of Object.keys(zip.files).filter((n) => /^3D\/.*\.model$/i.test(n))) {
    const xml = await zip.file(name)?.async("string") ?? "";
    for (const m of xml.matchAll(/<object id="(\d+)"[^>]*>([\s\S]*?)<\/object>/g)) objects.set(m[1] as string, m[2] as string);
    const items = [...xml.matchAll(/<item\b[^>]*\bobjectid="(\d+)"/g)].map((m) => m[1] as string);
    if (items.length === 0) continue;
    const part = (body: string): Part => {
      const lo = [Infinity, Infinity, Infinity];
      const hi = [-Infinity, -Infinity, -Infinity];
      for (const v of body.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)) {
        for (let a = 0; a < 3; a += 1) {
          lo[a] = Math.min(lo[a] as number, Number(v[a + 1]));
          hi[a] = Math.max(hi[a] as number, Number(v[a + 1]));
        }
      }
      return { tris: (body.match(/<triangle\b/g) ?? []).length, lo, hi };
    };
    return items.map((id) => {
      const body = objects.get(id) ?? "";
      const comps = [...body.matchAll(/<component\b[^>]*\bobjectid="(\d+)"[^>]*\btransform="([^"]+)"/g)];
      if (comps.length === 0) return [part(body)];
      return comps.map((c) => {
        if ((c[2] as string).trim().split(/\s+/).map(Number).join(" ") !== "1 0 0 0 1 0 0 0 1 0 0 0") throw new Error(`object ${id}: component ${c[1]} carries a transform ${c[2]}; compare after applying it`);
        return part(objects.get(c[1] as string) ?? "");
      });
    });
  }
  return [];
}

rule("G-14", "the 3MF's triangles and bounds equal the stage model's", async ({ page, bench, host }) => {
  await openGold(page, bench, host);
  if (bench.origin === "legacy") {
    const stage = await legacyRead<StageObject[]>(page, bench, "stageObjects");
    const b64 = await page.evaluate(() => (globalThis as unknown as { __hbfHook: { exportBytes(k: string): Promise<string> } }).__hbfHook.exportBytes("3mf"));
    const items = await threeMfItems(b64);
    const off: string[] = [];
    if (items.length !== stage.length) off.push(`${items.length} build items in the 3MF, ${stage.length} objects on the stage`);
    stage.forEach((o, i) => {
      const got = items[i] ?? [];
      if (got.length !== o.parts.length) return void off.push(`${o.name}: ${got.length} parts in the 3MF, ${o.parts.length} on the stage`);
      o.parts.forEach((p, j) => {
        const g = got[j] as Part;
        if (g.tris !== p.tris) off.push(`${o.name}/${p.name}: ${g.tris} triangles in the 3MF, ${p.tris} on the stage`);
        for (let a = 0; a < 3; a += 1) {
          const d = Math.max(Math.abs((g.lo[a] as number) - (p.lo[a] as number)), Math.abs((g.hi[a] as number) - (p.hi[a] as number)));
          if (!(d <= 1e-6)) off.push(`${o.name}/${p.name}: bounds differ by ${d} mm on axis ${"xyz"[a]}, legal at most 1e-6`);
        }
      });
    });
    expect(off, off.join("\n")).toEqual([]);
    return;
  }
  const b64 = await page.evaluate(() => (globalThis as unknown as { __hbfHook: { exportBytes(k: string): Promise<string> } }).__hbfHook.exportBytes("3mf"));
  const got = await threeMf(b64);
  const model = await page.evaluate(() => {
    const m = (globalThis as unknown as { __hbfHook: { model: { meshes?: Record<string, { positions: number[]; triangles: number[] }> } } }).__hbfHook.model;
    let tris = 0;
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (const x of Object.values(m.meshes ?? {})) {
      tris += x.triangles.length / 3;
      x.positions.forEach((v, i) => {
        lo[i % 3] = Math.min(lo[i % 3] as number, v);
        hi[i % 3] = Math.max(hi[i % 3] as number, v);
      });
    }
    return { tris, lo, hi };
  });
  expect(got.tris).toBe(model.tris);
  for (let a = 0; a < 3; a += 1) {
    expect(Math.abs((got.lo[a] as number) - (model.lo[a] as number))).toBeLessThanOrEqual(1e-6);
    expect(Math.abs((got.hi[a] as number) - (model.hi[a] as number))).toBeLessThanOrEqual(1e-6);
  }
});

rule("G-15", "after each liveness edit the model lies inside the stage; a double click fits", async ({ page, bench, host }) => {
  await openGold(page, bench, host);
  if (bench.origin === "legacy") notRun(`${bench.id}: the legacy stage exposes no projected bounds`);
  const off: string[] = [];
  const inside = async (where: string): Promise<void> => {
    await page.waitForTimeout(120);
    const v = await inspect(page);
    if (v.screen === null) return void off.push(`${where}: nothing drawn`);
    const [l, t, r, b] = v.screen;
    if (l < -1 || t < -1 || r > v.width + 1 || b > v.height + 1) off.push(`${where}: model box ${[l, t, r, b].map(Math.round).join(", ")} px outside the stage ${v.width} x ${v.height} px`);
  };
  for (const f of await numericFields(page, bench)) {
    for (const v of [f.max, f.min]) {
      await writeField(page, f.path, v);
      await hookSettled(page);
      await inside(`${f.key} = ${v}`);
    }
  }
  await page.locator("hb-viewer").dblclick();
  await inside("after a double click");
  expect(off, off.join("\n")).toEqual([]);
}, { timeout: 300_000 });

rule("G-16", "ghost and xray fade structural bodies only", async ({ page, bench, host }) => {
  await openGold(page, bench, host);
  if (bench.origin === "legacy") notRun(`${bench.id}: the legacy viewer exposes no per-body opacity`);
  await page.evaluate(() => {
    (document.querySelector("hb-viewer") as unknown as { xray: boolean }).xray = true;
  });
  const v = await inspect(page);
  expect(v.bodies.length, "bodies drawn").toBeGreaterThan(0);
  const bad = v.bodies.filter((b) => (["body", "structure", "backer"].includes(b.role) ? b.opacity >= 1 : b.opacity !== 1));
  expect(bad.map((b) => `${b.id} ${b.role} opacity ${b.opacity}`)).toEqual([]);
});

rule("G-17", "view toggles combine and the strip's pressed state equals viewer state after orbit and focus", async ({ page, bench, host }) => {
  await openGold(page, bench, host);
  if (bench.origin === "legacy") notRun(`${bench.id}: the legacy viewer state is not readable through the adapter`);
  const modes = await page.locator('[data-hb="mode"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-mode") ?? ""));
  const stale: string[] = [];
  const compare = async (where: string): Promise<void> => {
    const r = await page.evaluate(() => {
      const v = document.querySelector("hb-viewer") as unknown as { explode: boolean; xray: boolean; section: number | null; plate: boolean; viewState(): { cam: { name: string | null } } };
      const state: Record<string, boolean> = { exploded: v.explode, xray: v.xray, section: v.section !== null, plate: v.plate };
      const out: string[] = [];
      for (const b of Array.from(document.querySelectorAll<HTMLElement>('[data-hb="mode"]'))) {
        const m = b.dataset["mode"] ?? "";
        const pressed = b.getAttribute("aria-pressed") === "true";
        if (!(m in state)) out.push(`${m}: pressed ${pressed}, the viewer has no ${m} state`);
        else if (state[m] !== pressed) out.push(`${m}: pressed ${pressed}, viewer ${state[m]}`);
      }
      const cam = v.viewState().cam.name;
      for (const b of Array.from(document.querySelectorAll<HTMLElement>('[data-hb="cam"]'))) {
        const pressed = b.getAttribute("aria-pressed") === "true";
        if (pressed !== (cam === b.dataset["cam"])) out.push(`cam ${b.dataset["cam"]}: pressed ${pressed}, viewer cam ${cam}`);
      }
      return out;
    });
    stale.push(...r.map((x) => `${where}: ${x}`));
  };
  for (let mask = 0; mask < 1 << modes.length; mask += 1) {
    for (let i = 0; i < modes.length; i += 1) {
      const btn = page.locator(`[data-hb="mode"][data-mode="${modes[i]}"]`);
      const want = (mask & (1 << i)) !== 0;
      if ((await btn.getAttribute("aria-pressed")) !== String(want)) await btn.click();
    }
    await compare(`modes ${modes.filter((_, i) => (mask & (1 << i)) !== 0).join("+") || "none"}`);
  }
  const box = await page.locator("hb-viewer").boundingBox();
  if (box !== null) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 20, { steps: 6 });
    await page.mouse.up();
  }
  await compare("after an orbit");
  await page.locator("hb-viewer").dblclick();
  await compare("after a focus");
  expect(stale, stale.join("\n")).toEqual([]);
});

rule("G-18", "in plate view the bed chip agrees with CHK-PRT-16 and every plate object", async ({ page, bench, host }) => {
  await openGold(page, bench, host);
  if (bench.origin === "legacy") notRun(`${bench.id}: the legacy page runs no CHK-PRT-16`);
  const plate = page.locator('[data-hb="mode"][data-mode="plate"]');
  if ((await plate.getAttribute("aria-pressed")) !== "true") await plate.click();
  const chip = page.locator('[data-hb="chip-bed"]');
  await expect(chip, "the bed chip in plate view").toBeVisible({ timeout: 2000 });
  const results = await hook(page, (h) => ((h.model as { report?: { results?: { id: string; verdict: string }[] } } | null)?.report?.results ?? []).filter((r) => r.id === "CHK-PRT-16").map((r) => r.verdict));
  expect(results.length, "CHK-PRT-16 ran").toBeGreaterThan(0);
  const fits = results.every((v) => v !== "fail");
  await expect(chip).toHaveText(fits ? "fits bed" : "over bed");
});

chaseBound("G-19", "the pad's regions come from built geometry and move with it");
chaseBound("G-20", "pad, pose, readout and drive agree within 0.01 over 16 samples");

rule("G-21", "touch-only: the pad captures the pointer, has touch-action none, releases on pointercancel within 400 ms", async ({ page, bench, host }) => {
  await openGold(page, bench, host);
  const key = page.locator(bench.dom.padKey).first();
  if ((await key.count()) === 0) notRun(`${bench.id}: no drive pad key on screen`);
  const read = page.locator(bench.dom.padRead);
  const idle = await read.innerText();
  const ta = await key.evaluate((el) => [getComputedStyle(el).touchAction, getComputedStyle(el.parentElement as Element).touchAction]);
  expect(ta[0], "key touch-action").toBe("none");
  await key.evaluate((el) => {
    (globalThis as unknown as { __hbfCap: boolean }).__hbfCap = false;
    el.addEventListener("gotpointercapture", () => ((globalThis as unknown as { __hbfCap: boolean }).__hbfCap = true));
  });
  const cdp = await page.context().newCDPSession(page);
  const b = await key.boundingBox();
  if (b === null) throw new Error("no key box");
  const pt = { x: b.x + b.width / 2, y: b.y + b.height / 2, id: 0, radiusX: 4, radiusY: 4, force: 1 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] });
  // gotpointercapture fires before the next pointer event after the capture is set.
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...pt, x: pt.x + 1 }] });
  await expect(read, "the read while held").not.toHaveText(idle);
  expect(await page.evaluate(() => (globalThis as unknown as { __hbfCap: boolean }).__hbfCap), "pointer captured on pointerdown").toBe(true);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await expect(read, "back to idle within 400 ms of pointercancel").toHaveText(idle, { timeout: 400 });
}, { touch: true });

chaseBound("G-22", "a click on a drive target in 3D reads as the pad does");
chaseBound("G-23", "a held net and its return light in xray; section follows the target");
