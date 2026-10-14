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
const script = path.join(repo, 'tools/tiers.mjs');
const table = JSON.parse(fs.readFileSync(path.join(repo, 'tools/tiers.json'), 'utf8'));

const run = (root) => spawnSync(process.execPath, [script, ...(root ? [root] : [])], { encoding: 'utf8' });
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
};

// A temp workspace with every tier entry as an empty skeleton, the apps absent.
function scratch() {
  const root = keep(fs.mkdtempSync(path.join(os.tmpdir(), 'hbf-tiers-')));
  fs.mkdirSync(path.join(root, 'tools'));
  // The scratch packages import nothing, so the real edgeExceptions would be
  // stale here; the exception tests write their own.
  writeJson(path.join(root, 'tools/tiers.json'), { ...table, edgeExceptions: [] });
  const dirs = ['spec'];
  for (const t of ['0', '1', '2', '3']) for (const n of table.tiers[t]) dirs.push(`packages/${n}`);
  dirs.push(table.kernel.package, 'core');
  for (const d of dirs) {
    const name = path.basename(d);
    writeJson(path.join(root, d, 'package.json'), { name: `@hackbuild/${name}`, version: '0.0.0', private: true });
    writeJson(path.join(root, d, 'tsconfig.json'), { include: ['src'], references: [] });
    fs.mkdirSync(path.join(root, d, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, d, 'src/index.ts'), 'export {};\n');
  }
  writeJson(path.join(root, 'tsconfig.json'), { files: [], references: dirs.map((p) => ({ path: p })) });
  fs.writeFileSync(path.join(root, 'spec/index.ts'), 'export {};\n');
  return root;
}
const put = (root, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
};
const depend = (root, dir, deps) => writeJson(path.join(root, dir, 'package.json'), {
  name: `@hackbuild/${path.basename(dir)}`, version: '0.0.0', private: true,
  dependencies: Object.fromEntries(deps.map((d) => [`@hackbuild/${d}`, '0.0.0'])),
});

test('the scratch workspace passes as built', () => {
  const r = run(scratch());
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /apps\/fab absent/);
});

test('mesh depending on @hackbuild/checks fails', () => {
  const root = scratch();
  writeJson(path.join(root, 'packages/mesh/package.json'), {
    name: '@hackbuild/mesh', version: '0.0.0', private: true, dependencies: { '@hackbuild/checks': '0.0.0' },
  });
  const r = run(root);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /mesh \(tier 0\) imports @hackbuild\/checks \(tier 2\)/);
});

test('geom/src/x.ts reading window.devicePixelRatio fails', () => {
  const root = scratch();
  fs.writeFileSync(path.join(root, 'packages/geom/src/x.ts'), 'export const dpr = window.devicePixelRatio;\n');
  const r = run(root);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /packages\/geom\/src\/x\.ts touches the DOM/);
});

test('mesh/src importing profile with the dependency but no tsconfig reference fails', () => {
  const root = scratch();
  // mesh to profile is a same-tier pair that M00-T01 adds to sameTier (PACKAGES.md 3.2).
  writeJson(path.join(root, 'tools/tiers.json'), { ...table, edgeExceptions: [], sameTier: [['mesh', 'profile']] });
  writeJson(path.join(root, 'packages/mesh/package.json'), {
    name: '@hackbuild/mesh', version: '0.0.0', private: true, dependencies: { '@hackbuild/profile': '0.0.0' },
  });
  fs.writeFileSync(path.join(root, 'packages/mesh/src/index.ts'), "export { } from '@hackbuild/profile';\n");
  const r = run(root);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /no \{"path": \.\.\.\} reference in packages\/mesh\/tsconfig\.json/);
  writeJson(path.join(root, 'packages/mesh/tsconfig.json'), { include: ['src'], references: [{ path: '../profile' }] });
  const fixed = run(root);
  assert.equal(fixed.status, 0, fixed.stdout);
});

test('a downward edge the edges list does not name fails (copper to mesh)', () => {
  const root = scratch();
  depend(root, 'packages/copper', ['mesh']);
  const r = run(root);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /copper imports @hackbuild\/mesh, an edge tools\/tiers\.json edges\.copper does not list/);
});

// M09-T01 step 5 (D-044): ui and ui-core share tier 3 and ui renders
// ui-core state, so sameTier admits ui to ui-core in that direction only.
const uiImportsCore = (root) => {
  depend(root, 'packages/ui', ['ui-core']);
  writeJson(path.join(root, 'packages/ui/tsconfig.json'), { include: ['src'], references: [{ path: '../ui-core' }] });
  fs.writeFileSync(path.join(root, 'packages/ui/src/index.ts'), "export { } from '@hackbuild/ui-core';\n");
};

