// The art board in a baked bench (plan v11.1 section 4.3): the fixture bake
// tools/fixtures/art-board carries one `art` param that takes layers. The
// test drives it the way a person does, through the buttons, the property
// fields and the canvas, and reads the result through BENCH.state and
// BENCH.verbs.art: add a shape and a text layer, move and rotate one by
// pointer, see the art uri change and the canvas paint the layer, drop an
// svg, refuse a png, undo.
// The touch-only test runs at 390 wide: no horizontal scroll, and the add
// buttons, the layer list and a property field work by tap.
//
// Run: node tools/bake/bake.mjs tools/fixtures/art-board/bake.json
//      npx playwright test -c tools/smoke/playwright.config.ts art-board.spec.ts --project desktop

import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { overflow, ROOT, shot } from "./measure.ts";

const BAKE = path.join(ROOT, "dist/art-board/art-board.html");
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 30"><path d="M0 30 L20 0 L40 30 Z M12 26 L20 12 L28 26 Z"/></svg>`;

interface Layer { id: string; kind: string; mute: boolean; dx: number; dy: number; rot: number }
interface ArtState {
  uri: string; face: string; sel: string | null; layers: Layer[]; counts: { front: number; back: number }; notes: string[];
  handles: { corners: [number, number][]; dot: [number, number]; centre: [number, number] } | null;
}

const art = (page: Page, op: string, args: Record<string, unknown> = {}): Promise<ArtState> =>
  page.evaluate(([o, a]) => (globalThis as unknown as { BENCH: { verbs: { art(op: string, a: unknown): unknown } } }).BENCH.verbs.art(o as string, a), [op, args] as const) as Promise<ArtState>;

async function open(page: Page): Promise<void> {
  await page.goto(pathToFileURL(BAKE).href);
  await page.waitForFunction(() => (globalThis as unknown as { BENCH?: { ready: boolean } }).BENCH?.ready === true, undefined, { timeout: 120_000 });
  const d = page.locator('[data-hb="welcome-dismiss"]');
  if (await d.isVisible()) await d.click();
}

const uriOf = (page: Page): Promise<string | null> =>
  page.evaluate(() => ((globalThis as unknown as { BENCH: { state: { art: { uri: string } | null } } }).BENCH.state.art?.uri ?? null));

