// One build per reference and design per core run (R1-speed-01). The
// corpus files each built every reference again; a file that wraps
// buildPart with withBuildCache reads a build another file of the same run
// stored under the same key instead. global-setup.ts makes the store
// directory and hashes the toolchain once, before any worker starts.
//
// The key is taken before the build, so it cannot use profileHash (the
// rows a build read are known only after it ran). It covers a superset of
// every input the build reads: defHash (the chase and the build.ts source
// closure), every file of the design directory the sandbox may read, the
// resolved values, the whole profile tables the build is handed, the
// SOURCE_DATE_EPOCH it records, and the toolchain (the dist, seed and
// data files of every workspace package, the workspace package.json and
// package-lock.json). A key that misses an input is a false hit;
// build-cache.test.ts edits one profile row in a copy and sees a miss.
// A miss takes a lock directory, so a second file waits for the first
// build instead of running it again.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { deserialize, serialize } from "node:v8";
import type { BuildOptions, Built, Design, Values } from "../../src/commands/build.js";
import { sourceDateEpoch } from "../../src/epoch.js";
import { hashOf } from "../../src/jcs.js";

/** The store directory of this run; unset, the wrapper builds every time. */
export const STORE_ENV = "HBF_TEST_BUILD_STORE";
/** The toolchain hash of this run, from global-setup.ts. */
export const TOOLCHAIN_ENV = "HBF_TEST_TOOLCHAIN";

/** Directories never read by a build: sources compile to dist, tests and caches are not inputs. */
const SKIP_DIRS = new Set(["node_modules", "src", "test", ".vitest-cache", ".hbf"]);

/** sha256 over every file under dir, by relative path, skipping SKIP_DIRS and tsbuildinfo. */
function treeHash(dir: string, skip: ReadonlySet<string>, h = createHash("sha256"), rel = ""): ReturnType<typeof createHash> {
  if (!existsSync(dir)) return h;
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    const r = `${rel}/${e.name}`;
    if (e.isDirectory()) {
      if (!skip.has(e.name)) treeHash(p, skip, h, r);
    } else if (e.isFile() && !e.name.endsWith(".tsbuildinfo")) {
      h.update(`${r}\0`).update(readFileSync(p)).update("\0");
    }
  }
  return h;
}

/** The toolchain a build runs on: core, kernel, spec and every package, as built, with the lock file. */
export function toolchainHash(root: string): string {
  const h = createHash("sha256");
  const pkgs = readdirSync(path.join(root, "packages")).sort().map((p) => `packages/${p}`);
  for (const d of ["core", "kernel", "spec", ...pkgs]) treeHash(path.join(root, d), SKIP_DIRS, h.update(`${d}\0`), "");
  for (const f of ["package.json", "package-lock.json"]) h.update(`${f}\0`).update(readFileSync(path.join(root, f)));
  return h.digest("hex");
}

/** The files of a design directory the sandbox may read; expected/ holds outputs and test/ is not read. */
const designHash = (dir: string): string => treeHash(dir, new Set(["expected", "test", "node_modules"])).digest("hex");

/** The key of one build: every input it reads, by hash. */
export function buildKey(design: Design, values: Values, epoch: number, toolchain: string): string {
  return hashOf({
    format: "hbf-test-build-key-1",
    defHash: design.defHash,
    target: design.target,
    design: designHash(design.dir),
    values,
    tables: hashOf(design.ws.tables),
    versions: design.ws.versions,
    epoch,
    toolchain,
  });
}

type BuildPart = (design: Design, values: Values, opts?: BuildOptions) => Promise<Built>;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** How long a miss waits on another file's build of the same key before building itself, ms. */
const WAIT_MS = 240_000;

/**
 * buildPart through the run's store. A build with sandbox options is never
 * cached (the test is about the sandbox), and an accept run of a record
 * builds every time, as a person accepting reads fresh builds.
 */
export function cachedBuildPart(build: BuildPart, env: Readonly<Record<string, string | undefined>> = process.env): BuildPart {
  return async (design, values, opts = {}) => {
    const dir = env[STORE_ENV];
    const toolchain = env[TOOLCHAIN_ENV];
    const accept = env["HBF_ACCEPT_METRICS"] === "1" || env["HBF_ACCEPT_GRAPH"] === "1";
    if (dir === undefined || toolchain === undefined || opts.sandbox !== undefined || accept) return build(design, values, opts);
    const key = buildKey(design, values, opts.epoch ?? sourceDateEpoch(design.ws.root).value, toolchain);
    const file = path.join(dir, `${key}.v8`);
    const lock = path.join(dir, `${key}.lock`);
    const read = (): Built => ({ ...(deserialize(readFileSync(file)) as Omit<Built, "design">), design });
    if (existsSync(file)) return read();
    let mine = false;
    try {
      mkdirSync(lock);
      mine = true;
    } catch {
      for (const t0 = Date.now(); !existsSync(file) && existsSync(lock) && Date.now() - t0 < WAIT_MS;) await sleep(200);
      if (existsSync(file)) return read();
    }
    try {
      const built = await build(design, values, opts);
      const { design: _d, ...rest } = built;
      const tmp = `${file}.${process.pid}.tmp`;
      writeFileSync(tmp, serialize(rest));
      renameSync(tmp, file);
      return built;
    } finally {
      if (mine) rmSync(lock, { recursive: true, force: true });
    }
  };
}

/** The core build module with buildPart read through the run's store, for vi.mock. */
export function withBuildCache<M extends { buildPart: BuildPart }>(m: M): M {
  return { ...m, buildPart: cachedBuildPart(m.buildPart) };
}