test('ui importing ui-core passes on the sameTier pair and fails without it', () => {
  assert.ok(table.sameTier.some((p) => p[0] === 'ui' && p[1] === 'ui-core'), 'tools/tiers.json sameTier has no ["ui", "ui-core"]');
  const root = scratch();
  uiImportsCore(root);
  const r = run(root);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  writeJson(path.join(root, 'tools/tiers.json'), { ...table, edgeExceptions: [], sameTier: table.sameTier.filter((p) => p[0] !== 'ui') });
  const bare = run(root);
  assert.equal(bare.status, 1, bare.stdout);
  assert.match(bare.stdout, /ui \(tier 3\) imports @hackbuild\/ui-core \(tier 3\), legal only from a higher tier/);
});

test('ui-core importing @hackbuild/ui fails, even with the edge listed', () => {
  const root = scratch();
  depend(root, 'packages/ui-core', ['ui']);
  writeJson(path.join(root, 'packages/ui-core/tsconfig.json'), { include: ['src'], references: [{ path: '../ui' }] });
  fs.writeFileSync(path.join(root, 'packages/ui-core/src/index.ts'), "export { } from '@hackbuild/ui';\n");
  const r = run(root);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /ui-core imports @hackbuild\/ui, an edge tools\/tiers\.json edges\.ui-core does not list/);
  // the pair is directional: listing the edge still meets the rank rule
  const edges = { ...table.edges, 'ui-core': [...table.edges['ui-core'], 'ui'] };
  writeJson(path.join(root, 'tools/tiers.json'), { ...table, edgeExceptions: [], edges });
  const listed = run(root);
  assert.equal(listed.status, 1, listed.stdout);
  assert.match(listed.stdout, /ui-core \(tier 3\) imports @hackbuild\/ui \(tier 3\), legal only from a higher tier/);
});

test('3mf importing any workspace package fails without an exception', () => {
  const root = scratch();
  depend(root, 'packages/3mf', ['spec']);
  put(root, 'packages/3mf/src/index.ts', "export type { CheckResult } from '@hackbuild/spec';\n");
  const r = run(root);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /packages\/3mf\/src\/index\.ts: 3mf imports @hackbuild\/spec, an edge/);
});

test('an edgeExceptions entry is reported while used and fails once stale', () => {
  const root = scratch();
  const ex = [{ source: '3mf', targets: ['spec'], since: '2026-10-05', note: 'probe' }];
  writeJson(path.join(root, 'tools/tiers.json'), { ...table, edgeExceptions: ex });
  depend(root, 'packages/3mf', ['spec']);
  const used = run(root);
  assert.equal(used.status, 0, used.stdout);
  assert.match(used.stdout, /report 3mf imports @hackbuild\/spec under edgeExceptions/);
  depend(root, 'packages/3mf', []);
  const stale = run(root);
  assert.equal(stale.status, 1, stale.stdout);
  assert.match(stale.stdout, /edgeExceptions lists 3mf to spec, which no edge uses any more/);
});

test('a workspace with no edges entry fails', () => {
  const root = scratch();
  const edges = { ...table.edges };
  delete edges.sim;
  writeJson(path.join(root, 'tools/tiers.json'), { ...table, edges, edgeExceptions: [] });
  const r = run(root);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /edges has no list for sim/);
});

test('an upward import in test/ fails', () => {
  const root = scratch();
  put(root, 'packages/geom/test/zz-upward.test.ts', "import '@hackbuild/checks';\n");
  const r = run(root);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /packages\/geom\/test\/zz-upward\.test\.ts: geom imports @hackbuild\/checks/);
});

test('a listed import in test/ with no declared dependency passes', () => {
  const root = scratch();
  put(root, 'packages/mesh/test/a.test.ts', "import { x } from '@hackbuild/profile';\n");
  const r = run(root);
  assert.equal(r.status, 0, r.stdout);
});

test('a relative import in test/ that lands in another workspace counts as an edge', () => {
  const root = scratch();
  put(root, 'packages/geom/test/rel.test.ts', "import { x } from '../../checks/src/index.js';\n");
  const r = run(root);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /geom imports @hackbuild\/checks/);
});

test('a forbidden edge or DOM use in scenes/ fails as in src/ (the sim scenes load at run time)', () => {
  const root = scratch();
  put(root, 'packages/geom/scenes/zz.ts', "import { x } from '@hackbuild/checks';\nexport const w = window.innerWidth;\n");
  const r = run(root);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /packages\/geom\/scenes\/zz\.ts: geom \(tier 0\) imports @hackbuild\/checks/);
  assert.match(r.stdout, /packages\/geom\/scenes\/zz\.ts touches the DOM/);
});

