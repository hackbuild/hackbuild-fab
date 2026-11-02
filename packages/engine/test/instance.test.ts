// One manifold instance per page. bench-core and the engine each bundle
// their own copy of geom, so a page holds two copies of manifold.ts. This
// loads the two built cdn files (npm run build:lib), adopts a module
// through bench-core and builds through the engine, and the other way
// round: both must act on one instance, one set of options and one load.
// Not run, and said so, when the built files are absent.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeEach, describe, expect, test } from "vitest";
import Module from "manifold-3d";
import { chase } from "../../../reference/cosmetic/art-layers/chase.js";
import * as buildModule from "../../../reference/cosmetic/art-layers/build.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CORE = path.join(ROOT, "packages/bench-core/dist/cdn/bench-core.js");
const ENGINE = path.join(ROOT, "packages/engine/dist/cdn/engine.js");
const GOLD = JSON.parse(readFileSync(path.join(ROOT, "reference/cosmetic/art-layers/expected/build.json"), "utf8")) as { meshHashes: Record<string, string> };

type Boot = { setup(): void };
type Core = { adoptBootedManifold(m: never): void };
type Engine = typeof import("../src/index.js");
const load = <T>(file: string, tag: string): Promise<T> => import(/* @vite-ignore */ `${pathToFileURL(file).href}?${tag}`) as Promise<T>;
const boot = async (): Promise<Boot> => {
  const m = await (Module as unknown as () => Promise<Boot>)();
  m.setup();
  return m;
};

describe.skipIf(!existsSync(CORE) || !existsSync(ENGINE))("bench-core and the engine share one manifold instance", () => {
  // The slots live on globalThis, so each test starts a fresh page.
  beforeEach(() => {
    const g = globalThis as Record<symbol, unknown>;
    delete g[Symbol.for("hbf.manifold")];
    delete g[Symbol.for("hbf.manifold.state")];
  });

  test("a module adopted through bench-core builds in the engine, and the engine loads that module", async () => {
    const [core, engine] = await Promise.all([load<Core>(CORE, "a"), load<Engine>(ENGINE, "a")]);
    const wasm = await boot();
    core.adoptBootedManifold(wasm as never);
    expect(await engine.loadManifold()).toBe(wasm);
    const page = engine.createPageBuild({ chase, module: buildModule, facts: engine.factsFor(chase, readFileSync(path.join(ROOT, "reference/cosmetic/art-layers/build.ts"), "utf8")) });
    const out = await page.build({});
    expect(Object.fromEntries(out.part.bodies.map((b) => [b.id, b.mesh.hash]))).toEqual(GOLD.meshHashes);
    expect(page.liveCount()).toBe(0);
  }, 180_000);

  test("once the engine has loaded, bench-core refuses a different module and accepts the same one", async () => {
    const [core, engine] = await Promise.all([load<Core>(CORE, "b"), load<Engine>(ENGINE, "b")]);
    const loaded = await engine.loadManifold();
    const other = await boot();
    expect(() => core.adoptBootedManifold(other as never)).toThrow(/already loading/);
    expect(() => core.adoptBootedManifold(loaded as never)).not.toThrow();
  });

  test("options set through the engine are refused after bench-core adopted", async () => {
    const [core, engine] = await Promise.all([load<Core>(CORE, "c"), load<Engine>(ENGINE, "c")]);
    core.adoptBootedManifold((await boot()) as never);
    expect(() => engine.configureManifold({ locateFile: (p) => p })).toThrow(/already loading/);
  });
});
