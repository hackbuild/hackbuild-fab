// Vitest global setup: run `tsc -b` once before any test file. The gate
// test spawns core/bin/hbf.mjs, which imports the gitignored core/dist; the
// build sandbox forks core/dist/sandbox-child.js; and every @hackbuild/*
// package resolves through its exports to ./dist. Without this, a test run
// after a source edit exercises the last build. tsc -b is incremental.

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export default function setup(): void {
  const r = spawnSync(path.join(ROOT, "node_modules", ".bin", "tsc"), ["-b"], { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) throw new Error(`tsc -b exited ${String(r.status ?? r.signal)}; fix the build before the tests run against stale dist`);
}
