import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TRIGGERS, closure, main, partOne, partTwo } from '../extract-check.mjs';


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
const script = path.join(repo, 'tools/extract-check.mjs');
const tiers = JSON.parse(fs.readFileSync(path.join(repo, 'tools/tiers.json'), 'utf8'));

const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const pj = (name, extra = {}) => JSON.stringify({ name, version: '0.0.0', private: true, ...extra });

// A workspace with spec, packages/{geom,inlay}, kernel and one design per trigger design.
function scratch({ kernelPrivate = true, kernelExports = {}, inlaySrc = 'import { a } from "@hackbuild/geom";\n' } = {}) {
  const root = keep(fs.mkdtempSync(path.join(os.tmpdir(), 'hbf-extract-')));
  write(path.join(root, 'package.json'), JSON.stringify({ name: 'r', private: true, workspaces: ['spec', 'packages/*', 'kernel'] }));
  write(path.join(root, 'spec/package.json'), pj('@hackbuild/spec'));
  write(path.join(root, 'packages/geom/package.json'), pj('@hackbuild/geom'));
  write(path.join(root, 'packages/inlay/package.json'), pj('@hackbuild/inlay', { dependencies: { '@hackbuild/spec': '0.0.0' } }));
  write(path.join(root, 'packages/inlay/src/index.ts'), inlaySrc);
  write(path.join(root, 'kernel/package.json'), JSON.stringify({ name: '@hackbuild/kernel', private: kernelPrivate, exports: kernelExports }));
  for (const id of TRIGGERS.inlay.designs) {
    write(path.join(root, `designs/${id}/build.ts`), 'import { defineBuild } from "@hackbuild/spec";\n');
    write(path.join(root, `designs/${id}/test/parity.entry.ts`), 'import { composeFace } from "@hackbuild/inlay";\n');
    write(path.join(root, `designs/${id}/legacy/${id}.js`), 'export const old = 1;\n');
  }
  return root;
}

test('closure of the real inlay package fails on exactly its tiers.json edges while the kernel is private', () => {
  const c = closure(repo, 'inlay');
  assert.equal(c.holds, false);
  assert.deepEqual(c.blocked, [...tiers.edges.inlay].sort());
  assert.deepEqual(c.escapes, []);
  assert.equal(c.kernelOpen, false);
});

test('part one holds on the real designs through their parity entries', () => {
  const r = partOne(repo, 'inlay', TRIGGERS.inlay);
  assert.equal(r.holds, true);
  for (const d of r.designs) {
    assert.deepEqual(d.importers, ['test/parity.entry.ts']);
    assert.deepEqual(d.legacy, []);
  }
});

test('part one fails when a design only names the package in a comment', () => {
  const root = scratch();
  write(path.join(root, 'designs/sprue/test/parity.entry.ts'), '// composed by @hackbuild/inlay\n// import { x } from "@hackbuild/inlay";\nexport {};\n');
  const r = partOne(root, 'inlay', TRIGGERS.inlay);
  assert.equal(r.holds, false);
  assert.deepEqual(r.designs.find((d) => d.id === 'sprue').importers, []);
  assert.deepEqual(r.designs.find((d) => d.id === 'collar').importers, ['test/parity.entry.ts']);
});

test('part one fails when a design imports legacy code', () => {
  const root = scratch();
  write(path.join(root, 'designs/collar/build.ts'), 'import { old } from "./legacy/collar.js";\n');
  const r = partOne(root, 'inlay', TRIGGERS.inlay);
  assert.equal(r.holds, false);
  assert.deepEqual(r.designs.find((d) => d.id === 'collar').legacy, ['build.ts imports ./legacy/collar.js']);
});

test('part one fails when a trigger design is missing', () => {
  const root = scratch();
  fs.rmSync(path.join(root, 'designs/collar'), { recursive: true });
  const r = partOne(root, 'inlay', TRIGGERS.inlay);
  assert.equal(r.holds, false);
  assert.equal(r.designs.find((d) => d.id === 'collar').missing, true);
});

test('closure holds once the kernel is public and exports every dependency subpath', () => {
  const open = closure(scratch({ kernelPrivate: false, kernelExports: { './geom': {}, './spec': {} } }), 'inlay');
  assert.equal(open.holds, true);
  assert.deepEqual(open.imports, ['@hackbuild/geom', '@hackbuild/spec']);
  const partial = closure(scratch({ kernelPrivate: false, kernelExports: { './geom': {} } }), 'inlay');
  assert.deepEqual(partial.blocked, ['spec']);
  const closed = closure(scratch({ kernelPrivate: true, kernelExports: { './geom': {}, './spec': {} } }), 'inlay');
  assert.deepEqual(closed.blocked, ['geom', 'spec']);
});

