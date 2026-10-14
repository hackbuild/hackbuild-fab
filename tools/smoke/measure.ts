// Shared measures of the smoke suite (M09-T14): which bakes exist, how a
// bench is opened and settled, how a step is reached, horizontal overflow
// in the overflow.py form (PIP test/overflow.py), and the DOM voice lint
// through `node tools/lint-voice.mjs --stdin --kind dom` (D-004).
// The bake lists are read from dist, never typed: every dist/bench/*.html
// is a fab bench, every dist/kit/*.html a kit page.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Locator, Page } from "@playwright/test";
import { useHostBuild, type Host } from "./host-build.ts";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const OUT = path.join(ROOT, "out/smoke");
/** Screenshot folder: SHOTS_DIR when set (the owner points it at the evidence folder), else out/smoke/shots. */
export const SHOTS = process.env["SHOTS_DIR"] ?? path.join(OUT, "shots");
/** The three widths of the overflow law (RULES.md design law, UI.md section 11). */
export const WIDTHS = [390, 768, 1280] as const;
export const HEIGHT = 844;
const READY_MS = 60_000;
const SETTLE_MS = 120_000;

const htmlIn = (dir: string): string[] =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".html")).sort().map((f) => path.join(dir, f)) : [];

export interface Bake {
  id: string;
  file: string;
  kind: "bench" | "kit";
  /** The node build host that stands in for an in-page build, by bake id; null when none exists. */
  host: "flex-pair" | null;
}

/** The build hosts tools/smoke/host-build.ts can start, keyed by bake id. */
const HOSTS: Readonly<Record<string, "flex-pair">> = { "flex-pair": "flex-pair" };

export function bakes(): Bake[] {
  const out: Bake[] = [];
  for (const file of htmlIn(path.join(ROOT, "dist/bench"))) {
    const id = path.basename(file, ".html");
    out.push({ id, file, kind: "bench", host: HOSTS[id] ?? null });
  }
  for (const file of htmlIn(path.join(ROOT, "dist/kit"))) out.push({ id: path.basename(file, ".html"), file, kind: "kit", host: null });
  return out;
}

export interface HookView {
  ready: boolean;
  rev: number;
  built: number;
  busy: boolean;
  error: string | null;
}

export const hookView = (page: Page): Promise<HookView> =>
  page.evaluate(() => {
    const B = (globalThis as unknown as { BENCH: HookView }).BENCH;
    return { ready: B.ready, rev: B.rev, built: B.built, busy: B.busy, error: B.error };
  });

export async function settled(page: Page, after = -1): Promise<void> {
  await page.waitForFunction((n) => {
    const B = (globalThis as unknown as { BENCH?: HookView }).BENCH;
    return B !== undefined && B.ready && !B.busy && B.built === B.rev && B.built > n;
  }, after, { timeout: SETTLE_MS });
}

/** Opens a bake; a bench waits for ready and the first settled build, a kit for its root. */
export async function open(page: Page, bake: Bake, host: Host | null): Promise<number> {
  const t0 = Date.now();
  if (bake.kind === "bench" && host !== null) await useHostBuild(page, host);
  await page.goto(pathToFileURL(bake.file).href);
  if (bake.kind === "kit") {
    await page.waitForSelector("body *", { timeout: READY_MS });
    return Date.now() - t0;
  }
  await page.waitForFunction(() => (globalThis as unknown as { BENCH?: { ready: boolean } }).BENCH?.ready === true, undefined, { timeout: READY_MS });
  const ms = Date.now() - t0;
  await settled(page);
  return ms;
}

/** The steps strip as the card names it (M09-T14 acceptance); never [role=tab]. */
export const stepButtons = (page: Page): Locator => page.locator("nav[aria-label=steps] button");

export async function closeWelcome(page: Page, tap = false): Promise<void> {
  const d = page.locator('[data-hb="welcome-dismiss"]');
  if (await d.isVisible()) await (tap ? d.tap() : d.click());
  await page.locator('[data-hb="welcome"]').waitFor({ state: "hidden" });
}

export interface Overflow {
  scrollWidth: number;
  width: number;
  /** Up to 8 elements whose right edge passes the viewport, with that edge in px. */
  offenders: string[];
}

export const overflow = (page: Page): Promise<Overflow> =>
  page.evaluate(() => {
    const width = window.innerWidth;
    const offenders = Array.from(document.querySelectorAll("body *"))
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.right > width + 0.5 && r.width > 0;
      })
      .slice(0, 8)
      .map((e) => `${e.tagName.toLowerCase()}${e.id === "" ? "" : `#${e.id}`}.${Array.from(e.classList).join(".")} ${Math.round(e.getBoundingClientRect().right)}`);
    return { scrollWidth: document.documentElement.scrollWidth, width, offenders };
  });

export const overflowMessage = (where: string, o: Overflow): string =>
  `${where}: scrollWidth ${o.scrollWidth} px over viewport ${o.width} px (measured)\n${o.offenders.map((x) => `  ${x}`).join("\n")}`;

export interface Voice {
  code: number;
  out: string;
}

/** Pipes the rendered text of the page to lint-voice as kind dom. */
export async function voice(page: Page): Promise<Voice> {
  const text = await page.evaluate(() => document.body.innerText);
  const r = spawnSync(process.execPath, [path.join(ROOT, "tools/lint-voice.mjs"), "--stdin", "--kind", "dom"], { input: text, encoding: "utf8", cwd: ROOT });
  return { code: r.status ?? 70, out: `${r.stdout}${r.stderr}`.trim() };
}

export function shot(name: string): string {
  mkdirSync(SHOTS, { recursive: true });
  return path.join(SHOTS, name);
}

/** Writes one report part under out/smoke; the spec that owns the name owns the file. */
export function writeReport(name: string, body: unknown): string {
  mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, name);
  writeFileSync(file, `${JSON.stringify(body, null, 1)}\n`);
  return file;
}

/** The touch target floor (UI.md section 11, G-52, G-54), px. */
export const TARGET_PX = 44;

export interface SmallTarget {
  el: string;
  w: number;
  h: number;
}

/**
 * Visible controls under 44 x 44 px. A checkbox or radio inside a label is
 * measured by its label, the box a finger hits. Screen-reader-only and
 * aria-hidden controls are not targets.
 */
export const smallTargets = (page: Page, within = "body"): Promise<SmallTarget[]> =>
  page.evaluate(([sel, px]) => {
    const root = document.querySelector(sel);
    if (root === null) return [];
    const out: { el: string; w: number; h: number }[] = [];
    const q = "button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=slider], [tabindex]:not([tabindex='-1'])";
    for (const node of Array.from(root.querySelectorAll(q))) {
      const e = node as HTMLElement;
      if (e.closest("[aria-hidden=true], .hb-sr") !== null) continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const box = (e instanceof HTMLInputElement && (e.type === "checkbox" || e.type === "radio") && e.closest("label") !== null ? e.closest("label") as HTMLElement : e).getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (box.width + 0.5 < px || box.height + 0.5 < px) {
        const hb = e.getAttribute("data-hb");
        out.push({ el: `${e.tagName.toLowerCase()}${hb === null ? "" : `[data-hb=${hb}]`}.${Array.from(e.classList).slice(0, 2).join(".")} "${(e.textContent ?? e.getAttribute("aria-label") ?? "").trim().slice(0, 20)}"`, w: Math.round(box.width), h: Math.round(box.height) });
      }
    }
    return out;
  }, [within, TARGET_PX] as [string, number]);
