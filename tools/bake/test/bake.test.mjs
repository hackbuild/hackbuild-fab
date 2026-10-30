// node --test tools/bake/test/bake.test.mjs
// Fixtures are written to a temp folder per test; the PIP parity case reads the
// committed pip.html hash from lineage.json (row pip.baked), an independent record.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO, bake, BakeError, bundleIifeEntry, findManifests, iifeBlocks, libraryOrder, offFileRequests, pageModules, resolveFrom, sha256, styleTag, vendorPackages } from '../bake.mjs';
import { checkBaked, checkInstalled } from '../check-ui-css.mjs';
import { licenceManifest, readTable } from '../licence-manifest.mjs';
import { PEER_FILES } from '../../lib/outputs.mjs';
import { sourcesPlugin } from '../../lib/sidecar.mjs';

const SHELL = '<!doctype html>\n<html>\n<head>\n<style>\nbody{margin:0}\n</style>\n</head>\n<body>\n';

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'hbf-bake-'));
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(join(dir, name), typeof text === 'string' || Buffer.isBuffer(text) ? text : JSON.stringify(text));
  }
  return dir;
}

async function rejects(dir, pattern) {
  await assert.rejects(bake(join(dir, 'bake.json'), { outRoot: join(dir, 'dist') }), (e) => {
    assert.ok(e instanceof BakeError, `expected BakeError, got ${e}`);
    assert.match(e.message, pattern);
    return true;
  });
}

