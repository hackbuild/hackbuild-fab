// Vitest global setup: run `tsc -b` once before any test file. The gate
// test spawns core/bin/hbf.mjs, which imports the gitignored core/dist; the
// build sandbox forks core/dist/sandbox-child.js; and every @hackbuild/*
// package resolves through its exports to ./dist. Without this, a test run
// after a source edit exercises the last build. tsc -b is incremental.
//
// Then the run's build store (R1-speed-01): a temporary directory and the
// toolchain hash, handed to every worker through the environment, so the
// corpus files read one build per reference and design per run
// (support/build-cache.ts). The directory is removed when the run ends.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STORE_ENV, TOOLCHAIN_ENV, toolchainHash } from "./support/build-cache.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export default function setup(): () => void {
  const r = spawnSync(path.join(ROOT, "node_modules", ".bin", "tsc"), ["-b"], { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) throw new Error(`tsc -b exited ${String(r.status ?? r.signal)}; fix the build before the tests run against stale dist`);
  const store = mkdtempSync(path.join(tmpdir(), "hbf-test-builds-"));
  process.env[STORE_ENV] = store;
  process.env[TOOLCHAIN_ENV] = toolchainHash(ROOT);
  return () => rmSync(store, { recursive: true, force: true });
}
