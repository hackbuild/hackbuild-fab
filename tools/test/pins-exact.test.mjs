// tools/pins-exact.mjs (M08-T01 step 7, R-07). The repo passes; a copy of
// its manifests with one watched pin turned into a range fails, wherever the
// range sits; a range on any packages/board pin fails.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TEMPS = [];
after(() => { for (const d of TEMPS) fs.rmSync(d, { recursive: true, force: true }); });
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = path.join(repo, 'tools/pins-exact.mjs');
const run = (root) => spawnSync(process.execPath, [script, ...(root ? [root] : [])], { encoding: 'utf8' });
const { manifests } = await import(script);

// A copy of every manifest the workspace declares, so an edit lands on the real shapes.
function copy() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hbf-pins-'));
  TEMPS.push(root);
  for (const rel of manifests(repo)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.copyFileSync(path.join(repo, rel), path.join(root, rel));
  }
  return root;
}
const edit = (root, rel, f) => {
  const file = path.join(root, rel);
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  f(pkg);
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2));
};

test('the repo passes', () => {
  const r = run();
  assert.equal(r.status, 0, r.stdout);
});

test('a copy of the repo passes before any edit', () => {
  const r = run(copy());
  assert.equal(r.status, 0, r.stdout);
});

test('circuit-json with a caret in packages/board fails', () => {
  const root = copy();
  edit(root, 'packages/board/package.json', (p) => { p.dependencies['circuit-json'] = `^${p.dependencies['circuit-json']}`; });
  const r = run(root);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /packages\/board\/package\.json dependencies circuit-json "\^0\.0\.\d+" is a range/);
});

test('a blocked tscircuit pin with a tilde fails', () => {
  const root = copy();
  edit(root, 'packages/board/package.json', (p) => { p.hbf.pinsBlocked.tscircuit = `~${p.hbf.pinsBlocked.tscircuit}`; });
  assert.equal(run(root).status, 1);
});

test('@tscircuit/core with a range in another workspace fails', () => {
  const root = copy();
  edit(root, 'packages/wiring/package.json', (p) => { p.devDependencies = { '@tscircuit/core': '>=0.0.2000' }; });
  const r = run(root);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /packages\/wiring\/package\.json devDependencies @tscircuit\/core/);
});

test('a watched range inside root overrides fails', () => {
  const root = copy();
  edit(root, 'package.json', (p) => { p.overrides = { ...p.overrides, kicadts: { ...(p.overrides?.kicadts ?? {}), 'circuit-json': '*' } }; });
  assert.equal(run(root).status, 1);
});

test('a range on an unwatched pin outside packages/board passes; inside it fails', () => {
  const root = copy();
  edit(root, 'packages/wiring/package.json', (p) => { p.devDependencies = { leftpad: '^1.0.0' }; });
  assert.equal(run(root).status, 0);
  edit(root, 'packages/board/package.json', (p) => { p.dependencies.sucrase = `^${p.dependencies.sucrase}`; });
  assert.equal(run(root).status, 1);
});
