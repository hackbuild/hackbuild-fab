// BenchHook conformance on every baked bench (M09-T12, D-128, D-153). One
// test per bench from benches.ts, the context offline: wait for ready
// (120 s ceiling), check member types against BenchHook, settled(), round
// trip designJson through loadDesign (whole string for fab bakes, the
// parsed state for legacy pages as PIP smoke.py compares it), exportBytes
// for each declared kind, the unknown kind message (G-51), and drive on the
// first declared target. Legacy pages answer through legacy-adapters.ts,
// bundled into the page; a row an adapter declares the page lacks is not
// run with NOT_PROVIDED, and a request off file the adapter declares is
// answered locally and reported, never counted as a pass (M10-T01). Each test writes its rows under out/hook/parts;
// the global teardown merges them into out/hook/report.json.
//
// Run: npx playwright test -c tools/hook/playwright.config.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import type { BenchHook } from "@hackbuild/spec";
import { UNKNOWN_EXPORT_KIND } from "@hackbuild/spec";
import { listBenches, type BenchUnderTest } from "./benches.ts";
import { ADAPTERS, NO_DRIVE, NOT_PROVIDED, type LegacyAdapter } from "./legacy-adapters.ts";
import { roundtrip } from "./roundtrip.ts";
import { bundleAdapters, routeDeclared } from "./adapter-page.ts";
import { partFile, PARTS_DIR, type BenchReport, type Row } from "./rows.ts";

/** What a member of BenchHook must be at runtime; keyed by every key of the spec type, so a new member fails tsc here. */
type Kind = "boolean" | "count" | "function" | "array" | "string or null" | "defined" | "verbs";
const MEMBERS: { readonly [K in keyof Required<BenchHook>]: Kind } = {
  ready: "boolean",
  state: "defined",
  model: "defined",
  rev: "count",
  built: "count",
  busy: "boolean",
  buildHash: "string or null",
  error: "string or null",
  log: "array",
  settled: "function",
  loadDesign: "function",
  designJson: "function",
  ensureMesh: "function",
  commit: "function",
  drive: "function",
  release: "function",
  exportBytes: "function",
  verbs: "verbs",
};

/** Kinds whose bytes are a zip archive and start with the signature PK. */
const ZIP_KINDS = new Set(["3mf", "stl", "kit"]);
const READY_MS = 120000;
const UNKNOWN_KIND = "no-such-kind";

const corpus = await listBenches();
type HookGlobal = { __hbfHook: BenchHook; __HBF_ADAPTERS: Record<string, { adapt(g: unknown): BenchHook; example?(g: unknown): void; driveTargets(g: unknown): string[]; isReady?(g: unknown): boolean }>; BENCH?: { ready?: unknown } };

const adapterOf = (b: BenchUnderTest): LegacyAdapter | null => (b.adapter === null ? null : ADAPTERS[b.adapter]);

async function installHook(page: Page, b: BenchUnderTest): Promise<void> {
  const id = b.adapter ?? "";
  if (adapterOf(b)?.isReady) {
    // A page that keeps no BENCH (or a BENCH whose ready is a function) is ready when its adapter says so.
    await page.addScriptTag({ content: await bundleAdapters() });
    try {
      await page.waitForFunction((a) => (globalThis as unknown as HookGlobal).__HBF_ADAPTERS[a]?.isReady?.(globalThis) === true, id, { timeout: READY_MS });
    } catch {
      throw new Error(`${b.adapter}: adapter isReady not true after ${READY_MS} ms`);
    }
  } else {
    try {
      await page.waitForFunction(() => (globalThis as unknown as HookGlobal).BENCH?.ready === true, null, { timeout: READY_MS });
    } catch {
      const has = await page.evaluate(() => typeof (globalThis as unknown as HookGlobal).BENCH);
      throw new Error(has === "undefined" ? `no BENCH global after ${READY_MS} ms` : `BENCH.ready not true after ${READY_MS} ms`);
    }
    if (b.adapter === null) {
      await page.evaluate(() => { const g = globalThis as unknown as HookGlobal; g.__hbfHook = g.BENCH as unknown as BenchHook; });
      return;
    }
    await page.addScriptTag({ content: await bundleAdapters() });
  }
  await page.evaluate((a) => {
    const g = globalThis as unknown as HookGlobal;
    const ad = g.__HBF_ADAPTERS[a];
    if (!ad) throw new Error(`adapter ${a} missing from the bundle`);
    g.__hbfHook = ad.adapt(globalThis);
  }, id);
}

async function memberErrors(page: Page): Promise<string[]> {
  return page.evaluate((members) => {
    const h = (globalThis as unknown as HookGlobal).__hbfHook as unknown as Record<string, unknown>;
    const bad: string[] = [];
    for (const [k, kind] of Object.entries(members)) {
      const v = h[k];
      const ok =
        kind === "boolean" ? typeof v === "boolean"
        : kind === "count" ? Number.isInteger(v) && (v as number) >= 0
        : kind === "function" ? typeof v === "function"
        : kind === "array" ? Array.isArray(v)
        : kind === "string or null" ? v === null || typeof v === "string"
        : kind === "defined" ? v !== undefined
        : v === undefined || (typeof v === "object" && v !== null && Object.values(v).every((f) => typeof f === "function"));
      if (!ok) bad.push(`${k} is ${v === null ? "null" : Array.isArray(v) ? "array" : typeof v}, want ${kind}`);
    }
    return bad;
  }, MEMBERS);
}

