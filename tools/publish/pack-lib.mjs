#!/usr/bin/env node
// npm run pack:lib: stage the four published packages under out/publish/<short>/
// and npm pack each to out/publish/<name>-<version>.tgz (out/ is gitignored).
// Run npm run build:lib first; the stage copies its cdn and iife outputs and
// bundles the types it leaves in each package's dist.
//
// out/publish/index.json lists the staged packages, their tarballs, their
// cdn and iife files and the vendor files a page needs beside them, for the
// fixture pages and apps that load them.

import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { PACKAGES, ROOT, VENDOR_THREE } from "../lib/outputs.mjs";
import { PUBLISH_DIR, StageError, stagePackage, workspace } from "./stage.mjs";

mkdirSync(PUBLISH_DIR, { recursive: true });
for (const f of readdirSync(PUBLISH_DIR)) if (f.endsWith(".tgz")) rmSync(join(PUBLISH_DIR, f));

const ws = workspace();
const reports = [];
try {
  for (const pkg of PACKAGES) {
    const r = await stagePackage(pkg, ws);
    reports.push(r);
    const s = r.sizes;
    console.log(`pack:lib: ${r.name}@${r.version}`);
    console.log(`  inlined   ${r.inlined.length === 0 ? "none" : r.inlined.map((n) => `@hackbuild/${n}`).join(", ")}`);
    console.log(`  imports   ${Object.entries({ ...r.dependencies, ...r.peerDependencies }).map(([k, v]) => `${k}@${v}`).join(", ") || "none"}`);
    console.log(`  bytes     esm ${s.esm} (${s.esmFiles} files), types ${s.types}, cdn ${s.cdn}, iife ${s.iife}, tarball ${s.tarball} (all measured)`);
  }
} catch (e) {
  if (e instanceof StageError) {
    console.error(`pack:lib: ${e.message}`);
    process.exit(1);
  }
  throw e;
}

const rel = (p) => relative(PUBLISH_DIR, p).split("\\").join("/");
writeFileSync(
  join(PUBLISH_DIR, "index.json"),
  JSON.stringify(
    {
      about: "Staged published packages (npm run pack:lib). Paths are relative to this folder.",
      packages: reports.map((r) => ({
        name: r.name,
        short: r.short,
        version: r.version,
        dir: rel(r.dir),
        tarball: rel(r.tarball),
        cdn: `${rel(r.dir)}/dist/cdn/${r.short}.js`,
        iife: `${rel(r.dir)}/dist/iife/${r.short}.js`,
      })),
      vendor: { three: relative(PUBLISH_DIR, join(ROOT, VENDOR_THREE)).split("\\").join("/") },
    },
    null,
    2,
  ) + "\n",
);
console.log(`pack:lib: ${reports.length} packages staged and packed under out/publish`);
