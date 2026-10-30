#!/usr/bin/env node
// npm run lint:packages: publint, attw and the size budget over the four
// published packages. Run npm run build:lib first.
//   publint   errors and warnings fail; suggestions print.
//   attw      profile esm-only (the packages ship ESM and no CommonJS).
//   budget    each output may grow 10 percent over tools/lib/size-budget.json;
//             --update-budget rewrites the file from the measured sizes.
// Exit 1 on any failure.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { publint } from "publint";
import { formatMessage } from "publint/utils";
import { BUDGET_FILE, PACKAGES, ROOT, VENDOR_THREE } from "./lib/outputs.mjs";

const GROWTH = 1.1;
const update = process.argv.includes("--update-budget");
let failed = 0;
const fail = (msg) => {
  failed += 1;
  console.error(`lint:packages: ${msg}`);
};

/** The files whose size is budgeted, relative to the repo root. */
const outputs = [];
for (const p of PACKAGES) {
  outputs.push(`${p.dir}/dist/cdn/${p.short}.js`, `${p.dir}/dist/iife/${p.short}.js`);
}
outputs.push(VENDOR_THREE);

for (const p of PACKAGES) {
  const dir = join(ROOT, p.dir);
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const result = await publint({ pkgDir: dir, level: "suggestion", pack: "npm" });
  for (const m of result.messages) {
    const line = `${p.name}: publint ${m.type}: ${formatMessage(m, pkg)}`;
    const allowed = (p.publintAllow ?? []).find((a) => a.code === m.code && a.path === m.path.join("."));
    if (allowed) console.log(`lint:packages: ${line} (allowed: ${allowed.why})`);
    else if (m.type === "suggestion") console.log(`lint:packages: ${line}`);
    else fail(line);
  }
  console.log(`lint:packages: ${p.name} publint ${result.messages.filter((m) => m.type !== "suggestion").length} problems or allowed exceptions`);

  const r = spawnSync("npx", ["attw", "--pack", ".", "--profile", "esm-only", ...(p.attwSkip ? ["--exclude-entrypoints", ...p.attwSkip] : []), "--format", "table-flipped", "--no-color"], { cwd: dir, encoding: "utf8" });
  if (r.status !== 0) fail(`${p.name}: attw exit ${r.status}\n${r.stdout}${r.stderr}`);
  else console.log(`lint:packages: ${p.name} attw esm-only clean`);
}

const sizes = {};
for (const rel of outputs) {
  if (!existsSync(join(ROOT, rel))) {
    fail(`${rel} is missing. run npm run build:lib.`);
    continue;
  }
  sizes[rel] = statSync(join(ROOT, rel)).size;
}
if (update) {
  if (failed > 0) fail("budget not written while a check fails");
  else {
  writeFileSync(join(ROOT, BUDGET_FILE), JSON.stringify({ about: "Recorded size in bytes (measured) of each library output; lint:packages fails on growth over 10 percent. Rewrite with node tools/lint-packages.mjs --update-budget after a reviewed change.", bytes: sizes }, null, 2) + "\n");
  console.log(`lint:packages: wrote ${BUDGET_FILE}`);
  }
} else {
  const budget = JSON.parse(readFileSync(join(ROOT, BUDGET_FILE), "utf8")).bytes;
  for (const [rel, size] of Object.entries(sizes)) {
    const base = budget[rel];
    if (base === undefined) fail(`${rel} has no row in ${BUDGET_FILE}`);
    else if (size > base * GROWTH) fail(`${rel} is ${size} bytes (measured), budget ${base} plus 10 percent is ${Math.floor(base * GROWTH)}`);
    console.log(`lint:packages: ${rel} ${size} bytes (measured), budget ${base ?? "none"}`);
  }
}
if (failed > 0) {
  console.error(`lint:packages: ${failed} failure(s)`);
  process.exit(1);
}
console.log("lint:packages: ok");