test('closure counts declared dependencies, ignores builtins and fails a relative import that leaves the package', () => {
  const c = closure(scratch({ inlaySrc: 'import fs from "node:fs";\nimport { b } from "../../geom/src/b";\nimport x from "earcut";\n' }), 'inlay');
  assert.deepEqual(c.imports, ['@hackbuild/spec', 'earcut']);
  assert.deepEqual(c.external, ['earcut']);
  assert.deepEqual(c.blocked, ['spec']);
  assert.deepEqual(c.escapes, ['packages/inlay/src/index.ts imports ../../geom/src/b']);
});

test('part two holds only when every parity command starts and exits 0', () => {
  const ok = () => ({ status: 0, stdout: '', stderr: '' });
  assert.equal(partTwo(repo, TRIGGERS.inlay, ok).holds, true);
  const calls = [];
  partTwo(repo, TRIGGERS.inlay, (cmd, args) => { calls.push([cmd, ...args].join(' ')); return ok(); });
  assert.deepEqual(calls, [
    'uv run --project tools/py --extra bench tools/py/harness/collar_parity.py designs/collar/legacy/collar.html designs/collar/test/parity.html',
    'uv run --project tools/py --extra bench tools/py/harness/sprue_parity.py designs/sprue/legacy/sprue.html designs/sprue/test/parity.html',
    'npx --no-install hbf parity reference/cosmetic/coin-inlay',
  ]);
  const one = partTwo(repo, TRIGGERS.inlay, (cmd, args) => ({ status: args.includes('reference/cosmetic/coin-inlay') ? 1 : 0, stdout: 'differ\n', stderr: '' }));
  assert.equal(one.holds, false);
  const missing = partTwo(repo, TRIGGERS.inlay, () => ({ error: Object.assign(new Error('spawn uv ENOENT'), { code: 'ENOENT' }) }));
  assert.equal(missing.holds, false);
  assert.ok(missing.rows.every((r) => !r.ran && r.reason === 'ENOENT'));
});

test('main prints three lines and exits 0 only when all three hold', () => {
  const lines = [];
  const ok = () => ({ status: 0, stdout: '', stderr: '' });
  const open = scratch({ kernelPrivate: false, kernelExports: { './geom': {}, './spec': {} } });
  assert.equal(main(['inlay', '--root', open], { run: ok, log: (l) => lines.push(l) }), 0);
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^trigger part one \(D-028\): holds/);
  assert.match(lines[1], /^trigger part two \(D-028\): holds; collar_parity exit 0, sprue_parity exit 0, hbf parity reference\/cosmetic\/coin-inlay exit 0$/);
  assert.match(lines[2], /^import closure: holds/);
  assert.equal(main(['inlay', '--root', open, '--skip-parity'], { run: ok, log: () => {} }), 1);
  assert.equal(main(['inlay', '--root', scratch()], { run: ok, log: () => {} }), 1);
  assert.equal(main(['copper', '--root', open], { run: ok, log: () => {} }), 2);
});

