// The gold suite's benches, applicability and opener (TESTING.md 8.5,
// D-212). The benches are derived: every fab bake in dist/bench that has a
// build (an in-page build or a node build host) and every legacy bake in
// dist/legacy with a BenchHook adapter (PIP at M09). Each gold test is
// titled `<G id> <rule> [<bench>] @gold` and carries the bench id as an
// annotation, which tools/gold/report.mjs reads.
//
// Applicability is a predicate over the bench declaration (spec/bench.ts,
// chase.ts): drive pad, contact model, composer, hookup panel, firmware
// export, light fields, step cams, plate and xray views, presets. A
// legacy page has no BenchDecl and stays byte-identical (D-142): a rule
// whose subject the page does not have (a checks panel, CHECKS.md 2.7 step
// scope, a done badge, a declared cam, view or focus, a viewer accessor)
// is n/a with the reason in LEGACY_NA, which rests on a proposed decision
// the owner has not recorded; any other rule the page cannot answer is
// reported not run with the reason. The worker fixture `applicability`
// writes out/smoke/gold.json. The kit page (dist/kit/kit.html) is a
// component gallery with no BenchHook and is out of gold scope.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test as base, type Page, type TestInfo } from "@playwright/test";
import type { BenchHook } from "@hackbuild/spec";
import { listBenches, type BenchUnderTest } from "../../hook/benches.ts";
import { startHost, useHostBuild, type Host } from "../host-build.ts";
import { closeWelcome, ROOT, settled } from "../measure.ts";
import { watch, type Watch } from "../network.ts";

export interface GoldBench {
  id: string;
  under: BenchUnderTest;
  origin: "fab" | "legacy";
  host: boolean;
  /** Rule id to the predicate that was false; absent rules apply. */
  na: Record<string, string>;
  /** Selectors the DOM rules read; legacy pages name their own. */
  dom: Dom;
  /** RailStep.focus per step from the bench declaration; null where a step declares none. */
  focus: (string | null)[];
}

export interface Dom {
  header: string; stepsNav: string; steps: string; guide: string; status: string; meshChip: string;
  params: string; stage: string; pad: string; padKey: string; padRead: string; legend: string; cams: string; welcome: string; rail: string;
  /** A rail panel and the note element inside it (G-42). */
  panel: string; note: string;
  /** The status chip that counts warnings (G-36). */
  warnChip: string;
  /** One material slot row holding a colour input, a name input and a slot select (G-05); absent where none. */
  slotRow?: string;
}

const FAB_DOM: Dom = {
  header: ".hb-header", stepsNav: "nav[aria-label=steps]", steps: "nav[aria-label=steps] button", guide: '[data-hb="guide-strip"]',
  status: '[data-hb="status"]', meshChip: '[data-hb="chip-mesh"]', params: '[data-hb="param"][data-path] input',
  stage: '[data-hb="stage"]', pad: '[data-hb="drive-pad"]', padKey: '[data-hb="drive-key"]', padRead: '[data-hb="drive-read"]',
  legend: '[data-hb="legend"]', cams: '[data-hb="cam"], [data-hb="mode"]', welcome: '[data-hb="welcome"]', rail: '[data-hb="rail"], [data-hb="rail-left"]',
  panel: ".hb-panel", note: '[data-hb="note"]', warnChip: '[data-hb="chip-warn"]',
};
/** PIP bench/part1.html ids: #hdr, #steps, #guide, #rail inputs keyed by data-p, #stage, #pad, #status with #stChips. */
const LEGACY_DOM: Record<string, Dom> = {
  pip: {
    header: "#hdr", stepsNav: "#steps", steps: "#steps button", guide: "#guide", status: "#status", meshChip: "#stChips span",
    params: "#rail input[data-p]", stage: "#stage", pad: "#pad", padKey: "#padKeys button[data-k]", padRead: "#padRead",
    legend: "#legend", cams: "#cams button", welcome: "#welcome", rail: "#rail",
    // part3.js chips(): bed, mesh, warnings, routing, in that order.
    panel: ".panel", note: ".note", slotRow: "#slots .slot", warnChip: "#stChips span:nth-child(3)",
  },
};
/** Bench-layer rules a legacy page has no subject for, per adapter, with the reason (proposed decision, M09 gold fixes). */
const LEGACY_NA: Record<string, Record<string, string>> = {
  pip: {
    "G-15": "legacy viewer: VIEW exposes fit, orbit and preset but no projected model bounds (bench/part3.js)",
    "G-16": "legacy viewer: VIEW exposes no per-body opacity (bench/part3.js)",
    "G-17": "legacy viewer: VIEW exposes no explode, xray, section or camera state to compare with the cams strip (bench/part3.js)",
    "G-18": "legacy page runs no CHK-PRT-16; its bed chip reads MODEL.M.plate.fits",
    "G-33": "legacy page has no checks panel",
    "G-40": "legacy step buttons carry no done or visited mark (part1.html #steps)",
    "G-44": "legacy steps declare no cam or view",
    "G-45": "legacy status strip carries no scope mark",
    "G-53": "legacy steps declare no focal derived value",
  },
};
const HOSTS = new Set(["flex-pair"]);

