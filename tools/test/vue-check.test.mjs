// tools/vue-check.mjs (R1-rails-ci-hooks-04). The bad fixture fails with one
// script error and one template error; the real packages/bench config passes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const run = (...args) =>
  spawnSync(process.execPath, [path.join(repo, 'tools/vue-check.mjs'), ...args], { cwd: repo, encoding: 'utf8', timeout: 120_000 });

test('the bad fixture fails on its script and its template', () => {
  const r = run('packages/bench/test/fixtures/vue-bad/tsconfig.json');
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /Bad\.vue\(4,7\): error TS2322: Type 'string' is not assignable to type 'number'/);
  assert.match(r.stdout, /Bad\.vue\(8,29\): error TS2339: Property 'missing' does not exist/);
});

test('the packages/bench single-file components type-check', () => {
  const r = run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.stdout.trim(), '');
});
