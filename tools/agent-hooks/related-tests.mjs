#!/usr/bin/env node
// related-tests: print the vitest test files that import any of the given
// files, directly or through other modules, as a JSON array of paths relative
// to the root. It asks vitest's own module graph (the one `vitest related`
// uses) through the node API, so the answer is the same set `vitest related`
// would run, including the long files stop-acceptance.mjs must name and skip.
// Nothing runs and no global setup starts.
//
// usage: node related-tests.mjs <root> <file>...   (files relative to root)
// Exit 0 prints the JSON array. Exit 1 prints {"error": {"id", "message"}} when
// vite cannot transform a module in the graph, with id the module's path
// relative to the root. Exit 2 is a usage error.
// Imports of a workspace package resolve to its dist, so an edit to one
// package's src selects tests of the same package that import ../src, not the
// tests of packages that import it by name.
import { realpathSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const [root, ...files] = process.argv.slice(2);
if (!root || files.length === 0) {
  process.stderr.write("usage: node related-tests.mjs <root> <file>...\n");
  process.exit(2);
}
const { createVitest } = await import(pathToFileURL(join(root, "node_modules", "vitest", "dist", "node.js")).href);
const ctx = await createVitest("test", { root, watch: false, run: true, related: files, reporters: [] });
// moduleId is a real path; root may reach it through a symlink.
const real = realpathSync(root);
let specs;
let failure = null;
try {
  specs = await ctx.getRelevantTestSpecifications();
} catch (e) {
  // A module in the graph that vite cannot transform, such as a parse error in
  // a touched file. The caller treats the reply as a failing result, not as
  // a graph it could not read.
  const raw = typeof e?.id === "string" ? e.id : null;
  const rel = raw === null ? null : relative(real, raw);
  failure = { id: rel !== null && !rel.startsWith("..") ? rel : raw, message: String(e?.message ?? e) };
} finally {
  await ctx.close();
}
if (failure) {
  process.stdout.write(`${JSON.stringify({ error: failure })}\n`);
  process.exit(1);
}
process.stdout.write(`${JSON.stringify([...new Set(specs.map((s) => relative(real, s.moduleId)))].sort())}\n`);
process.exit(0);
