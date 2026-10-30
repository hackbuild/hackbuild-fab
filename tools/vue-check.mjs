#!/usr/bin/env node
// Type-checks .vue single-file components with vue-tsc on TypeScript 6 (typescript6 alias).
// The only entry: plain npx vue-tsc would load TS 7's lib/tsc.js, a native launcher.
// Usage: node tools/vue-check.mjs [tsconfig]   (defaults to packages/bench/tsconfig.vue.json)
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const config = path.resolve(process.argv[2] ?? path.join(root, 'packages/bench/tsconfig.vue.json'));
process.argv = [process.argv[0], require.resolve('vue-tsc/bin/vue-tsc.js'), '-p', config];
require('vue-tsc').run(require.resolve('typescript6/lib/tsc.js'));
