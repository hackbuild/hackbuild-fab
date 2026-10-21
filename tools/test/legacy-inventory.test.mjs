// R1-rails-public-01: tools/legacy/inventory.json lists every tracked file
// under the four legacy globs with sha256, bytes, class and readers, and
// (R1-rails-public-11) every held copy a SHA256SUMS lists that git does not
// track, as where: private with its archive id. The fixture repo proves
// --check fails on a file without a row and on a row whose sha256 moved by
// one hex digit, and that a held copy needs an archive copy to be written.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const { heldList } = await import(new URL('../legacy/held.mjs', import.meta.url).href);
const script = path.join(root, 'tools/legacy/inventory.mjs');
const { codeText, readsFolder, fixedClass } = await import(new URL('../legacy/inventory.mjs', import.meta.url).href);

const env = (originals) => {
  const e = { ...process.env };
  delete e.HBF_ORIGINALS;
  if (originals) e.HBF_ORIGINALS = originals;
  return e;
};
const run = (args, originals = null) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env: env(originals) });

test('the committed inventory matches the tree, originals lookup not run', () => {
  const r = run(['--check']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /originals lookup not run/);
});

test('rows are sorted, classed, and an original names its archive path', () => {
  const inv = JSON.parse(readFileSync(path.join(root, 'tools/legacy/inventory.json'), 'utf8'));
  const paths = inv.files.map((r) => r.path);
  assert.deepEqual(paths, [...paths].sort());
  for (const r of inv.files) {
    assert.ok(['lineage', 'original', 'unmatched'].includes(r.class), `${r.path}: ${r.class}`);
    assert.match(r.sha256, /^[0-9a-f]{64}$/);
    if (r.where === undefined) assert.equal(r.class === 'original', typeof r.originals === 'string', r.path);
    else {
      assert.equal(r.where, 'private', r.path);
      // A held copy always names its archive copy: the original, else the parked one.
      assert.ok(typeof r.originals === 'string', `${r.path}: held with no archive id`);
      assert.equal(r.class === 'unmatched', r.originals === `fab-knowledge:originals/_legacy/${r.path}`, r.path);
    }
    if (r.originals) assert.match(r.originals, /^fab-knowledge:originals\/./);
  }
  // Every held row is in the .gitignore held block, so a restored copy is never staged again.
  const held = new Set(heldList(root));
  assert.deepEqual(inv.files.filter((r) => r.where === 'private' && !held.has(r.path)).map((r) => r.path), []);
  const row = (p) => inv.files.find((r) => r.path === p);
  assert.equal(row('designs/slug/legacy/SHA256SUMS').class, 'lineage');
  // Fab's harness moved to designs/<id>/extract/ (R1-rails-public-07); what is
  // left under a legacy tools/ folder, tracked or held, is an upstream copy with an originals path.
  const tools = inv.files.filter((r) => /^designs\/[^/]+\/legacy\/tools\//.test(r.path));
  assert.deepEqual(tools.map((r) => [r.path, r.class]), [
    ['designs/cotter/legacy/tools/hook_fit.py', 'original'],
    ['designs/pip/legacy/tools/build_bench.py', 'original'],
    ['designs/pip/legacy/tools/orca3mf.js', 'original'],
    ['designs/pip/legacy/tools/rastermesh.js', 'original'],
  ]);
  assert.equal(inv.files.filter((r) => /^designs\/[^/]+\/legacy\/fixtures\//.test(r.path)).length, 0);
  // extract-plan.mjs names its folder through legacyDir("washer"); the folder-name match finds it.
  assert.ok(inv.folders['designs/washer/legacy'].readers.includes('designs/washer/extract/extract-plan.mjs'));
  // The davit scene reads its stored inputs, never the legacy folder (R1-rails-public-09).
  assert.ok(!inv.folders['designs/davit/legacy'].readers.includes('packages/sim/scenes/davit.ts'));
  assert.ok(inv.folders['designs/collar/legacy'].readers.includes('tools/py/harness/collar_parity.py'));
});

test('class and reader rules', () => {
  assert.equal(fixedClass('designs/pawl/legacy/records/a.mjs'), null);
  assert.equal(fixedClass('designs/x/legacy/tools/a.py'), null);
  assert.equal(fixedClass('designs/x/legacy/sub/README.md'), 'lineage');
  assert.equal(readsFolder('a.ts', codeText('a.ts', '// designs/x/legacy/a.stl\n'), 'designs/x/legacy'), false);
  assert.equal(readsFolder('a.py', codeText('a.py', 'p = os.path.join(R, "designs", "x", "legacy")\n'), 'designs/x/legacy'), true);
  assert.equal(readsFolder('designs/x/t/a.ts', codeText('a.ts', 'read("../legacy/a.stl")\n'), 'designs/x/legacy'), true);
  assert.equal(readsFolder('a.ts', codeText('a.ts', 'read("designs/xy/legacy/a")\n'), 'designs/x/legacy'), false);
});

test('fixture repo: --check fails on a file without a row and on a sha256 one hex digit off', (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'hbf-legacy-inv-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const repo = path.join(dir, 'repo');
  const originals = path.join(dir, 'originals');
  const put = (rel, text, base = repo) => {
    mkdirSync(path.dirname(path.join(base, rel)), { recursive: true });
    writeFileSync(path.join(base, rel), text);
  };
  put('designs/x/legacy/README.md', 'lineage\n');
  put('designs/x/legacy/a.stl', 'solid a\nendsolid a\n');
  put('designs/x/legacy/c.stl', 'solid c\nendsolid c\n');
  put('designs/x/legacy/tools/dump.mjs', 'export {};\n');
  put('src/reader.ts', 'const D = new URL("../designs/x/", import.meta.url);\nread(new URL(`legacy/${f}`, D));\n');
  put('src/comment.ts', '// designs/x/legacy/a.stl is cited here only\n');
  put('x/a.stl', 'solid a\nendsolid a\n', originals);
  execFileSync('git', ['init', '-q', repo]);
  execFileSync('git', ['-C', repo, 'add', '.']);
  const args = (m) => [m, `--root=${repo}`];

  const w = run(args('--write'), originals);
  assert.equal(w.status, 0, w.stderr);
  assert.match(w.stdout, /classes: \{"lineage":1,"original":1,"unmatched":2\}/);
  const out = path.join(repo, 'tools/legacy/inventory.json');
  const inv = JSON.parse(readFileSync(out, 'utf8'));
  assert.deepEqual(inv.files.map((r) => [r.path, r.class, r.originals ?? null]), [
    ['designs/x/legacy/README.md', 'lineage', null],
    ['designs/x/legacy/a.stl', 'original', 'fab-knowledge:originals/x/a.stl'],
    ['designs/x/legacy/c.stl', 'unmatched', null],
    ['designs/x/legacy/tools/dump.mjs', 'unmatched', null],
  ]);
  assert.deepEqual(inv.folders['designs/x/legacy'].readers, ['src/reader.ts']);
  assert.equal(run(args('--check')).status, 0);

  put('designs/x/legacy/b.stl', 'solid b\nendsolid b\n');
  execFileSync('git', ['-C', repo, 'add', 'designs/x/legacy/b.stl']);
  const added = run(args('--check'));
  assert.equal(added.status, 1);
  assert.match(added.stderr, /designs\/x\/legacy\/b\.stl: tracked under a legacy glob, no row/);
  const refused = run(args('--write'));
  assert.equal(refused.status, 1, 'a new row needs the originals lookup');
  execFileSync('git', ['-C', repo, 'rm', '-q', '--cached', 'designs/x/legacy/b.stl']);
  assert.equal(run(args('--check')).status, 0);

  // A held copy: SHA256SUMS lists it, git does not track it.
  const dSha = createHash('sha256').update('solid d\n').digest('hex');
  put('designs/x/legacy/SHA256SUMS', `${dSha}  d.stl\n`);
  execFileSync('git', ['-C', repo, 'add', 'designs/x/legacy/SHA256SUMS']);
  const unparked = run(args('--write'), originals);
  assert.equal(unparked.status, 1, 'a held copy the archive does not hold is refused');
  assert.match(unparked.stderr, /designs\/x\/legacy\/d\.stl: held, and neither the originals nor _legacy\/ hold its bytes/);
  put('_legacy/designs/x/legacy/d.stl', 'solid d\n', originals);
  assert.equal(run(args('--write'), originals).status, 0);
  const held = JSON.parse(readFileSync(out, 'utf8')).files.find((r) => r.path === 'designs/x/legacy/d.stl');
  assert.deepEqual(held, { path: 'designs/x/legacy/d.stl', sha256: dSha, bytes: 8, class: 'unmatched', where: 'private', originals: 'fab-knowledge:originals/_legacy/designs/x/legacy/d.stl' });
  assert.equal(run(args('--check')).status, 0);
  writeFileSync(path.join(repo, 'designs/x/legacy/SHA256SUMS'), '');
  const dropped = run(args('--check'));
  assert.equal(dropped.status, 1);
  assert.match(dropped.stderr, /designs\/x\/legacy\/d\.stl: row names no tracked file and no SHA256SUMS row/);
  writeFileSync(path.join(repo, 'designs/x/legacy/SHA256SUMS'), `${dSha}  d.stl\n`);

  const text = readFileSync(out, 'utf8');
  const sha = inv.files[1].sha256;
  const flipped = sha.slice(0, 10) + (sha[10] === '0' ? '1' : '0') + sha.slice(11);
  writeFileSync(out, text.replace(sha, flipped));
  const moved = run(args('--check'));
  assert.equal(moved.status, 1);
  assert.match(moved.stderr, /designs\/x\/legacy\/a\.stl: sha256 recorded/);
});