async function driveTargets(page: Page, b: BenchUnderTest): Promise<string[]> {
  if (b.adapter !== null) {
    return page.evaluate((id) => {
      const g = globalThis as unknown as HookGlobal;
      return [...(g.__HBF_ADAPTERS[id]?.driveTargets(globalThis) ?? [])];
    }, b.adapter);
  }
  const decl = b.drive;
  if (!decl) return [];
  // DriveDecl.targets "metrics.<group>": the metrics of that group, target named by the id segment after the group.
  return page.evaluate((targets) => {
    const [from, group] = targets.split(".");
    const model = (globalThis as unknown as HookGlobal).__hbfHook.model as { metrics?: readonly { id: string; group?: string }[] } | null;
    if (from !== "metrics" || !group) throw new Error(`drive targets ${targets}: only metrics.<group> is read here`);
    if (!Array.isArray(model?.metrics)) throw new Error(`drive targets ${targets}: hook model has no metrics`);
    const out: string[] = [];
    for (const m of model.metrics) {
      const t = m.group === group ? m.id.split(".")[1] : undefined;
      if (t !== undefined && !out.includes(t)) out.push(t);
    }
    return out;
  }, decl.targets);
}

test.describe.configure({ mode: "parallel" });

test("the bake wrote at least one fab bench", () => {
  const fab = corpus.benches.filter((b) => b.origin === "fab");
  expect(fab.length, "no fab bake under dist/bench; run node tools/bake/bake.mjs --all").toBeGreaterThan(0);
});