interface Decl {
  chase: { meta: { kind: string }; exports: readonly { kind: string }[]; presets?: readonly unknown[]; params: readonly { fields?: readonly { commit?: string }[] }[] };
  bench: { views: { modes?: readonly string[]; render?: readonly string[]; drive?: { contact?: string } }; rail?: readonly { panels?: readonly string[]; cam?: string; view?: string; focus?: string }[] } | null;
}

async function declOf(b: BenchUnderTest): Promise<Decl> {
  const { findManifests } = await import("../../bake/bake.mjs");
  for (const m of findManifests(ROOT) as string[]) {
    const j = JSON.parse(readFileSync(m, "utf8")) as { id?: string; shell?: string };
    if (j.shell !== "ui" || `${String(j.id)}.html` !== path.basename(b.file)) continue;
    const dir = path.dirname(m);
    const chase = ((await import(path.join(dir, "chase.ts"))) as { chase: Decl["chase"] }).chase;
    const bench = ((await import(path.join(dir, "bench.ts"))) as { bench?: Decl["bench"] }).bench ?? null;
    return { chase, bench };
  }
  throw new Error(`no bake.json writes ${b.rel}`);
}

/** The predicates of TESTING.md 8.5 Applicability, per rule. */
function naOf(d: Decl): Record<string, string> {
  const na: Record<string, string> = {};
  const drive = d.bench?.views.drive;
  const panels = (d.bench?.rail ?? []).flatMap((s) => s.panels ?? []);
  const set = (ids: string[], why: string): void => {
    for (const id of ids) na[id] ??= why;
  };
  if (drive === undefined) set(["G-19", "G-20", "G-21", "G-22", "G-23", "G-24", "G-52"], "no drive pad");
  else if (drive.contact === undefined) set(["G-19", "G-20"], "no contact model");
  if (d.chase.meta.kind !== "composer") set(["G-38"], "not a composer with instances");
  if (!panels.includes("hookup")) set(["G-29"], "no hookup panel");
  if (!d.chase.exports.some((e) => e.kind === "ino")) set(["G-50"], "no firmware export");
  if (!d.chase.params.some((g) => (g.fields ?? []).some((f) => f.commit === "light"))) set(["G-05"], "no light field (colour, name or slot) declared");
  if (!(d.bench?.rail ?? []).some((s) => s.cam !== undefined || s.view !== undefined)) set(["G-44"], "no step declares a cam or view");
  if (!(d.bench?.views.modes ?? []).includes("plate")) set(["G-18"], "no plate view");
  if (!(d.bench?.views.render ?? []).includes("xray")) set(["G-16"], "no ghost or xray render");
  if ((d.chase.presets ?? []).length === 0) set(["G-12", "G-48"], "no presets");
  return na;
}

let cache: GoldBench[] | null = null;

export async function goldBenches(): Promise<GoldBench[]> {
  if (cache !== null) return cache;
  const { benches } = await listBenches();
  const out: GoldBench[] = [];
  for (const b of benches) {
    if (b.problem !== null) continue;
    if (b.origin === "fab" && b.rel.startsWith(`dist${path.sep}bench`)) {
      const id = path.basename(b.file, ".html");
      if (!HOSTS.has(id)) continue;
      const d = await declOf(b);
      out.push({ id, under: b, origin: "fab", host: true, na: naOf(d), dom: FAB_DOM, focus: (d.bench?.rail ?? []).map((r) => r.focus ?? null) });
    } else if (b.origin === "legacy" && b.rel.startsWith(`dist${path.sep}legacy`) && b.adapter !== null && LEGACY_DOM[b.adapter] !== undefined) {
      out.push({ id: b.adapter, under: b, origin: "legacy", host: false, na: { ...(LEGACY_NA[b.adapter] ?? {}) }, dom: LEGACY_DOM[b.adapter] as Dom, focus: [] });
    }
  }
  cache = out;
  return out;
}

