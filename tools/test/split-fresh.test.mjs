// R1-engine-03: the 3MF writer lives once, in hackbuild-3mf, and
// packages/3mf re-exports the build vendored at
// tools/vendor/hackbuild-3mf-<version>-<sha7>.tgz. Before it, fab was the
// source and this test ran the split's import-from-fab.sh --check (M00-T15).
// Now it holds the vendored tgz to the split: the commit <sha7> names packs
// to the bytes SHA256SUMS pins, and the split's HEAD carries the same js/
// tree, so a writer change in hackbuild-3mf fails here until it is packed
// into tools/vendor.
// The split is the sibling working tree ../hackbuild-3mf, or HBF_3MF. Without
// one, or without its js/node_modules, the test is skipped, which counts as
// not run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const split = resolve(process.env.HBF_3MF ?? join(root, '..', 'hackbuild-3mf'));
const modules = join(split, 'js', 'node_modules');
const skip = !existsSync(join(split, '.git')) ? `no hackbuild-3mf working tree at ${split}`
  : !existsSync(join(modules, 'typescript')) ? `no js/node_modules in ${split}; run npm ci --prefix js there`
  : false;

const dep = JSON.parse(readFileSync(join(root, 'packages/3mf/package.json'), 'utf8')).dependencies?.['hackbuild-3mf'] ?? '';
const m = /^file:\.\.\/\.\.\/tools\/vendor\/(hackbuild-3mf-\d+\.\d+\.\d+-([0-9a-f]{7})\.tgz)$/.exec(dep);
const git = (...args) => spawnSync('git', ['-C', split, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });

test('packages/3mf names a vendored tgz pinned in SHA256SUMS', () => {
  assert.ok(m, `packages/3mf/package.json hackbuild-3mf is ${dep}, expected file:../../tools/vendor/hackbuild-3mf-<version>-<sha7>.tgz`);
  const sums = readFileSync(join(root, 'tools/vendor/SHA256SUMS'), 'utf8');
  const want = createHash('sha256').update(readFileSync(join(root, 'tools/vendor', m[1]))).digest('hex');
  assert.match(sums, new RegExp(`^${want}  ${m[1].replaceAll('.', '\\.')}$`, 'm'));
});

test('the vendored tgz is a fresh pack of the hackbuild-3mf commit it names', { skip, timeout: 300_000 }, () => {
  const [, name, sha7] = m;
  const commit = git('rev-parse', '--verify', '--quiet', `${sha7}^{commit}`);
  assert.equal(commit.status, 0, `${split} holds no commit ${sha7}; fetch it or repack tools/vendor from the split`);
  const tmp = mkdtempSync(join(tmpdir(), 'hbf-3mf-pack-'));
  try {
    const tar = spawnSync('sh', ['-c', `git -C "$1" archive "$2" js | tar -x -C "$3"`, 'sh', split, commit.stdout.trim(), tmp], { encoding: 'utf8' });
    assert.equal(tar.status, 0, tar.stderr);
    symlinkSync(modules, join(tmp, 'js', 'node_modules'));
    mkdirSync(join(tmp, 'out'));
    const pack = spawnSync('npm', ['pack', '--pack-destination', join(tmp, 'out')], { cwd: join(tmp, 'js'), encoding: 'utf8', maxBuffer: 1 << 26 });
    assert.equal(pack.status, 0, pack.stderr);
    const [out] = readdirSync(join(tmp, 'out'));
    const fresh = createHash('sha256').update(readFileSync(join(tmp, 'out', out))).digest('hex');
    const vendored = createHash('sha256').update(readFileSync(join(root, 'tools/vendor', name))).digest('hex');
    assert.equal(fresh, vendored, `npm pack of ${sha7} differs from tools/vendor/${name}; repack it and update SHA256SUMS`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('the hackbuild-3mf HEAD carries the js/ tree the vendored tgz was packed from', { skip }, () => {
  const sha7 = m[2];
  const head = git('rev-parse', 'HEAD:js');
  const at = git('rev-parse', `${sha7}:js`);
  assert.equal(at.status, 0, `${split} holds no commit ${sha7}`);
  assert.equal(head.stdout.trim(), at.stdout.trim(),
    `hackbuild-3mf HEAD js/ differs from ${sha7}; merge ${sha7} there, or npm pack HEAD into tools/vendor, add its sha256 to SHA256SUMS and point packages/3mf/package.json at it`);
});