test('a clean fixture bakes, in manifest order, with LF and no absolute path', async () => {
  const dir = fixture({
    'shell.html': SHELL + '<script src="https://cdn.example/lib.js"></script>\n',
    'lib.js': 'var LIB=1;',
    'a.js': 'var A=LIB+1;',
    'w.bin': Buffer.from([0, 1, 2, 255]),
    'bake.json': {
      id: 'fx',
      shell: 'shell.html',
      vendor: [{ match: '<script src="https://cdn.example/lib.js"></script>', from: 'lib.js', label: 'inlined lib.js' }],
      blocks: [{ from: 'a.js', label: 'a.js' }],
      wasm: { from: 'w.bin', global: 'W', label: 'w.bin' },
    },
  });
  try {
    const r = await bake(join(dir, 'bake.json'), { outRoot: join(dir, 'dist') });
    const text = readFileSync(r.out, 'utf8');
    assert.equal(r.blocks, 2);
    assert.ok(text.includes('<script>/* inlined lib.js */\nvar LIB=1;\n</script>\n'));
    assert.ok(text.indexOf('/* a.js */') < text.indexOf('/* w.bin */'), 'blocks precede wasm, as listed');
    assert.ok(text.includes('globalThis.W="AAEC/w==";'));
    assert.ok(text.endsWith('</script>\n</body>\n</html>\n'));
    assert.ok(!text.includes('\r'));
    assert.ok(!text.includes(dir));
    assert.equal(r.sha256, sha256(text));
    const again = await bake(join(dir, 'bake.json'), { outRoot: join(dir, 'dist') });
    assert.equal(again.sha256, r.sha256, 'same inputs, same hash');
    const sums = readFileSync(join(dir, 'dist', 'legacy', 'SHA256SUMS'), 'utf8');
    assert.equal(sums, `${r.sha256}  fx.html\n`, 'one line per output, replaced on rebake');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a vendor match that hits twice fails', async () => {
  const tag = '<script src="https://cdn.example/lib.js"></script>';
  const dir = fixture({
    'shell.html': `${SHELL}${tag}\n${tag}\n`,
    'lib.js': 'var LIB=1;',
    'bake.json': { id: 'fx', shell: 'shell.html', vendor: [{ match: tag, from: 'lib.js', label: 'lib' }] },
  });
  try {
    await rejects(dir, /hit 2 times, legal 1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an em dash in a design block fails; the same dash in a vendored block passes', async () => {
  const dashed = `var s="a ${String.fromCodePoint(0x2014)} b";`;
  const dir = fixture({
    'shell.html': SHELL,
    'own.js': dashed,
    'bake.json': { id: 'fx', shell: 'shell.html', blocks: [{ from: 'own.js', label: 'own.js' }] },
  });
  try {
    await rejects(dir, /dash U\+2014 in .*own\.js line 1/);
    writeFileSync(
      join(dir, 'bake.json'),
      JSON.stringify({ id: 'fx', shell: 'shell.html', blocks: [{ from: 'own.js', label: 'own.js', vendored: true }] }),
    );
    await bake(join(dir, 'bake.json'), { outRoot: join(dir, 'dist') });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a minus sign U+2212 in the shell fails', async () => {
  const dir = fixture({ 'shell.html': `${SHELL}<p>${String.fromCodePoint(0x2212)} 1</p>\n`, 'bake.json': { id: 'fx', shell: 'shell.html' } });
  try {
    await rejects(dir, /dash U\+2212/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a network @import fails; a relative @import is inlined', async () => {
  const dir = fixture({
    'shell.html': SHELL,
    'net.css': '@import url("https://fonts.example/css2?family=X");\nbody{color:red}\n',
    'tok.css': ':root{--x:1}\n',
    'main.css': '@import "./tok.css";\nbody{color:var(--x)}\n',
    'bake.json': { id: 'fx', shell: 'shell.html', css: [{ from: 'net.css' }] },
  });
  try {
    await rejects(dir, /network @import https:\/\/fonts\.example/);
    writeFileSync(join(dir, 'bake.json'), JSON.stringify({ id: 'fx', shell: 'shell.html', css: [{ from: 'main.css' }] }));
    const r = await bake(join(dir, 'bake.json'), { outRoot: join(dir, 'dist') });
    const text = readFileSync(r.out, 'utf8');
    assert.ok(text.includes(':root{--x:1}\n\nbody{color:var(--x)}'));
    assert.ok(!text.includes('@import'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an over-budget fixture fails', async () => {
  const dir = fixture({
    'shell.html': SHELL,
    'big.js': 'x'.repeat(2048),
    'bake.json': { id: 'fx', shell: 'shell.html', budget: 1024, blocks: [{ from: 'big.js', label: 'big.js' }] },
  });
  try {
    await rejects(dir, /bytes, legal at most 1024/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a manifest with no budget passes at 16777216 bytes and fails one byte above (D-129)', async () => {
  const manifest = { id: 'fx', shell: 'shell.html', blocks: [{ from: 'big.js', label: 'big.js' }] };
  const probe = fixture({ 'shell.html': SHELL, 'big.js': '', 'bake.json': manifest });
  let overhead;
  try {
    overhead = (await bake(join(probe, 'bake.json'), { outRoot: join(probe, 'dist') })).bytes;
  } finally {
    rmSync(probe, { recursive: true, force: true });
  }
  for (const [extra, ok] of [[0, true], [1, false]]) {
    const dir = fixture({ 'shell.html': SHELL, 'big.js': 'x'.repeat(16777216 - overhead + extra), 'bake.json': manifest });
    try {
      if (ok) assert.equal((await bake(join(dir, 'bake.json'), { outRoot: join(dir, 'dist') })).bytes, 16777216);
      else await rejects(dir, /16777217 bytes, legal at most 16777216/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('a script src or a network link left in the output fails', async () => {
  const dir = fixture({ 'shell.html': SHELL + '<script src="local.js"></script>\n', 'bake.json': { id: 'fx', shell: 'shell.html' } });
  try {
    await rejects(dir, /<script src=>/);
    writeFileSync(join(dir, 'shell.html'), SHELL.replace('<style>', '<link href="https://fonts.example/x.css" rel="stylesheet">\n<style>'));
    await rejects(dir, /links off the file: https:\/\/fonts\.example/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a classic conversion asserts each replacement once and the trailing export', async () => {
  const esm = 'async function Module(a){var u=import.meta.url;return a}export default Module;';
  const spec = (replace) => ({
    id: 'fx',
    shell: 'shell.html',
    classic: [{ from: 'm.js', label: 'm', exportDefault: 'Module', global: 'M', replace }],
  });
  const dir = fixture({ 'shell.html': SHELL, 'm.js': esm, 'bake.json': spec([]) });
  try {
    await rejects(dir, /import\.meta left/);
    writeFileSync(join(dir, 'bake.json'), JSON.stringify(spec([{ match: 'nope', with: '' }])));
    await rejects(dir, /hit 0 times, legal 1/);
    writeFileSync(join(dir, 'bake.json'), JSON.stringify(spec([{ match: 'var u=import.meta.url;', with: 'var u="";' }])));
    const r = await bake(join(dir, 'bake.json'), { outRoot: join(dir, 'dist') });
    const text = readFileSync(r.out, 'utf8');
    assert.ok(text.includes('(function(){\nasync function Module(a){var u="";return a}\nglobalThis.M=Module;\n})();'));
    writeFileSync(join(dir, 'm.js'), esm.replace('export default Module;', ''));
    await rejects(dir, /expected one trailing "export default Module;"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('PIP legacy manifest bake equals pip.html byte for byte', async (t) => {
  const legacy = join(REPO, 'designs', 'pip', 'legacy');
  if (!existsSync(join(legacy, 'node_modules', 'three'))) {
    t.skip('not run: designs/pip/legacy/node_modules missing; run npm ci --prefix designs/pip/legacy');
    return;
  }
  const lineage = JSON.parse(readFileSync(join(REPO, 'lineage.json'), 'utf8'));
  const row = lineage.find((r) => r.id === 'pip.baked/pip-controller-b137deb');
  assert.ok(row, 'lineage row pip.baked/pip-controller-b137deb');
  const out = mkdtempSync(join(tmpdir(), 'hbf-bake-pip-'));
  try {
    const r = await bake(join(legacy, 'bake.json'), { outRoot: out });
    assert.equal(r.sha256, row.sha256);
    assert.equal(r.bytes, 1924558);
    assert.equal(r.blocks, 13);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('ui css lock: installed sheets match, one edited byte in a baked copy fails', () => {
  const lock = JSON.parse(readFileSync(join(REPO, 'tools', 'bake', 'ui-css.lock.json'), 'utf8'));
  // M09-T02 recorded this hash from the packed 0.3.0 tarball, independent of the lock.
  assert.equal(lock.files['dist/styles/hackbuild.css'], 'ab4317de12b43cf7081b661c4aa88bd9bf35842c33d749410ad8e2bc4628991a');
  assert.deepEqual(checkInstalled(lock), []);

  const css = join(REPO, 'node_modules', lock.package, 'dist', 'styles', 'hackbuild.css');
  const html = `<html><head>\n${styleTag(css)}\n</head></html>\n`;
  assert.deepEqual(checkBaked(lock, html, 'fx'), []);
  const i = html.indexOf('--hb-pink');
  const edited = html.slice(0, i) + '--hb-pinK' + html.slice(i + 9);
  assert.ok(checkBaked(lock, edited, 'fx').some((e) => /style text sha256/.test(e)));
  assert.deepEqual(checkBaked(lock, '<html></html>', 'fx'), ['fx: no hackbuild-ui style element']);

  const dir = mkdtempSync(join(tmpdir(), 'hbf-css-'));
  try {
    writeFileSync(join(dir, 'ok.html'), html);
    writeFileSync(join(dir, 'bad.html'), edited);
    const cli = join(REPO, 'tools', 'bake', 'check-ui-css.mjs');
    assert.equal(spawnSync(process.execPath, [cli, join(dir, 'ok.html')]).status, 0);
    assert.equal(spawnSync(process.execPath, [cli, join(dir, 'bad.html')]).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// LICENSING.md 3: a default bake never inlines an LGPL item, and every
// package a bake inlines has a licence row. The fixture sits under the
// repo's out/ so `npm:` sources resolve against the installed packages.
test('a default bake whose manifest lists an LGPL item fails; the licence manifest lists what it inlines', async () => {
  mkdirSync(join(REPO, 'out'), { recursive: true });
  const dir = mkdtempSync(join(REPO, 'out', 'bake-lgpl-'));
  try {
    writeFileSync(join(dir, 'shell.html'), SHELL);
    writeFileSync(join(dir, 'bake.json'), JSON.stringify({ id: 'fx', shell: 'shell.html', blocks: [{ from: 'npm:eecircuit-engine/dist/eecircuit-engine.umd.js', label: 'eecircuit-engine', vendored: true }] }));
    await rejects(dir, /eecircuit-engine@1\.8\.0 audited .*LGPL.* is inlined; LGPL items load only as a lazy separate file/);
    writeFileSync(join(dir, 'bake.json'), JSON.stringify({ id: 'fx', shell: 'shell.html', blocks: [{ from: 'npm:jszip/dist/jszip.min.js', label: 'jszip', vendored: true }] }));
    const r = await bake(join(dir, 'bake.json'), { outRoot: join(dir, 'dist') });
    assert.deepEqual(r.licences.map((x) => `${x.name}@${x.version} ${x.audited}`), ['jszip@3.10.1 MIT']);
    const written = JSON.parse(readFileSync(join(dir, 'dist', 'legacy', 'fx.licences.json'), 'utf8'));
    assert.deepEqual(written.inlined.map((x) => x.name), ['jszip']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('licence manifest: a package with no row and each LGPL row are problems', () => {
  const table = { dependencies: [
    { ecosystem: 'npm', name: 'a', version: '1.0.0', audited: 'MIT', load: 'bundled' },
    { ecosystem: 'npm', name: 'occt-import-js', version: '0.0.23', audited: 'LGPL-2.1-only', load: 'lazy-separate-file' },
  ] };
  const ok = licenceManifest([{ name: 'a', version: '1.0.0' }, { name: 'a', version: '1.0.0' }], table);
  assert.deepEqual(ok.problems, []);
  assert.equal(ok.rows.length, 1);
  const bad = licenceManifest([{ name: 'occt-import-js', version: '0.0.23' }, { name: 'b', version: '2.0.0' }], table);
  assert.equal(bad.problems.length, 2);
  assert.match(bad.problems.join('\n'), /b@2\.0\.0 is inlined and has no row/);
  assert.match(bad.problems.join('\n'), /occt-import-js@0\.0\.23 audited LGPL-2\.1-only is inlined/);
});

test('a page build reads the manifold and jszip globals the manifest lists before it (D-264)', () => {
  const manifold = { from: 'npm:manifold-3d/manifold.js', label: 'm', exportDefault: 'Module', global: 'ManifoldModule', replace: [] };
  const wasm = { from: 'npm:manifold-3d/manifold.wasm', global: 'MANIFOLD_WASM_B64', label: 'w' };
  const blocks = [{ from: 'npm:jszip/dist/jszip.min.js', label: 'j', vendored: true }];
  const build = { from: './page-build.ts', global: 'HbfPageBuild', label: 'b' };
  const mods = pageModules({ id: 'fx', shell: 'ui', wasm, classic: [manifold], blocks, build }, { name: 'fx' });
  assert.match(mods['manifold-3d'], /globalThis\["ManifoldModule"\]/);
  assert.match(mods['manifold-3d'], /globalThis\["MANIFOLD_WASM_B64"\]/);
  assert.match(mods.jszip, /globalThis\.JSZip/);
  assert.equal(mods['hbf:facts'], 'export const facts = {"name":"fx"};\n');
  assert.match(mods['eecircuit-engine'], /eecircuit-engine is not in this bake/);
  assert.match(mods['@dimforge/rapier3d-deterministic-compat'], /rapier3d-deterministic-compat is not in this bake/);
  assert.throws(() => pageModules({ id: 'fx', shell: 'ui', build, wasm, classic: [manifold], blocks }, null), /list build after wasm, classic and blocks/);
  assert.throws(() => pageModules({ id: 'fx', shell: 'ui', wasm, classic: [manifold], build }, null), /needs the jszip block/);
  assert.throws(() => pageModules({ id: 'fx', shell: 'ui', blocks, build }, null), /needs the manifold-3d classic script/);
});

test('off-file requests: src, srcset, poster and css url outside scripts; anchors and script text pass (D-129)', () => {
  const page =
    '<style>a{background:url(data:image/png;base64,AA)}b{background:url("https://cdn.example/b.png")}</style>\n' +
    '<img src="//cdn.example/i.png"><video poster=http://cdn.example/p.jpg></video><img srcset="https://cdn.example/s.png 2x">\n' +
    '<img src="data:image/png;base64,AA"><a href="https://hack.build">site</a>\n' +
    '<script>const ns="http://www.w3.org/2000/svg"; el.src="https://never.example/x.js";</script>\n';
  assert.deepEqual(offFileRequests(page), ['//cdn.example/i.png', 'http://cdn.example/p.jpg', 'https://cdn.example/s.png', 'https://cdn.example/b.png']);
});

test('a data block is one line of JSON under its +json type with every </ escaped; another type fails (R1-engine-24)', async () => {
  const dir = fixture({
    'shell.html': SHELL,
    'draft.json': { chase: 'const a = "</script><img src=x>";', n: 1 },
    'bake.json': { id: 'fx', shell: 'shell.html', data: [{ from: 'draft.json', type: 'application/hbf-draft+json', label: 'fx draft sources' }] },
  });
  try {
    const r = await bake(join(dir, 'bake.json'), { outRoot: join(dir, 'dist') });
    const text = readFileSync(r.out, 'utf8');
    const m = /<script type="application\/hbf-draft\+json">(.*)<\/script>\n/.exec(text);
    assert.ok(m, 'data block present');
    assert.ok(!m[1].includes('</'), 'no closing tag inside the block');
    assert.deepEqual(JSON.parse(m[1]), { chase: 'const a = "</script><img src=x>";', n: 1 });
    assert.deepEqual(offFileRequests(text), [], 'a src inside the block is no request');
    writeFileSync(join(dir, 'bake.json'), JSON.stringify({ id: 'fx', shell: 'shell.html', data: [{ from: 'draft.json', type: 'text/javascript', label: 'x' }] }));
    await rejects(dir, /is not an application\/<name>\+json type/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The classic-script route (manifest `libraries: "iife"`).

/** What each library reads from globals, as the real sidecars and peer package.json files record it. */
const READS = {
  '@hackbuild/bench': ['@hackbuild/bench-core', '@hackbuild/spec', '@hackbuild/viewer', 'pinia', 'vue'],
  '@hackbuild/bench-core': ['@hackbuild/spec', '@hackbuild/viewer'],
  '@hackbuild/viewer': ['three'],
  '@hackbuild/spec': [],
  pinia: ['vue'],
  vue: [],
  three: [],
};
const NAMES = ['vue', 'pinia', 'three', '@hackbuild/spec', '@hackbuild/viewer', '@hackbuild/bench-core', '@hackbuild/bench'];

test('library order: each library after everything it reads, peers first, ties by outputs.mjs order', () => {
  const reads = (lib) => READS[lib];
  assert.deepEqual(libraryOrder(['@hackbuild/bench/entry', '@hackbuild/spec'], reads), NAMES);
  assert.deepEqual(libraryOrder(['@hackbuild/spec', '@hackbuild/bench/entry'], reads), NAMES, 'the order the entry reads in does not matter');
  assert.deepEqual(libraryOrder(['@hackbuild/viewer'], reads), ['three', '@hackbuild/viewer'], 'only what the entry reaches');
  assert.deepEqual(libraryOrder(['pinia'], reads), ['vue', 'pinia']);
  assert.throws(() => libraryOrder(['vue'], (lib) => (lib === 'vue' ? ['pinia'] : ['vue'])), /read each other in a cycle: vue, pinia/);
  assert.throws(() => libraryOrder(['lodash'], reads), /the entry reads lodash, which no peer or published package provides/);
  assert.throws(() => libraryOrder(['vue'], () => ['three/addons/x']), /vue reads three\/addons\/x, which no peer or published package provides/);
});

const SPEC_SRC = (value) => `export const defineChase = (): string => ${JSON.stringify(value)};\n`;

/** Builds the fixture spec library from spec/src.ts with the real sidecar plugin, as build:lib does. */
async function buildSpec(dir) {
  process.env.NODE_ENV = 'production';
  const { build } = await import('vite');
  await build({
    root: dir,
    configFile: false,
    logLevel: 'silent',
    plugins: [sourcesPlugin('spec.js', dir)],
    build: {
      outDir: join(dir, 'spec', 'dist', 'iife'),
      emptyOutDir: true,
      minify: false,
      copyPublicDir: false,
      reportCompressedSize: false,
      lib: { entry: join(dir, 'spec', 'src.ts'), formats: ['iife'], name: 'HackbuildSpec', fileName: () => 'spec.js' },
      rollupOptions: { external: ['vue'], output: { exports: 'named', globals: { vue: 'Vue' } } },
    },
  });
}

/** A root with a built spec library and a ui manifest whose entry reads it; the library path is <root>/spec/dist/iife. */
async function iifeFixture(source = SPEC_SRC('a')) {
  mkdirSync(join(REPO, 'out'), { recursive: true });
  const dir = mkdtempSync(join(REPO, 'out', 'bake-iife-'));
  mkdirSync(join(dir, 'spec'), { recursive: true });
  writeFileSync(join(dir, 'spec', 'package.json'), '{"name":"@hackbuild/spec","version":"9.9.9"}');
  writeFileSync(join(dir, 'spec', 'src.ts'), source);
  writeFileSync(join(dir, 'entry.ts'), 'import { defineChase } from "@hackbuild/spec";\ndefineChase();\n');
  writeFileSync(join(dir, 'bake.json'), JSON.stringify({ id: 'fx', shell: 'ui', entry: './entry.ts', libraries: 'iife' }));
  await buildSpec(dir);
  return dir;
}

const failsOneLine = (promise, pattern) =>
  assert.rejects(promise, (e) => {
    assert.ok(e instanceof BakeError, `expected BakeError, got ${e}`);
    assert.match(e.message, pattern);
    assert.ok(!e.message.includes('\n'), 'one line');
    return true;
  });

test('the sidecar a library build writes is read back: scripts in order, own files, packages', async () => {
  const dir = await iifeFixture();
  try {
    const side = JSON.parse(readFileSync(join(dir, 'spec', 'dist', 'iife', 'spec.sources.json'), 'utf8'));
    const js = readFileSync(join(dir, 'spec', 'dist', 'iife', 'spec.js'));
    assert.equal(side.iife, 'spec.js');
    assert.equal(side.sha256, sha256(js), 'the sidecar hashes the file beside it');
    assert.deepEqual(Object.keys(side.own), ['spec/src.ts']);
    assert.equal(side.own['spec/src.ts'], sha256(readFileSync(join(dir, 'spec', 'src.ts'))));
    assert.deepEqual(side.reads, []);
    assert.deepEqual(side.packages, []);
    const r = await iifeBlocks(join(dir, 'entry.ts'), { root: dir });
    assert.deepEqual(r.blocks.map((b) => b.label), ['@hackbuild/spec 9.9.9, iife build, global HackbuildSpec', 'entry entry.ts']);
    assert.equal(r.blocks[0].code, js.toString('utf8').replace(/\s+$/, ''));
    assert.match(r.blocks[1].code, /HackbuildSpec/, 'the entry reads the library from its global');
    assert.ok(r.own.includes(join(dir, 'spec', 'src.ts')) && r.own.includes(join(dir, 'entry.ts')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the sidecar records the installed packages a library inlines and the imports it leaves to globals', async () => {
  const dir = await iifeFixture();
  try {
    writeFileSync(join(dir, 'spec', 'src.ts'), 'import { ref } from "vue";\nimport { z } from "zod";\nexport const defineChase = () => [ref, z];\n');
    await buildSpec(dir);
    const side = JSON.parse(readFileSync(join(dir, 'spec', 'dist', 'iife', 'spec.sources.json'), 'utf8'));
    assert.deepEqual(side.reads, ['vue'], 'vue stays an import; zod is bundled');
    assert.deepEqual(side.packages.map((p) => `${p.name}@${p.version}`), [`zod@${JSON.parse(readFileSync(join(REPO, 'node_modules', 'zod', 'package.json'), 'utf8')).version}`]);
    assert.equal(join(dir, side.packages[0].root), join(REPO, 'node_modules', 'zod'), 'the root is relative to the build root');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a missing dist/iife file or sidecar fails in one line naming the file and npm run build:lib', async () => {
  const dir = await iifeFixture();
  try {
    const entry = join(dir, 'entry.ts');
    const side = join(dir, 'spec', 'dist', 'iife', 'spec.sources.json');
    const sideText = readFileSync(side);
    rmSync(side);
    await failsOneLine(iifeBlocks(entry, { root: dir }), /^spec\/dist\/iife\/spec\.sources\.json is missing\. run npm run build:lib\.$/);
    writeFileSync(side, sideText);
    rmSync(join(dir, 'spec', 'dist', 'iife', 'spec.js'));
    await failsOneLine(iifeBlocks(entry, { root: dir }), /^spec\/dist\/iife\/spec\.js is missing\. run npm run build:lib\.$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a library older than its sources, or not matching its sidecar, fails', async () => {
  const dir = await iifeFixture();
  try {
    const entry = join(dir, 'entry.ts');
    const src = join(dir, 'spec', 'src.ts');
    writeFileSync(src, SPEC_SRC('b'));
    await failsOneLine(iifeBlocks(entry, { root: dir }), /^spec\/dist\/iife\/spec\.js is older than spec\/src\.ts\. run npm run build:lib\.$/);
    writeFileSync(src, SPEC_SRC('a'));
    await iifeBlocks(entry, { root: dir });
    writeFileSync(join(dir, 'spec', 'dist', 'iife', 'spec.js'), 'var HackbuildSpec={defineChase(){}};\n');
    await failsOneLine(iifeBlocks(entry, { root: dir }), /^spec\/dist\/iife\/spec\.js does not match spec\/dist\/iife\/spec\.sources\.json\. run npm run build:lib\.$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the dash, script-close and licence gates hold on the libraries route', async () => {
  const dir = await iifeFixture();
  try {
    const run = () => bake(join(dir, 'bake.json'), { outRoot: join(dir, 'dist'), libRoot: dir });
    const baked = await run();
    const text = readFileSync(baked.out, 'utf8');
    assert.ok(text.indexOf('/* @hackbuild/spec 9.9.9') < text.indexOf('/* entry entry.ts */'), 'the library precedes the entry');
    assert.ok(!text.includes('type="module"'), 'every script is classic');
    assert.deepEqual(baked.licences, [], 'a library that inlines no installed package adds no row');
    writeFileSync(join(dir, 'spec', 'src.ts'), SPEC_SRC(`a ${String.fromCodePoint(0x2014)} b`));
    await buildSpec(dir);
    await assert.rejects(run(), (e) => e instanceof BakeError && /dash U\+2014 in .*spec\/src\.ts line 1/.test(e.message));
    // The bundler escapes a closing tag it finds in source, so the script text is written over the built one.
    writeFileSync(join(dir, 'spec', 'src.ts'), SPEC_SRC('a'));
    await buildSpec(dir);
    const js = join(dir, 'spec', 'dist', 'iife', 'spec.js');
    const side = join(dir, 'spec', 'dist', 'iife', 'spec.sources.json');
    const closing = 'var HackbuildSpec={defineChase(){return "</script>"}};\n';
    writeFileSync(js, closing);
    writeFileSync(side, JSON.stringify({ ...JSON.parse(readFileSync(side, 'utf8')), sha256: sha256(closing) }));
    await assert.rejects(run(), (e) => e instanceof BakeError && /@hackbuild\/spec 9\.9\.9.* holds a closing script tag/.test(e.message));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('libraries is legal as "iife" on a ui shell only; an entry cannot import a peer subpath', async () => {
  const dir = fixture({ 'shell.html': SHELL, 'bake.json': { id: 'fx', shell: 'shell.html', libraries: 'iife' } });
  try {
    await rejects(dir, /libraries is legal as "iife" on a ui shell only/);
    writeFileSync(join(dir, 'bake.json'), JSON.stringify({ id: 'fx', shell: 'ui', entry: './e.ts', libraries: 'esm' }));
    await rejects(dir, /libraries is legal as "iife" on a ui shell only/);
    writeFileSync(join(dir, 'e.ts'), 'import "three/examples/jsm/controls/OrbitControls.js";\n');
    await assert.rejects(bundleIifeEntry(join(dir, 'e.ts')), (e) => e instanceof BakeError && /imports three\/examples\/jsm\/controls\/OrbitControls\.js; the three global holds the bare module only/.test(e.message));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('peer vendor scripts: licence rows for vue with the packages its global build holds, and for pinia', async () => {
  const table = readTable(REPO);
  const expected = {
    vue: ['@vue/reactivity', '@vue/runtime-core', '@vue/runtime-dom', '@vue/shared', 'vue'],
    pinia: ['pinia'],
  };
  for (const [peer, names] of Object.entries(expected)) {
    const file = resolveFrom(REPO, PEER_FILES[peer]);
    const found = await vendorPackages(peer, file);
    const { rows, problems } = licenceManifest(found, table);
    assert.deepEqual(problems, [], `${peer}: every inlined package has a licence row`);
    assert.deepEqual(rows.map((r) => r.name).sort(), names);
    assert.ok(rows.every((r) => r.audited === 'MIT'));
  }
});

// The real libraries and sidecars of npm run build:lib; CI runs this file before bake:all, where this test reports not run.
test('every ui manifest on the libraries route loads peers, packages and its entry in derived order', async (t) => {
  const missing = ['spec/dist/iife/spec.sources.json', 'tools/vendor/three/dist/three.sources.json'].filter((f) => !existsSync(join(REPO, f)));
  if (missing.length > 0) {
    t.skip(`not run: ${missing[0]} is missing; run npm run build:lib`);
    return;
  }
  const table = readTable(REPO);
  const manifests = findManifests().filter((p) => JSON.parse(readFileSync(p, 'utf8')).libraries === 'iife');
  assert.ok(manifests.length > 0, 'at least one manifest bakes on the libraries route');
  for (const path of manifests) {
    const m = JSON.parse(readFileSync(path, 'utf8'));
    const r = await iifeBlocks(join(path, '..', m.entry));
    const names = r.blocks.map((b) => b.label.split(' ')[0]);
    assert.equal(names.at(-1), 'entry');
    const libs = names.slice(0, -1);
    assert.deepEqual(libs, NAMES.filter((n) => libs.includes(n)), `${m.id}: libraries follow the derived order`);
    if (libs.includes('@hackbuild/bench')) assert.deepEqual(libs, NAMES, `${m.id}: the bench shell pulls in every peer and package`);
    const rows = licenceManifest(r.inlined, table);
    assert.deepEqual(rows.problems, []);
    const have = rows.rows.map((x) => x.name);
    for (const name of ['vue', 'pinia', 'three', 'zod', '@virgilvox/hackbuild-ui', '@vue/runtime-core']) assert.ok(have.includes(name), `${m.id}: licence row for ${name}`);
  }
});