for (const b of corpus.benches) {
  test(`hook ${b.name}`, async ({ browser }) => {
    test.setTimeout(540000);
    const rows: Record<string, Row> = {};
    const report: BenchReport = { name: b.name, rel: b.rel, origin: b.origin, sha256: b.sha256, adapter: b.adapter, tests: rows };
    const write = () => {
      mkdirSync(PARTS_DIR, { recursive: true });
      writeFileSync(partFile(b.name), JSON.stringify(report, null, 1) + "\n");
    };
    const adapter = adapterOf(b);
    const example = adapter?.example !== undefined;
    const lacks = new Set(adapter?.lacks ?? []);
    const steps = ["ready", "members", "settled", ...(example ? ["example"] : []), "roundtrip", ...b.exports.map((k) => `export ${k}`), "unknown kind", "drive", ...(lacks.has("readout") ? ["drive readout"] : []), "network", "console"];
    const notRun = (reason: string, from: string) => {
      for (const s of steps.slice(steps.indexOf(from))) if (!rows[s]) rows[s] = { result: "not run", reason };
    };
    const step = async (name: string, fn: () => Promise<Row | void>): Promise<boolean> => {
      try {
        rows[name] = (await fn()) ?? { result: "pass" };
      } catch (e) {
        rows[name] = { result: "fail", reason: (e instanceof Error ? e.message : String(e)).split("\n")[0] ?? "" };
      }
      return rows[name]?.result !== "fail";
    };

    if (b.problem) {
      rows["adapter"] = { result: "fail", reason: b.problem };
      notRun(`no hook: ${b.problem}`, "ready");
      write();
      throw new Error(b.problem);
    }

    const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    await context.setOffline(true);
    const declaredPrefixes = await routeDeclared(context, adapter);
    const page = await context.newPage();
    const requests: string[] = [];
    const declared: string[] = [];
    const errors: string[] = [];
    page.on("request", (r) => {
      if (/^(file|data|blob):/.test(r.url())) return;
      (declaredPrefixes.some((p) => r.url().startsWith(p)) ? declared : requests).push(r.url());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    try {
      await page.goto(`file://${b.file}`);
      if (!(await step("ready", () => installHook(page, b)))) {
        notRun("hook not ready", "members");
      } else {
        await step("members", async () => {
          const bad = await memberErrors(page);
          if (bad.length) throw new Error(bad.join("; "));
          const none = (["state", "model"] as const).filter((m) => lacks.has(m));
          if (none.length) return { result: "pass", reason: `${none.join(", ")} ${NOT_PROVIDED}; the hook answers null` };
        });
        const settled = await step("settled", () => page.evaluate((ms) => (globalThis as unknown as HookGlobal).__hbfHook.settled(ms), READY_MS));
        const seeded = settled && (!example || await step("example", () => page.evaluate(async ([id, ms]) => {
          const g = globalThis as unknown as HookGlobal;
          const h = g.__hbfHook;
          const rev = h.rev;
          g.__HBF_ADAPTERS[id]?.example?.(globalThis);
          await h.settled(ms);
          if (h.built <= rev) throw new Error(`example left built at ${h.built}, rev before ${rev}`);
        }, [b.adapter ?? "", READY_MS] as const)));
        if (!settled) {
          notRun("hook never settled", "roundtrip");
        } else if (!seeded) {
          notRun("the example design did not load", "roundtrip");
        } else {
          if (lacks.has("roundtrip")) rows["roundtrip"] = { result: "not run", reason: `${b.name}: designJson and loadDesign ${NOT_PROVIDED}` };
          else await step("roundtrip", () => roundtrip(page, b.origin, READY_MS));
          for (const kind of b.exports) {
            await step(`export ${kind}`, async () => {
              const b64 = await page.evaluate((k) => (globalThis as unknown as HookGlobal).__hbfHook.exportBytes(k), kind);
              if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw new Error(`exportBytes(${kind}) is not non-empty base64`);
              const bytes = Buffer.from(b64, "base64");
              if (bytes.length === 0) throw new Error(`exportBytes(${kind}) decodes to 0 bytes`);
              if (ZIP_KINDS.has(kind) && bytes.subarray(0, 2).toString("latin1") !== "PK") {
                throw new Error(`exportBytes(${kind}) starts ${bytes.subarray(0, 2).toString("hex")}, want the zip signature PK`);
              }
            });
          }
          if (lacks.has("exports")) rows["unknown kind"] = { result: "not run", reason: `${b.name}: exportBytes ${NOT_PROVIDED}` };
          else await step("unknown kind", async () => {
            const msg = await page.evaluate(async (k) => {
              try {
                await (globalThis as unknown as HookGlobal).__hbfHook.exportBytes(k);
                return "resolved";
              } catch (e) {
                return e instanceof Error ? e.message : `threw ${typeof e}`;
              }
            }, UNKNOWN_KIND);
            if (msg !== UNKNOWN_EXPORT_KIND + UNKNOWN_KIND) throw new Error(`exportBytes(${UNKNOWN_KIND}) gave "${msg}", want "${UNKNOWN_EXPORT_KIND}${UNKNOWN_KIND}"`);
          });
          await step("drive", async () => {
            const targets = await driveTargets(page, b);
            if (targets.length === 0) {
              if (b.origin === "legacy") {
                const r = await page.evaluate(() => (globalThis as unknown as HookGlobal).__hbfHook.drive("none", true));
                if (r["readout"] !== NO_DRIVE) throw new Error(`a bench with no pad drove: ${JSON.stringify(r)}`);
                return { result: "not run", reason: `${b.name}: ${NO_DRIVE}` };
              }
              if (!b.drive) return { result: "not run", reason: "bench declares no drive overlay" };
              throw new Error(`drive targets ${b.drive.targets} resolved to none`);
            }
            const target = targets[0] ?? "";
            const r = await page.evaluate(async (t) => {
              const h = (globalThis as unknown as HookGlobal).__hbfHook;
              const rec = await h.drive(t, true);
              await h.release(t);
              return rec;
            }, target);
            if (r["target"] !== target) throw new Error(`drive(${target}) answered target ${String(r["target"])}`);
            const said = Object.entries(r).filter(([k, v]) => k !== "target" && v !== "" && v !== NO_DRIVE);
            if (said.length === 0) throw new Error(`drive(${target}) readout is empty: ${JSON.stringify(r)}`);
            if (lacks.has("readout")) {
              // The page moved (the record names what) but shows no readout; the readout row is not run.
              if (r["readout"] !== NOT_PROVIDED) throw new Error(`drive(${target}) readout ${String(r["readout"])}, adapter declares none`);
              rows["drive readout"] = { result: "not run", reason: `${b.name}: drive readout ${NOT_PROVIDED}` };
              return { result: "pass", reason: `drive(${target}) moved the page: ${JSON.stringify(r)}` };
            }
            if (typeof r["readout"] === "string" && !r["readout"].includes(target)) {
              throw new Error(`drive(${target}) readout does not name the target: ${r["readout"]}`);
            }
            return { result: "pass", reason: `drive(${target}): ${JSON.stringify(r)}` };
          });
        }
      }
      rows["network"] = requests.length > 0
        ? { result: "fail", reason: `${requests.length} requests off file and data: ${requests.slice(0, 3).join(", ")}` }
        : declared.length > 0
          ? { result: "not run", reason: `zero network ${NOT_PROVIDED}: ${declared.length} declared requests answered locally (${[...new Set(declared.map((u) => new URL(u).host))].join(", ")}; ${adapter?.offline?.record ?? ""})` }
          : { result: "pass" };
      rows["console"] = errors.length === 0 ? { result: "pass" } : { result: "fail", reason: `${errors.length} console errors: ${errors.slice(0, 2).join(" | ")}` };
    } finally {
      write();
      await context.close();
    }
    const failed = Object.entries(rows).filter(([, r]) => r.result === "fail").map(([k, r]) => `${k}: ${r.reason ?? ""}`);
    expect(failed, `${b.name} (${b.rel})`).toEqual([]);
  });
}