export function writeApplicability(benches: GoldBench[]): void {
  const dir = path.join(ROOT, "out/smoke");
  mkdirSync(dir, { recursive: true });
  const body = {
    about: "gold applicability, written by tools/smoke/gold/gold.ts (TESTING.md 8.5); a rule absent from rules applies",
    benches: benches.map((b) => ({
      id: b.id, rel: b.under.rel, sha256: b.under.sha256, buildHash: null,
      rules: Object.fromEntries(Object.entries(b.na).sort().map(([id, reason]) => [id, { applies: false, reason }])),
    })),
  };
  writeFileSync(path.join(dir, "gold.json"), `${JSON.stringify(body, null, 1)}\n`);
}

type Hooked = { __hbfHook: BenchHook; BENCH?: { ready?: unknown }; __HBF_ADAPTERS?: Record<string, { adapt(g: unknown): BenchHook; example?(g: unknown): void } & Partial<Record<LegacyRead, (g: unknown) => unknown>>> };

/** Adapter reads a gold rule may call on a legacy page (tools/hook/legacy-adapters.ts). */
export type LegacyRead = "stageObjects" | "warnings";

/** Calls one adapter read in the page; notRun when the adapter has none. */
export async function legacyRead<T>(page: Page, b: GoldBench, read: LegacyRead): Promise<T> {
  const r = await page.evaluate(([id, k]) => {
    const a = (globalThis as unknown as Hooked).__HBF_ADAPTERS?.[id];
    const f = a?.[k as LegacyRead];
    return f === undefined ? { has: false, value: null } : { has: true, value: f(globalThis) };
  }, [b.id, read] as const);
  if (!r.has) notRun(`${b.id}: the adapter has no ${read} read`);
  return r.value as T;
}

let adapterBundle: string | null = null;
async function adapters(): Promise<string> {
  if (adapterBundle !== null) return adapterBundle;
  const { build } = await import("esbuild-wasm");
  const r = await build({
    stdin: { contents: `import { ADAPTERS } from "./legacy-adapters.ts"; globalThis.__HBF_ADAPTERS = ADAPTERS;`, resolveDir: path.join(ROOT, "tools/hook"), sourcefile: "gold-adapters.entry.ts", loader: "ts" },
    resolveExtensions: [".ts", ".js", ".mjs", ".json"], bundle: true, format: "iife", platform: "browser", target: "es2022", write: false, logLevel: "warning",
  });
  adapterBundle = r.outputFiles[0]?.text ?? "";
  return adapterBundle;
}

export interface Opened {
  watch: Watch;
  readyMs: number;
}

/**
 * Opens a gold bench: the build host behind a fab bake, the adapter onto a
 * legacy page as `__hbfHook`, the welcome closed (PIP: its worked example,
 * as smoke.py drives it). Every rule reads the hook as `__hbfHook`.
 */
export async function openGold(page: Page, b: GoldBench, host: Host | null, opts: { welcome?: boolean } = {}): Promise<Opened> {
  const w = await watch(page);
  if (b.host && host !== null) await useHostBuild(page, host);
  const t0 = Date.now();
  await page.goto(pathToFileURL(b.under.file).href);
  await page.waitForFunction(() => (globalThis as unknown as Hooked).BENCH?.ready === true, undefined, { timeout: 120_000 });
  const readyMs = Date.now() - t0;
  if (b.origin === "fab") {
    await page.evaluate(() => { const g = globalThis as unknown as Hooked; g.__hbfHook = g.BENCH as unknown as BenchHook; });
    await settled(page);
    if (opts.welcome !== true) await closeWelcome(page);
  } else {
    await page.addScriptTag({ content: await adapters() });
    await page.evaluate((id) => {
      const g = globalThis as unknown as Hooked;
      const a = g.__HBF_ADAPTERS?.[id];
      if (a === undefined) throw new Error(`adapter ${id} missing`);
      g.__hbfHook = a.adapt(globalThis);
      if (a.example !== undefined) a.example(globalThis);
    }, b.id);
    await hookSettled(page);
  }
  return { watch: w, readyMs };
}

export const hookSettled = (page: Page, ms = 120_000): Promise<void> =>
  page.evaluate((t) => (globalThis as unknown as Hooked).__hbfHook.settled(t), ms);

/** Reads hook fields in the page. */
export const hook = <T>(page: Page, fn: (h: BenchHook) => T): Promise<T> =>
  page.evaluate(`(${fn.toString()})(globalThis.__hbfHook)`) as Promise<T>;

