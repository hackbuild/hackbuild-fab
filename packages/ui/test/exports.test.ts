// @vitest-environment happy-dom
/// <reference path="../src/vue-shim.d.ts" />
// R1-engine-04: @hackbuild/ui exports its components (PLAN.md 4, tier 3
// row). The library build runs first, so the test reads the package as a
// consumer does, through package.json exports, and never a stale dist.
// The names below are the brief's list, written here and not read from
// src/index.ts; a name dropped from index.ts fails the first test. The
// flex-pair chase and bench are the reference's own files.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, nextTick } from "vue";
import { createPinia } from "pinia";
import { BENCH_GLOBAL } from "@hackbuild/spec";
import type * as Ui from "../src/index.js";
import { chase as flexChase } from "../../../reference/keys/flex-pair/chase.js";
import { bench as flexBench } from "../../../reference/keys/flex-pair/bench.js";

// happy-dom replaces the URL global, so paths come from node:path.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = `${path.resolve(HERE, "..")}${path.sep}`;
const ROOT = `${path.resolve(HERE, "../../..")}${path.sep}`;
// A variable specifier: the package types exist only after the build, and
// tsc -p tsconfig.tests.json runs before any build.
const NAME = "@hackbuild/ui";

const EXPECTED = [
  "BenchShell", "ChecksPanel", "CurvePanel", "DrivePad", "DrivePress", "ExportsPanel", "FitsPanel", "LogPanel", "NotesPanel",
  "ParamRail", "PlotCurve", "mountBench", "pageBench", "pageOf", "useBench", "useShell",
];

let ui: typeof Ui;

beforeAll(async () => {
  const env = { ...process.env, NODE_ENV: "production" };
  const vite = `${ROOT}node_modules/vite/bin/vite.js`;
  execFileSync(process.execPath, [vite, "build"], { cwd: PKG, env, stdio: "pipe" });
  execFileSync(process.execPath, [`${ROOT}tools/vue-check.mjs`, "tsconfig.lib.json"], { cwd: PKG, env, stdio: "pipe" });
  ui = (await import(/* @vite-ignore */ NAME)) as typeof Ui;
}, 120_000);

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[BENCH_GLOBAL];
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("@hackbuild/ui exports", () => {
  it("exports exactly the bench mount, shell, panels, rail, pad, store and useBench", () => {
    expect(Object.keys(ui).sort()).toEqual([...EXPECTED].sort());
  });

  it("the package resolves to the library build and its types", async () => {
    expect(await import(/* @vite-ignore */ `${PKG}dist/index.js`)).toBe(ui);
    const types = readFileSync(`${PKG}dist/types/index.d.ts`, "utf8");
    for (const name of EXPECTED) expect(types).toMatch(new RegExp(`\\b${name}\\b`));
  });

  it("style.css is the shell sheet, byte for byte", () => {
    const req = createRequire(import.meta.url);
    const sheet = req.resolve(`${NAME}/style.css`);
    expect(readFileSync(sheet)).toEqual(readFileSync(`${PKG}src/bench/bench.css`));
  });

  it("mountBench mounts the exported BenchShell in happy-dom", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
    const errors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => void errors.push(a.map(String).join(" ")));
    const el = document.createElement("div");
    document.body.append(el);
    const mounted = ui.mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, hook: false, stage: false });
    expect(mounted).not.toBeNull();
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();
    // createApp copies the root component, so the setup function is the identity.
    const app = (el as unknown as { __vue_app__?: { _component: { setup?: unknown } } }).__vue_app__;
    expect(app?._component.setup).toBe((ui.BenchShell as { setup?: unknown }).setup);
    expect(el.querySelector(".hb-header h1")?.textContent?.trim()).toBe("FLEX PAIR.bench");
    expect(errors).toEqual([]);
    mounted?.unmount();
  });

  it("useBench returns the shell store and the BENCH hook, or null without one", () => {
    const seen: Ui.UseBench[] = [];
    const Probe = defineComponent({
      setup() {
        seen.push(ui.useBench());
        return () => null;
      },
    });
    const run = (): void => {
      const el = document.createElement("div");
      document.body.append(el);
      const app = createApp(Probe);
      app.use(createPinia());
      app.mount(el);
      app.unmount();
    };
    run();
    const hook = { ready: true };
    (globalThis as Record<string, unknown>)[BENCH_GLOBAL] = hook;
    run();
    expect(seen[0]?.hook).toBeNull();
    expect(seen[0]?.shell.$id).toBe("hbf-shell");
    expect(seen[1]?.hook).toBe(hook);
  });
});