test('a scenes file importing its own package src by a relative path passes', () => {
  const root = scratch();
  put(root, 'packages/geom/scenes/ok.ts', "import { x } from '../src/index.js';\nimport { readFileSync } from 'node:fs';\n");
  const r = run(root);
  assert.equal(r.status, 0, r.stdout);
});

test('a forbidden edge in scripts/, bench/ or a loose file at the package root fails', () => {
  for (const rel of ['packages/geom/scripts/x.mjs', 'packages/geom/bench/x.mjs', 'packages/geom/vitest.config.ts']) {
    const root = scratch();
    put(root, rel, "import '@hackbuild/checks';\n");
    const r = run(root);
    assert.equal(r.status, 1, `${rel}: ${r.stdout}`);
    assert.match(r.stdout, new RegExp(`${rel.replace(/[./]/g, (c) => `\\${c}`)}: geom \\(tier 0\\) imports @hackbuild/checks`));
  }
});

test('a relative import in src/ that leaves the workspace fails', () => {
  const root = scratch();
  put(root, 'packages/geom/src/zz-rel.ts', "export * from '../../profile/src/index.js';\n");
  const r = run(root);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /packages\/geom\/src\/zz-rel\.ts: relative import \.\.\/\.\.\/profile\/src\/index\.js leaves packages\/geom/);
});

test('a computed import() in a headless src/ fails; a literal import() passes', () => {
  const root = scratch();
  put(root, 'packages/geom/src/zz-dyn.ts', 'const name = "@hackbuild/checks";\nexport const m = () => import(name);\nexport const n = () => import(`@hackbuild/${"ui"}`);\n');
  put(root, 'packages/geom/src/zz-lit.ts', 'export const l = () => import("./index.js");\n// a comment: import(name) is not code\n');
  put(root, 'packages/geom/src/zz-prose.ts', 'export const why = "archetypes may not import (tools/tiers.json) here";\nexport const t = `nor import(${1})`;\n');
  const r = run(root);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /packages\/geom\/src\/zz-dyn\.ts: import\(name\) is computed/);
  assert.match(r.stdout, /packages\/geom\/src\/zz-dyn\.ts: import\(`@hackbuild\/\$\{"ui"\}`\) is computed/);
  assert.doesNotMatch(r.stdout, /zz-lit/);
  assert.doesNotMatch(r.stdout, /zz-prose/);
});

test('a new URL in src/ that reaches another workspace fails; one to repo data is reported', () => {
  const root = scratch();
  put(root, 'packages/geom/src/zz-url.ts', 'export const u = new URL("../../profile/src/index.ts", import.meta.url);\n');
  put(root, 'packages/mesh/src/zz-data.ts', 'export const d = new URL("../../../designs/x/legacy/", import.meta.url);\n');
  const r = run(root);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /packages\/geom\/src\/zz-url\.ts: new URL\('\.\.\/\.\.\/profile\/src\/index\.ts'\) reaches packages\/profile/);
  assert.match(r.stdout, /tiers: report packages\/mesh\/src\/zz-data\.ts reads designs\/x\/legacy by URL/);
  assert.equal((r.stdout.match(/tiers: fail/g) ?? []).length, 1, r.stdout);
});

test('spec sources at the folder root are scanned', () => {
  const root = scratch();
  put(root, 'spec/ids.ts', "import type { P } from '@hackbuild/profile';\n");
  const r = run(root);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /spec\/ids\.ts: spec imports @hackbuild\/profile/);
});

for (const [name, line] of [
  ['globalThis.document', 'export const d = globalThis.document;\n'],
  ['self["window"]', 'export const w = self["window"];\n'],
  ['document[key]', 'export const f = (k: string) => document[k as "title"];\n'],
  ['an HTML*Element type', 'export type C = HTMLCanvasElement;\n'],
]) {
  test(`geom/src using ${name} fails`, () => {
    const root = scratch();
    put(root, 'packages/geom/src/x.ts', line);
    const r = run(root);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /packages\/geom\/src\/x\.ts touches the DOM/);
  });
}

test('the word document in a comment is not DOM use', () => {
  const root = scratch();
  put(root, 'packages/geom/src/x.ts', '// the typed design document. A chase holds\n/* window. */\nexport const s = "//";\n');
  const r = run(root);
  assert.equal(r.status, 0, r.stdout);
});

test('a module path ending in -window.js is not DOM use', () => {
  const root = scratch();
  put(root, 'packages/geom/src/x.ts', 'export { w } from "./click-spring-window.js";\n');
  put(root, 'packages/geom/src/click-spring-window.ts', 'export const w = 1;\n');
  const r = run(root);
  assert.equal(r.status, 0, r.stdout);
});

