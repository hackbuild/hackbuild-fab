// Shared by the CDN page and Vue host specs (plan v10 Phase 1 exit row): a
// bench controller seen from the page, driven through its core, and the
// default buildHash each design records in expected/build.json.

import { readFileSync } from "node:fs";
import path from "node:path";
import type { Locator, Page } from "@playwright/test";
import { ROOT } from "./measure.ts";

/** Origin of the static server in playwright.config.ts. */
export const ORIGIN = "http://127.0.0.1:4173";

const DIRS: Record<string, string> = { "flex-pair": "reference/keys/flex-pair" };

export function expectedHash(design: string): string {
  return (JSON.parse(readFileSync(path.join(ROOT, DIRS[design] ?? `designs/${design}`, "expected/build.json"), "utf8")) as { buildHash: string }).buildHash;
}

/** The part of a controller the specs read: BenchController.core. */
export interface CoreLike {
  rev: number;
  built: number;
  busy: boolean;
  error: string | null;
  result: { buildHash: string } | null;
  state: Record<string, unknown>;
  set(path: string, value: unknown): void;
  commit(): void;
}

/** Evaluates `expr` (a controller expression such as `hbfHost.mount`) once the first build has settled; returns its buildHash. */
export async function settledHash(page: Page, expr: string, timeout = 120_000): Promise<string> {
  await page.waitForFunction(
    (e) => {
      const c = (new Function(`return ${e}`)() as { core: CoreLike } | undefined)?.core;
      return c !== undefined && c.result !== null && c.built === c.rev && !c.busy;
    },
    expr,
    { timeout, polling: 100 },
  );
  return page.evaluate((e) => ((new Function(`return ${e}`)() as { core: CoreLike }).core.result as { buildHash: string }).buildHash, expr);
}

/** Sets one numeric param by id through the controller's core, commits, and returns the next settled buildHash. */
export async function editParam(page: Page, expr: string, id: string, delta: number): Promise<string> {
  const before = await settledHash(page, expr);
  await page.evaluate(([e, key, d]) => {
    const c = (new Function(`return ${e}`)() as { core: CoreLike }).core;
    c.set(String(key), Number(c.state[String(key)]) + Number(d));
    c.commit();
  }, [expr, id, delta] as const);
  await page.waitForFunction(
    ([e, h]) => {
      const c = (new Function(`return ${e}`)() as { core: CoreLike }).core;
      return c.result !== null && c.result.buildHash !== h && c.built === c.rev && !c.busy;
    },
    [expr, before] as const,
    { timeout: 120_000, polling: 100 },
  );
  return settledHash(page, expr);
}

/** The viewer canvas inside `root` has a nonzero client size. */
export async function canvasSize(root: Locator): Promise<{ width: number; height: number }> {
  const canvas = root.locator("canvas").first();
  await canvas.waitFor({ state: "attached", timeout: 60_000 });
  const box = await canvas.boundingBox();
  return { width: box?.width ?? 0, height: box?.height ?? 0 };
}

/** Requests whose origin is not the fixture server, plus console and page errors. */
export function watchHost(page: Page): { errors: string[]; outside: string[] } {
  const w = { errors: [] as string[], outside: [] as string[] };
  page.on("console", (m) => { if (m.type() === "error") w.errors.push(m.text()); });
  page.on("pageerror", (e) => w.errors.push(String(e)));
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith(ORIGIN) && !u.startsWith("data:") && !u.startsWith("blob:")) w.outside.push(u);
  });
  return w;
}
