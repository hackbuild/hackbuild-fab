#!/usr/bin/env node
// vue-tsc writes X.vue.d.ts and the declarations import "./X.vue". Node16
// resolution from ESM looks for X.d.vue.ts and fails (attw InternalResolution);
// "./X.vue.js" resolves to X.vue.d.ts under node16 and bundler alike.
// Usage: node fix-vue-types.mjs <dir>
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
let changed = 0;
for (const f of walk(resolve(process.argv[2] ?? "dist/types")).filter((p) => p.endsWith(".d.ts"))) {
  const before = readFileSync(f, "utf8");
  const after = before.replace(/(["'])(\.{1,2}\/[^"']*\.vue)\1/g, "$1$2.js$1");
  if (after !== before) {
    writeFileSync(f, after);
    changed += 1;
  }
}
console.log(`fix-vue-types: ${changed} declaration files rewritten`);
