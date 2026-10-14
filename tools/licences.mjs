#!/usr/bin/env node
// Licence gate (D-041, D-043, D-170 to D-172; LICENSING.md sections 1.2 and 3).
// Reads tools/licences.json and fails on: a package in package-lock.json or
// tools/py/uv.lock without a row; an audited value naming GPL or AGPL (word
// boundary, so LGPL falls to its own rule); an unknown audited value on a
// row that is not excluded; an LGPL row whose load is not lazy-separate-file;
// a workspace package.json licence that differs from the path map; a path
// map missing the logo, template or docs rows, or with the logo row below
// another row; a licence text file the path map names that does not exist;
// a KiCad library file without KiCad's LICENSE.md beside it.
// Usage: node tools/licences.mjs --check [root]   (root defaults to the repo root)
//        node tools/licences.mjs --notices [--check]
// --notices writes THIRD-PARTY-NOTICES.txt from the bake licence manifests
// (tools/bake/notices.mjs, the generator bake.mjs runs); with --check it
// fails when the committed file differs from a fresh generation.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.includes('--notices')) {
  const { notices } = await import('./bake/notices.mjs');
  process.exit(await notices({ check: args.includes('--check') }));
}
if (!args.includes('--check')) {
  console.log('usage: node tools/licences.mjs --check [root] | --notices [--check]');
  process.exit(2);
}
const rootArg = args.find((a) => !a.startsWith('--'));
const root = path.resolve(rootArg ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const table = JSON.parse(fs.readFileSync(path.join(root, 'tools/licences.json'), 'utf8'));

const failures = [];
const fail = (msg) => { failures.push(msg); console.log(`licences: fail ${msg}`); };
const report = (msg) => console.log(`licences: report ${msg}`);
const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };

// Glob to RegExp: ** spans directories, * stays inside one segment.
function globRe(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
    } else if (c === '*') re += '[^/]*';
    else re += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

const paths = table.paths ?? [];
const compiled = paths.map((row) => ({ row, res: row.glob.map(globRe) }));
const licenceOf = (rel) => compiled.find((c) => c.res.some((r) => r.test(rel)))?.row;

// Path map shape.
const rowFor = (glob) => paths.findIndex((r) => r.glob.includes(glob));
const required = [
  ['logo', 'reference/copper/_inputs/hackbuild-logo.svg', 'mark'],
  ['template', 'packages/*/templates/**', 'MIT-0'],
  ['template', 'core/templates/**', 'MIT-0'],
  ['template', 'designs/*/firmware/templates/**', 'MIT-0'],
  ['docs', 'docs/**', 'CC-BY-4.0'],
  ['docs', 'README.md', 'CC-BY-4.0'],
  ['docs', 'packages/*/README.md', 'CC-BY-4.0'],
  ['catch-all', '**', 'MIT'],
];
for (const [what, glob, licence] of required) {
  const i = rowFor(glob);
  if (i < 0) fail(`path map has no ${what} row for ${glob}`);
  else if (paths[i].licence !== licence) fail(`path map ${glob} is ${paths[i].licence}, expected ${licence}`);
}
if (rowFor('reference/copper/_inputs/hackbuild-logo.svg') !== 0) fail('logo row is not the first path-map row');
if (rowFor('**') !== paths.length - 1) fail('catch-all ** row is not the last path-map row');
if (rowFor('packages/*/templates/**') > rowFor('designs/*/firmware/**')) fail('template rows sit below the designs/*/firmware/** row');
for (const row of paths) {
  if (row.text && !fs.existsSync(path.join(root, row.text))) fail(`path map names ${row.text} for ${row.licence} and the file is missing`);
}
report(`path map ${paths.length} rows; logo, template and docs rows present`);

