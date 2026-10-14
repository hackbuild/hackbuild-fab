// M00-T15: the hackbuild-3mf split copies fab files (tools/py/test, the voice
// allow file, packages/3mf and more) through its tools/import-from-fab.sh.
// Verifier round 2 (2026-10-07) found the split stale: fab gained a test in
// tools/py/test/test_bytes.py and an allow row in tools/lint-voice.allow.json
// after the import, and only the split side could see it. This test runs the
// split's own --check against this working tree, so a fab edit to a copied
// file fails here until the split is re-imported.
// The split is the sibling working tree ../hackbuild-3mf, or HBF_3MF. Without
// one the test is skipped, which counts as not run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const split = resolve(process.env.HBF_3MF ?? join(root, '..', 'hackbuild-3mf'));
const script = join(split, 'tools', 'import-from-fab.sh');
const skip = existsSync(script) ? false : `no hackbuild-3mf working tree at ${split}`;

test('the hackbuild-3mf split equals a fresh import of this working tree', { skip, timeout: 300_000 }, () => {
  const r = spawnSync('sh', [script, '--check', root], { cwd: split, encoding: 'utf8', maxBuffer: 1 << 26 });
  assert.equal(r.status, 0, `${r.stderr}rerun in ${split}: sh tools/import-from-fab.sh ${root}`);
  assert.match(r.stdout, /split equals a fresh import of /);
});