test('Math.random under packages/sim/src fails, in code or in a comment (M02-T01 step 6)', () => {
  for (const text of ['export const r = () => Math.random();\n', '// never Math.random here\nexport {};\n', 'export const r = Math["random"];\n']) {
    const root = scratch();
    put(root, 'packages/sim/src/trial.ts', text);
    const r = run(root);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /packages\/sim\/src\/trial\.ts:\d+: matches the forbid pattern for packages\/sim\/src/);
  }
});

test('Math.random outside packages/sim/src and a name like randomSeed pass', () => {
  const root = scratch();
  put(root, 'packages/sim/test/x.test.ts', 'export const r = Math.random();\n');
  put(root, 'packages/geom/src/x.ts', 'export const r = Math.random();\n');
  put(root, 'packages/sim/src/x.ts', 'export const randomSeed = 1; export const m = Math.max(1, 2);\n');
  const r = run(root);
  assert.equal(r.status, 0, r.stdout);
});

test('Math.random or a Date under packages/nest/src fails, in code or in a comment (M07-T03 step 7)', () => {
  const cases = [
    'export const r = () => Math.random();\n',
    '// never Math.random here\nexport {};\n',
    'export const now = () => Date.now();\n',
    'export const d = new Date(0);\n',
    '// no Date in a layout\nexport {};\n',
  ];
  for (const text of cases) {
    const root = scratch();
    put(root, 'packages/nest/src/shelf.ts', text);
    const r = run(root);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /packages\/nest\/src\/shelf\.ts:\d+: matches the forbid pattern for packages\/nest\/src/);
  }
});

test('Date and Math.random in nest tests, and words like update or SOURCE_DATE_EPOCH in nest src, pass', () => {
  const root = scratch();
  put(root, 'packages/nest/test/x.test.ts', 'export const t = Date.now() + Math.random();\n');
  put(root, 'packages/nest/src/x.ts', '// validate and update the layout; SOURCE_DATE_EPOCH is a build input\nexport const randomSeed = 1;\n');
  const r = run(root);
  assert.equal(r.status, 0, r.stdout);
});

test('a trig placement of an OGEE16, DAVIT or DERRICK part outside packages/motion/src/kinematics fails (M07-T10 step 4)', () => {
  const cases = [
    ['packages/sim/scenes/ogee.ts', 'export const rocker = (dz: number, dx: number) => Math.atan2(dz, dx);\n', /packages\/sim\/scenes\/ogee\.ts: calls atan2 and names ogee16 part rocker/],
    ['packages/ui-core/src/view.ts', 'const crankPhi = (s: number) => 180 - Math.asin(s);\nexport { crankPhi };\n', /calls asin and names ogee16 part crankPhi/],
    ['core/test/arm.test.ts', 'const jaw_drive = Math.hypot(3, 4);\nexport { jaw_drive };\n', /calls hypot and names davit part jaw_drive/],
    ['designs/derrick/build.ts', 'export const M_hinge = (q: number) => Math.atan2(Math.sin(q), Math.cos(q));\n', /calls atan2 and names derrick part M_hinge/],
  ];
  for (const [rel, text, want] of cases) {
    const root = scratch();
    put(root, rel, text);
    const r = run(root);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, want);
  }
});

test('the kinematics folder, a legacy copy, a comment or a string may hold both; trig alone or a part alone passes', () => {
  const root = scratch();
  put(root, 'packages/motion/src/kinematics/ogee.ts', 'export const link3 = (dz: number, dx: number) => ({ th: Math.atan2(dz, dx), L: Math.hypot(dx, dz) });\n');
  put(root, 'designs/ogee16/legacy/source/kin_block.js', 'function link3(){ return Math.atan2(1, 2); }\n');
  put(root, 'packages/motion/test/k.test.ts', '// rocker angle by Math.atan2(dz, dx)\nexport const t = "pinState asin(0.5)";\n');
  put(root, 'packages/sim/src/pawl.ts', 'export const hipRoll = (x: number, y: number) => Math.atan2(x, -y);\n');
  put(root, 'packages/sim/scenes/ogee.ts', 'export const rocker = 1;\n');
  const r = run(root);
  assert.equal(r.status, 0, r.stdout);
});

test('the real repo passes', () => {
  const r = run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('an inline normal x u outside packages/geom/src fails; the geom face-frame home passes (audit3)', () => {
  const inline = 'export const v = (n, u) => [n[1] * u[2] - n[2] * u[1], 0, 0];\n';
  for (const file of ['packages/checks/src/net/x.ts', 'core/src/x.ts', 'spec/x.ts']) {
    const root = scratch();
    put(root, file, inline);
    const r = run(root);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, new RegExp(`${file.replace(/[./]/g, '\\$&')}:1: matches the forbid pattern`));
  }
  const root = scratch();
  put(root, 'packages/geom/src/face-frame.ts', inline);
  const r = run(root);
  assert.equal(r.status, 0, r.stdout);
});