// Dependency rows.
const deps = table.dependencies ?? [];
const key = (eco, name, version) => `${eco}:${name}@${version}`;
const byKey = new Map(deps.map((d) => [key(d.ecosystem, d.name, d.version), d]));
for (const d of deps) {
  const id = key(d.ecosystem, d.name, d.version);
  if (/\bA?GPL/.test(d.audited ?? '') && d.status !== 'excluded') fail(`${id} audited ${d.audited}: GPL or AGPL in the closure (D-043)`);
  if (d.audited === 'unknown' && d.status !== 'excluded') fail(`${id} audited unknown and status ${d.status}; only an excluded row may stay unknown`);
  if (/LGPL/.test(d.audited ?? '') && d.load !== 'lazy-separate-file') fail(`${id} audited ${d.audited} with load ${d.load}; LGPL loads only as a lazy separate file (D-043)`);
  if (!d.evidence) fail(`${id} has no evidence`);
}

const lock = readJson(path.join(root, 'package-lock.json'));
let npmCount = 0;
if (!lock) fail('package-lock.json missing or unreadable');
else {
  for (const [k, v] of Object.entries(lock.packages ?? {})) {
    if (!k.includes('node_modules/') || v.link) continue;
    const name = k.slice(k.lastIndexOf('node_modules/') + 'node_modules/'.length);
    npmCount += 1;
    const row = byKey.get(key('npm', name, v.version));
    if (!row) fail(`npm ${name}@${v.version} (${k}) has no row in tools/licences.json`);
    else if ((v.license ?? null) !== row.published) fail(`npm ${name}@${v.version} publishes ${v.license ?? null}, row records ${row.published}`);
  }
}

const uvLock = path.join(root, 'tools/py/uv.lock');
let pyCount = 0;
if (fs.existsSync(uvLock)) {
  const pyproject = fs.readFileSync(path.join(root, 'tools/py/pyproject.toml'), 'utf8');
  const self = /^name\s*=\s*"([^"]+)"/m.exec(pyproject)?.[1];
  const text = fs.readFileSync(uvLock, 'utf8');
  for (const block of text.split(/^\[\[package\]\]$/m).slice(1)) {
    const name = /^name = "([^"]+)"/m.exec(block)?.[1];
    const version = /^version = "([^"]+)"/m.exec(block)?.[1];
    if (!name || name === self) continue;
    pyCount += 1;
    if (!byKey.has(key('pypi', name, version))) fail(`pypi ${name}==${version} has no row in tools/licences.json`);
  }
}
report(`${npmCount} npm and ${pyCount} pypi lockfile entries, ${deps.length} rows (counted)`);

// Workspace package.json licence against the path map.
const rootPkg = readJson(path.join(root, 'package.json'));
const dirs = [];
for (const pattern of rootPkg?.workspaces ?? []) {
  if (pattern.endsWith('/*')) {
    const base = path.join(root, pattern.slice(0, -2));
    if (fs.existsSync(base)) for (const e of fs.readdirSync(base, { withFileTypes: true })) if (e.isDirectory()) dirs.push(path.posix.join(pattern.slice(0, -2), e.name));
  } else dirs.push(pattern);
}
for (const dir of ['.', ...dirs]) {
  const rel = dir === '.' ? 'package.json' : `${dir}/package.json`;
  const pkg = readJson(path.join(root, rel));
  if (!pkg) continue;
  const row = licenceOf(rel);
  if (!row || row.licence === 'chase' || row.licence === 'mark') continue;
  if (pkg.license !== row.licence) fail(`${rel} license ${pkg.license ?? 'absent'}, path map says ${row.licence}`);
}

// KiCad library files carry KiCad's LICENSE.md beside them.
const kicad = path.join(root, 'packages/catalog/data/kicad');
if (fs.existsSync(kicad) && fs.readdirSync(kicad).length > 0 && !fs.existsSync(path.join(kicad, 'LICENSE.md'))) {
  fail('packages/catalog/data/kicad holds files without KiCad LICENSE.md');
}

console.log(`licences: ${failures.length === 0 ? 'pass' : `${failures.length} failures`}`);
process.exit(failures.length === 0 ? 0 : 1);
