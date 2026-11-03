// The list tools/smoke/file-url.spec.ts opens is derived from the bake
// manifests (tools/smoke/file-url-benches.mjs). The first test holds the
// derived list against the benches that exist today; the others run the
// derivation on a fixture tree so a manifest with a build and no golden is
// shown to fail with a line naming it.
// Run: node --test tools/test/file-url-benches.test.mjs

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileUrlBenches } from '../smoke/file-url-benches.mjs';

const root = join(import.meta.dirname, '..', '..');

test('the derived list is non-empty and holds the six benches that exist today', () => {
  const { benches, problems } = fileUrlBenches(root);
  assert.deepEqual(problems, []);
  assert.ok(benches.length > 0);
  const ids = benches.map((b) => b.id);
  for (const id of ['toggle', 'flex-pair', 'pip', 'blocks', 'access-switch', 'midi-pad']) {
    assert.ok(ids.includes(id), `${id} is missing from ${ids.join(', ')}`);
  }
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(benches.find((b) => b.id === 'flex-pair').dir, 'reference/keys/flex-pair');
  assert.equal(benches.find((b) => b.id === 'toggle').page, 'dist/bench/toggle.html');
  assert.equal(benches.find((b) => b.id === 'toggle').bake, 'npm run build:lib && node tools/bake/bake.mjs designs/toggle/bake.json');
});

function tree(files) {
  const dir = mkdtempSync(join(tmpdir(), 'hbf-file-url-'));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), typeof body === 'string' ? body : JSON.stringify(body));
  }
  return dir;
}

const ui = (id, extra = {}) => ({ id, shell: 'ui', entry: 'entry.ts', build: { from: 'build.ts', global: 'g', label: 'l' }, ...extra });
const golden = { buildHash: 'a'.repeat(64) };

test('a ui manifest with a build and a golden is listed; out picks the folder', () => {
  const dir = tree({
    'designs/a/bake.json': ui('a'),
    'designs/a/expected/build.json': golden,
    'reference/x/b/bake.json': ui('b', { out: 'kit' }),
    'reference/x/b/expected/build.json': golden,
  });
  try {
    const { benches, problems } = fileUrlBenches(dir);
    assert.deepEqual(problems, []);
    assert.deepEqual(benches.map((b) => [b.id, b.dir, b.page, b.golden]), [
      ['a', 'designs/a', 'dist/bench/a.html', 'designs/a/expected/build.json'],
      ['b', 'reference/x/b', 'dist/kit/b.html', 'reference/x/b/expected/build.json'],
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a manifest with a build and no expected/build.json is a problem line that names it', () => {
  const dir = tree({
    'designs/a/bake.json': ui('a'),
    'designs/a/expected/build.json': golden,
    'designs/new/bake.json': ui('new'),
  });
  try {
    const { benches, problems } = fileUrlBenches(dir);
    assert.deepEqual(benches.map((b) => b.id), ['a']);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^designs\/new\/bake\.json: has a build and no designs\/new\/expected\/build\.json\. /);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a golden with no buildHash, an unreadable golden and a duplicate page are problems', () => {
  const dir = tree({
    'designs/a/bake.json': ui('a'),
    'designs/a/expected/build.json': golden,
    'designs/empty/bake.json': ui('empty'),
    'designs/empty/expected/build.json': { volumes: {} },
    'designs/bad/bake.json': ui('bad'),
    'designs/bad/expected/build.json': '{',
    'reference/dup/bake.json': ui('a'),
    'reference/dup/expected/build.json': golden,
  });
  try {
    const { benches, problems } = fileUrlBenches(dir);
    assert.deepEqual(benches.map((b) => b.manifest), ['designs/a/bake.json']);
    assert.equal(problems.length, 3);
    assert.ok(problems.some((p) => p.startsWith('designs/empty/bake.json: ') && p.includes('holds no buildHash')));
    assert.ok(problems.some((p) => p.startsWith('designs/bad/bake.json: ') && p.includes('is not JSON')));
    assert.ok(problems.some((p) => p.startsWith('reference/dup/bake.json: ') && p.includes('dist/bench/a.html') && p.includes('designs/a/bake.json')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a ui manifest without a build and a shell that is not ui are left out without a problem', () => {
  const dir = tree({
    'packages/bench/kit/bake.json': { id: 'kit', shell: 'ui', entry: 'entry.ts', out: 'kit' },
    'designs/p/html/bake.json': { id: 'p-html', shell: 'bench/part1.html', build: { from: 'b.ts', global: 'g', label: 'l' } },
  });
  try {
    assert.deepEqual(fileUrlBenches(dir), { benches: [], problems: [] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