/** The colour of the canvas pixel at canvas css px (x, y), as #rrggbb. */
const pixel = (page: Page, x: number, y: number): Promise<string> =>
  page.evaluate(([px, py]) => {
    const c = document.querySelector<HTMLCanvasElement>('[data-hb="art-canvas"]')!;
    const k = c.width / c.getBoundingClientRect().width;
    const d = c.getContext("2d")!.getImageData(Math.round((px as number) * k), Math.round((py as number) * k), 1, 1).data;
    return `#${[d[0]!, d[1]!, d[2]!].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }, [x, y] as const);

test.beforeEach(() => {
  test.skip(!existsSync(BAKE), "not run: dist/art-board/art-board.html is absent; run node tools/bake/bake.mjs tools/fixtures/art-board/bake.json");
});

test.describe.configure({ timeout: 180_000 });

test("the art board adds, moves, rotates, paints, takes an svg and refuses a png", async ({ page }) => {
  await open(page);
  const board = page.locator('[data-hb="art-board"][data-part="panel"]');
  await expect(board).toBeVisible();
  const canvas = page.locator('[data-hb="art-canvas"]');
  await expect(canvas).toBeVisible();
  // the canvas sits on the stage, large; the rail keeps the layer list and fields
  await expect(page.locator('[data-hb="stage"] [data-hb="art-canvas"]')).toHaveCount(1);
  await expect(page.locator('[data-hb="rail-left"] [data-hb="art-canvas"]')).toHaveCount(0);
  expect((await canvas.boundingBox())!.width).toBeGreaterThanOrEqual(600);
  expect(await uriOf(page)).toBeNull();
  await expect(page.locator('[data-hb="art-empty"]')).toContainText("no layers on the front face");

  // add a shape by button, give it the pink slot through its property field, and the canvas paints it pink
  await page.locator('[data-add="shape"]').click();
  const u1 = await uriOf(page);
  expect(u1).toMatch(/^hbf:\/\/art\/[0-9a-f]{64}$/);
  const slot = page.locator('[data-hb="art-props"] [data-field="slot"] input');
  await slot.fill("2");
  await slot.dispatchEvent("change");
  await expect.poll(() => uriOf(page)).not.toBe(u1);
  // the default ring is hollow at its centre; a rect shows the slot colour there
  await art(page, "set", { id: (await art(page, "state")).layers[0]!.id, key: "shape", value: "rect" });
  const box = (await canvas.boundingBox())!;
  let s = await art(page, "state");
  const shapeId = s.layers[0]!.id;
  expect(s.handles).not.toBeNull();
  const at = (p: readonly [number, number]) => ({ x: box.x + p[0], y: box.y + p[1] });
  await expect.poll(() => pixel(page, s.handles!.centre[0], s.handles!.centre[1])).toBe("#fe0386");

  // a text layer on top
  await page.locator('[data-add="text"]').click();
  const text = page.locator('[data-hb="art-props"] [data-field="text"] input');
  await text.fill("hack|.build");
  await text.dispatchEvent("change");
  s = await art(page, "state");
  expect(s.layers.map((L) => L.kind)).toEqual(["shape", "text"]);
  expect(s.counts).toEqual({ front: 2, back: 0 });

  // select the shape from the layer list, drag it right and down
  await page.locator(`[data-layer="${shapeId}"] .hbf-art-pick`).click();
  s = await art(page, "state");
  expect(s.sel).toBe(shapeId);
  const u2 = await uriOf(page);
  const c0 = at(s.handles!.centre);
  await page.mouse.move(c0.x, c0.y);
  await page.mouse.down();
  await page.mouse.move(c0.x + 30, c0.y + 10, { steps: 4 });
  await page.mouse.move(c0.x + 60, c0.y + 20, { steps: 4 });
  await page.mouse.up();
  s = await art(page, "state");
  const moved = s.layers.find((L) => L.id === shapeId)!;
  expect(moved.dx).toBeGreaterThan(5);
  expect(moved.dy).toBeLessThan(-1);
  const u3 = await uriOf(page);
  expect(u3).not.toBe(u2);
  expect(await pixel(page, s.handles!.centre[0], s.handles!.centre[1])).toBe("#fe0386");

  // rotate by the dot: drag it to the right of the centre, a quarter turn clockwise (snapped, alt off)
  const dot = at(s.handles!.dot), ctr = at(s.handles!.centre);
  await page.mouse.move(dot.x, dot.y);
  await page.mouse.down();
  await page.mouse.move(ctr.x + 60, ctr.y - 8, { steps: 6 });
  await page.mouse.move(ctr.x + 90, ctr.y, { steps: 4 });
  await page.mouse.up();
  s = await art(page, "state");
  expect(s.layers.find((L) => L.id === shapeId)!.rot).toBe(-90);
  expect(await uriOf(page)).not.toBe(u3);

  // the hook drives the same state: a key on the canvas, then the verb
  await canvas.focus();
  const before = s.layers.find((L) => L.id === shapeId)!.dx;
  await page.keyboard.press("ArrowRight");
  s = await art(page, "state");
  expect(s.layers.find((L) => L.id === shapeId)!.dx).toBeCloseTo(before + 0.25, 2);
  s = await art(page, "move", { id: shapeId, dx: -2, dy: 0, alt: true });
  expect(s.layers.find((L) => L.id === shapeId)!.dx).toBeCloseTo(before - 1.75, 2);

  // the history keeps one snapshot per 450 ms burst; pause so the drop is its own undo step
  await page.waitForTimeout(700);
  // drop an svg on the canvas
  await page.evaluate(([svg, x, y]) => {
    const c = document.querySelector('[data-hb="art-canvas"]')!;
    const r = c.getBoundingClientRect();
    const dt = new DataTransfer();
    dt.items.add(new File([svg as string], "tri.svg", { type: "image/svg+xml" }));
    c.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, clientX: r.left + (x as number), clientY: r.top + (y as number), bubbles: true, cancelable: true }));
  }, [SVG, 40, 40] as const);
  await expect.poll(async () => (await art(page, "state")).layers.map((L) => L.kind).join(",")).toBe("shape,text,path");
  const d = await page.evaluate(() => (globalThis as unknown as { BENCH: { state: { art: { doc: { faces: { front: { d?: string }[] } } } } } }).BENCH.state.art.doc.faces.front[2]!.d);
  expect(d).toContain("M0 30");
  // a png is refused with a line and adds nothing
  const n = (await art(page, "state")).layers.length;
  await page.locator('[data-hb="art-file"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71]) });
  await expect(page.locator('[data-hb="art-note"]').first()).toContainText("png and other raster drops are not read yet");
  expect((await art(page, "state")).layers.length).toBe(n);

  // the back face is its own list
  await page.locator('[data-face="back"]').click();
  s = await art(page, "state");
  expect(s.face).toBe("back");
  expect(s.layers).toEqual([]);
  await page.locator('[data-face="front"]').click();

  // undo goes through the bench history: the svg layer goes
  await page.waitForTimeout(700);
  await page.locator("body").click({ position: { x: 2, y: 2 } });
  await page.keyboard.press("Control+z");
  await expect.poll(async () => (await art(page, "state")).layers.length).toBe(2);

  // the stage toggle reaches the model and back
  await page.locator('[data-hb="stage-view"][data-view="model"]').click();
  await expect(page.locator('[data-hb="art-stage"]')).toHaveCount(0);
  await page.locator('[data-hb="stage-view"][data-view="board"]').click();
  await expect(page.locator('[data-hb="art-stage"]')).toHaveCount(1);
  expect((await canvas.boundingBox())!.width).toBeGreaterThanOrEqual(600);

  await page.screenshot({ path: shot("art-board-desktop-1280.png") });
  const o = await overflow(page);
  expect(o.scrollWidth).toBeLessThanOrEqual(o.width);
});

test("touch-only @touch: the art board fits 390 wide and edits by tap", async ({ page }) => {
  await open(page);
  await expect(page.locator('[data-hb="art-canvas"]')).toBeVisible();
  await page.locator('[data-add="circuit"]').tap();
  await page.locator('[data-add="scope"]').tap();
  const s = await art(page, "state");
  expect(s.layers.map((L) => L.kind)).toEqual(["circuit", "scope"]);
  const f = page.locator('[data-hb="art-props"] [data-field="slot"] input');
  await f.fill("3");
  await f.dispatchEvent("change");
  const o = await overflow(page);
  expect(o.scrollWidth, JSON.stringify(o)).toBeLessThanOrEqual(o.width);
  await page.locator('[data-hb="art-canvas"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: shot("art-board-touch-390.png") });
});