/** Marks the running test not run with a reason (D-153); the report grades it `not run`. */
export function notRun(reason: string): never {
  base.skip(true, `not run: ${reason}`);
  throw new Error("unreachable");
}

interface GoldFixtures {
  bench: GoldBench;
  host: Host | null;
}

interface GoldWorker {
  applicability: GoldBench[];
}

export const test = base.extend<GoldFixtures, GoldWorker>({
  applicability: [async ({}, use) => {
    const benches = await goldBenches();
    writeApplicability(benches);
    await use(benches);
  }, { scope: "worker", auto: true }],
  bench: [undefined as unknown as GoldBench, { option: true }],
  host: async ({ bench }, use) => {
    const h = bench !== undefined && bench.host ? await startHost() : null;
    await use(h);
    h?.close();
  },
});

/**
 * Declares one gold rule on every gold bench: the title starts with the G
 * id, the bench rides as an annotation, an n/a bench skips with its
 * predicate. `tags` adds `@touch` for the touch-390 project.
 */
export function rule(
  id: string,
  title: string,
  body: (args: { page: Page; bench: GoldBench; host: Host | null; info: TestInfo }) => Promise<void>,
  opts: { touch?: boolean; timeout?: number } = {},
): void {
  const benches = goldBenchesSync();
  for (const b of benches) {
    test.describe(() => {
      test.use({ bench: b });
      test(`${id} ${title} [${b.id}] @gold${opts.touch === true ? " @touch" : ""}`, { annotation: { type: "bench", description: b.id } }, async ({ page, host }, info) => {
        info.setTimeout(opts.timeout ?? 240_000);
        const na = b.na[id];
        if (na !== undefined) {
          test.skip(true, `n/a: ${na}`);
          return;
        }
        await body({ page, bench: b, host, info });
      });
    });
  }
}

/** The bench list at collection time; Playwright collects specs synchronously after top-level await. */
const collected: GoldBench[] = await goldBenches();
function goldBenchesSync(): GoldBench[] {
  return collected;
}

/** A rule this card leaves to M10-T17 (chase-bound rows of the Exit table). */
export function chaseBound(id: string, title: string): void {
  rule(id, title, async () => notRun("chase-bound row; M10-T17 adds it to this file"));
}

export interface NumField {
  /** The attribute text: a JSON pointer (fab) or a dotted path (PIP data-p). */
  key: string;
  path: (string | number)[];
  min: number;
  max: number;
  step: number;
}

/** Numeric rail fields with a declared range, read from the inputs the bench renders. */
export const numericFields = (page: Page, b: GoldBench): Promise<NumField[]> =>
  page.evaluate((sel) => {
    const out: { key: string; path: (string | number)[]; min: number; max: number; step: number }[] = [];
    const seen = new Set<string>();
    for (const el of Array.from(document.querySelectorAll<HTMLInputElement>(sel))) {
      if (el.type !== "number" && el.type !== "range") continue;
      const host = el.closest("[data-path]");
      const key = host?.getAttribute("data-path") ?? el.getAttribute("data-p") ?? "";
      if (key === "" || seen.has(key)) continue;
      const min = Number(el.min), max = Number(el.max), step = Number(el.step) || 1;
      if (el.min === "" || el.max === "" || !Number.isFinite(min) || !Number.isFinite(max)) continue;
      seen.add(key);
      const path = key.startsWith("/") ? key.slice(1).split("/").map((s) => (/^\d+$/.test(s) ? Number(s) : s)) : key.split(".");
      out.push({ key, path, min, max, step });
    }
    return out;
  }, b.dom.params);

/** Writes one field through the hook's state setter, as an agent does. */
export const writeField = (page: Page, path: (string | number)[], value: unknown): Promise<void> =>
  page.evaluate(([p, v]) => {
    const h = (globalThis as unknown as { __hbfHook: { state: unknown } }).__hbfHook;
    const s = structuredClone(h.state) as Record<string | number, unknown>;
    let o = s;
    for (const k of (p as (string | number)[]).slice(0, -1)) o = o[k] as Record<string | number, unknown>;
    o[(p as (string | number)[]).at(-1) as string | number] = v;
    h.state = s;
  }, [path, value] as [unknown, unknown]);

export const readField = (page: Page, path: (string | number)[]): Promise<unknown> =>
  page.evaluate((p) => {
    let o = (globalThis as unknown as { __hbfHook: { state: unknown } }).__hbfHook.state as unknown;
    for (const k of p) o = (o as Record<string | number, unknown>)[k];
    return o;
  }, path);
