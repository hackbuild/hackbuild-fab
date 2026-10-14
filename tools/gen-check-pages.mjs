#!/usr/bin/env node
// Writes docs/reference/checks/<id>.md for every registered check, plus
// INDEX.md and origin-gaps.md (M04-T02 step 5). The pages come from
// checkPages in core (seed, check modules and reference covers through
// packages/checks checkPage), the same pages hbf://check/<id> and
// `hbf explain` serve. A page whose id left the registry is removed. Run
// `npx tsc -b` first: this reads core/dist. The CI derived job regenerates
// and fails on any diff (D-010).
//
// node tools/gen-check-pages.mjs [--root=<repo>]

import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootArg = process.argv.find((a) => a.startsWith("--root="));
const root = resolve(rootArg ? rootArg.slice("--root=".length) : join(fileURLToPath(import.meta.url), "..", ".."));

// @hackbuild/spec ships as source with extensionless imports; the hbf CLI's resolve hook reads them.
register(pathToFileURL(join(root, "core/dist/resolve-hook.js")).href);
const { checkPages } = await import(pathToFileURL(join(root, "core/dist/checks.js")).href);
const { checkPageMarkdown, indexMarkdown, originGapsMarkdown } = await import(pathToFileURL(join(root, "packages/checks/dist/index.js")).href);

const pages = checkPages(root);
const dir = join(root, "docs/reference/checks");
mkdirSync(dir, { recursive: true });
const keep = new Set(["INDEX.md", "origin-gaps.md", ...pages.map((p) => `${p.id}.md`)]);
for (const f of readdirSync(dir)) if (f.endsWith(".md") && !keep.has(f)) rmSync(join(dir, f));
for (const p of pages) writeFileSync(join(dir, `${p.id}.md`), checkPageMarkdown(p));
writeFileSync(join(dir, "INDEX.md"), indexMarkdown(pages));
writeFileSync(join(dir, "origin-gaps.md"), originGapsMarkdown(pages));
console.log(`wrote ${pages.length} check pages, INDEX.md and origin-gaps.md (${pages.filter((p) => p.origin.record === null).length} gaps)`);