test('the cli on the repo, parity skipped, prints three lines with the closure deferred and exits 1', () => {
  const r = spawnSync(process.execPath, [script, 'inlay', '--skip-parity'], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.deepEqual(r.stdout.trim().split('\n'), [
    'trigger part one (D-028): holds; collar via test/parity.entry.ts; sprue via test/parity.entry.ts; no legacy import',
    'trigger part two (D-028): not run (--skip-parity)',
    'import closure: fails on geom, mesh, profile, spec (private workspace packages; @hackbuild/kernel is private; D-036, D-037); extraction deferred until @hackbuild/kernel publishes',
  ]);
});

// M05-T16: the copper trigger (D-029).

const m05 = fs.readFileSync(path.join(repo, 'docs/plan/milestones/M05-circuit-copper.md'), 'utf8');
const exitTable = m05.slice(m05.indexOf('\n## Exit\n'));
// The six boards behind `reference/copper/<name>` in the Exit table, from M05-T15's Files line.
const familyNames = () => {
  const m = /reference\/copper\/\{([a-z,]+)\}\/\{chase\.ts/.exec(m05);
  assert.ok(m, 'M05-T15 Files line names the six boards');
  return m[1].split(',');
};

test('the copper trigger runs the BLOCKS seat test and every reference the M05 Exit table runs through hbf parity', () => {
  const wanted = [];
  for (const m of exitTable.matchAll(/`npx --no-install hbf parity (reference\/[^`]+)`/g)) {
    if (m[1] === 'reference/copper/<name>') wanted.push(...familyNames().map((n) => `reference/copper/${n}`));
    else wanted.push(m[1]);
  }
  assert.ok(wanted.length >= 13, `Exit table parity rows: ${wanted.length}`);
  assert.ok(exitTable.includes('`npm test -w designs/blocks -- route-seat`'));
  const calls = [];
  partTwo(repo, TRIGGERS.copper, (cmd, args) => { calls.push([cmd, ...args].join(' ')); return { status: 0, stdout: '', stderr: '' }; });
  assert.deepEqual(calls, [
    'npm test -w designs/blocks -- route-seat',
    ...[...new Set(wanted)].map((r) => `npx --no-install hbf parity ${r}`),
  ]);
});

test('copper part one holds on BLOCKS and the KEYWAY reference with no legacy import', () => {
  const r = partOne(repo, 'copper', TRIGGERS.copper);
  assert.equal(r.holds, true);
  const by = Object.fromEntries(r.designs.map((d) => [d.id, d]));
  assert.deepEqual(Object.keys(by), ['blocks', 'keyway']);
  assert.ok(by.blocks.importers.includes('src/route-seat.ts'));
  assert.ok(by.keyway.importers.includes('build.ts'));
  for (const d of r.designs) assert.deepEqual(d.legacy, []);
});

test('copper closure fails on exactly the private workspace packages copper declares', () => {
  const pj = JSON.parse(fs.readFileSync(path.join(repo, 'packages/copper/package.json'), 'utf8'));
  const declared = Object.keys(pj.dependencies ?? {}).filter((n) => n.startsWith('@hackbuild/')).map((n) => n.slice('@hackbuild/'.length)).sort();
  const c = closure(repo, 'copper');
  assert.equal(c.holds, false);
  assert.deepEqual(c.blocked, declared);
  assert.ok(c.blocked.every((p) => tiers.edges.copper.includes(p)));
  assert.deepEqual(c.escapes, []);
});

// docs/plan/extractions.md holds the recorded result; it may not claim more than the tree shows.
const extractionRows = () => {
  const text = fs.readFileSync(path.join(repo, 'docs/plan/extractions.md'), 'utf8');
  const rows = {};
  for (const line of text.split('\n')) {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length === 8 && /^hackbuild-/.test(cells[0])) {
      const [repoName, decision, one, two, clos, result, date, commit] = cells;
      rows[repoName] = { decision, one, two, clos, result, date, commit };
    }
  }
  return rows;
};

test('the extraction rows agree with part one, the closure and the parity references that have no chase', () => {
  const rows = extractionRows();
  for (const [pkg, name] of [['inlay', 'hackbuild-inlay'], ['copper', 'hackbuild-copper']]) {
    const row = rows[name];
    assert.ok(row, `${name} row`);
    assert.equal(row.decision, TRIGGERS[pkg].decision);
    assert.equal(row.one.split(' ')[0], partOne(repo, pkg, TRIGGERS[pkg]).holds ? 'holds' : 'fails');
    const c = closure(repo, pkg);
    assert.equal(row.clos, c.holds ? 'holds' : `fails on ${c.blocked.join(', ')}`);
    if (!c.holds) assert.doesNotMatch(row.result, /^(extracted|holds)/);
    assert.match(row.date, /^\d{4}-\d{2}-\d{2}$/);
  }
  // hbf parity builds chase.ts, or chase.surface.ts through core's surface
  // path (M05-T14 fixer, D-244); a reference with neither cannot pass part two.
  const row = rows['hackbuild-copper'];
  const hasChase = (ref) => ['chase.ts', 'chase.surface.ts'].some((f) => fs.existsSync(path.join(repo, ref, f)));
  const blocked = TRIGGERS.copper.parity
    .map((p) => p.args.at(-1))
    .filter((ref) => ref.startsWith('reference/') && !hasChase(ref));
  if (blocked.length) {
    assert.match(row.two, /^fails on /);
    const named = row.two.slice('fails on '.length).split(', ');
    const expanded = named.map((n, i) => (i === 0 || n.startsWith('reference/') ? n : `${path.posix.dirname(named[0])}/${n}`));
    assert.deepEqual(expanded.sort(), blocked.sort());
    assert.match(row.result, /^trigger fails/);
  } else {
    // Every parity reference has a chase, so the row may not record part two
    // as failing on a reference.
    assert.equal(row.two, 'holds');
  }
  const c = closure(repo, 'copper');
  if (!c.holds) assert.match(row.result, /^trigger fails on the import closure/);
});
