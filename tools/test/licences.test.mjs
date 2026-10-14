import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';


// every temp folder this file makes is removed when the file's tests end
const TEMPS = [];
const keep = (d) => {
  TEMPS.push(d);
  return d;
};
after(() => {
  for (const d of TEMPS) fs.rmSync(d, { recursive: true, force: true });
});
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = path.join(repo, 'tools/licences.mjs');
const table = JSON.parse(fs.readFileSync(path.join(repo, 'tools/licences.json'), 'utf8'));

const run = (root) => spawnSync(process.execPath, [script, '--check', ...(root ? [root] : [])], { encoding: 'utf8' });
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
};

// A temp repo with the real path map, one workspace and a one-package lockfile.
function scratch({ paths = table.paths, deps, lockPkgs, wsLicense = 'MIT' } = {}) {
  const root = keep(fs.mkdtempSync(path.join(os.tmpdir(), 'hbf-licences-')));
  for (const row of paths) if (row.text) { fs.mkdirSync(path.dirname(path.join(root, row.text)), { recursive: true }); fs.writeFileSync(path.join(root, row.text), 'text\n'); }
  writeJson(path.join(root, 'package.json'), { name: 'x', private: true, license: 'MIT', workspaces: ['packages/*'] });
  writeJson(path.join(root, 'packages/a/package.json'), { name: '@hackbuild/a', private: true, license: wsLicense });
  writeJson(path.join(root, 'package-lock.json'), { packages: { '': {}, ...(lockPkgs ?? { 'node_modules/left': { version: '1.0.0', license: 'MIT' } }) } });
  writeJson(path.join(root, 'tools/licences.json'), {
    paths,
    dependencies: deps ?? [{ ecosystem: 'npm', name: 'left', version: '1.0.0', published: 'MIT', audited: 'MIT', evidence: 'fixture', load: 'bundled', status: 'adopted' }],
  });
  return root;
}

test('the repo passes and reports the docs, logo and template rows', () => {
  const r = run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /logo, template and docs rows present/);
});

test('a minimal scratch repo passes', () => {
  const r = run(scratch());
  assert.equal(r.status, 0, r.stdout);
});

test('a lockfile package without a row fails', () => {
  const r = run(scratch({ lockPkgs: { 'node_modules/left': { version: '1.0.0', license: 'MIT' }, 'node_modules/right': { version: '2.0.0', license: 'MIT' } } }));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /npm right@2\.0\.0 .* has no row/);
});

test('GPL audited fails and LGPL audited passes the GPL rule', () => {
  const gpl = run(scratch({ lockPkgs: { 'node_modules/left': { version: '1.0.0', license: 'GPL-3.0-only' } },
    deps: [{ ecosystem: 'npm', name: 'left', version: '1.0.0', published: 'GPL-3.0-only', audited: 'GPL-3.0-only', evidence: 'fixture', load: 'bundled', status: 'adopted' }] }));
  assert.equal(gpl.status, 1);
  assert.match(gpl.stdout, /GPL or AGPL in the closure/);
  const lgpl = run(scratch({ lockPkgs: { 'node_modules/left': { version: '1.0.0', license: 'LGPL-3.0-or-later' } },
    deps: [{ ecosystem: 'npm', name: 'left', version: '1.0.0', published: 'LGPL-3.0-or-later', audited: 'LGPL-3.0-or-later', evidence: 'fixture', load: 'lazy-separate-file', status: 'adopted' }] }));
  assert.equal(lgpl.status, 0, lgpl.stdout);
});

test('an LGPL row loaded as bundled fails', () => {
  const r = run(scratch({ lockPkgs: { 'node_modules/left': { version: '1.0.0', license: 'LGPL-2.1-only' } },
    deps: [{ ecosystem: 'npm', name: 'left', version: '1.0.0', published: 'LGPL-2.1-only', audited: 'LGPL-2.1-only', evidence: 'fixture', load: 'bundled', status: 'adopted' }] }));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /LGPL loads only as a lazy separate file/);
});

test('an unknown audited value fails unless excluded', () => {
  const row = { ecosystem: 'npm', name: 'left', version: '1.0.0', published: null, audited: 'unknown', evidence: 'fixture', load: 'bundled' };
  const lockPkgs = { 'node_modules/left': { version: '1.0.0' } };
  assert.equal(run(scratch({ lockPkgs, deps: [{ ...row, status: 'adopted' }] })).status, 1);
  assert.equal(run(scratch({ lockPkgs, deps: [{ ...row, status: 'excluded' }] })).status, 0);
});

test('a workspace licence that differs from the path map fails', () => {
  const r = run(scratch({ wsLicense: 'Apache-2.0' }));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /packages\/a\/package\.json license Apache-2\.0, path map says MIT/);
});

test('a path map without the logo row first fails', () => {
  const r = run(scratch({ paths: table.paths.slice(1) }));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /no logo row/);
});

test('a path map without the docs row fails', () => {
  const r = run(scratch({ paths: table.paths.filter((p) => !p.glob.includes('docs/**')) }));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /no docs row for docs\/\*\*/);
});
