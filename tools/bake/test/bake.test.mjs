// node --test tools/bake/test/bake.test.mjs
// Fixtures are written to a temp folder per test; the PIP parity case reads the
// committed pip.html hash from lineage.json (row pip.baked), an independent record.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO, bake, BakeError, sha256, styleTag } from '../bake.mjs';
import { checkBaked, checkInstalled } from '../check-ui-css.mjs';
import { licenceManifest } from '../licence-manifest.mjs';

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
