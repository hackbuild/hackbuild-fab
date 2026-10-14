// M03-T11 harness helpers, checked against sources independent of them:
// the corpus SHA256SUMS, the fill colours the legacy benches paint, the ink
// counts tools/py/render_sprue_motifs.py printed when it wrote the motifs,
// and vtracer's own PNG decoder (Rust image crate) for the filtered PNGs.
// The vtracer cases need tools/eval/vtracer installed (npm install there);
// without it they are skipped and say so.

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, readCorpus, svgPaths, toGrid, vtracerOptions } from '../eval/vtracer/run.mjs';


// every temp folder this file makes is removed when the file's tests end
const TEMPS = [];
const keep = (d) => {
  TEMPS.push(d);
  return d;
};
after(() => {
  for (const d of TEMPS) rmSync(d, { recursive: true, force: true });
});
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CORPUS = join(REPO, 'tools/corpus/inlay/vtracer');
const EVAL = join(REPO, 'tools/eval/vtracer');
const hasVtracer = existsSync(join(EVAL, 'node_modules/@visioncortex/vtracer/package.json'));
const vtracer = hasVtracer ? createRequire(join(EVAL, 'run.mjs'))('@visioncortex/vtracer') : null;
const png = (n) => decodePng(readFileSync(join(CORPUS, n)));
const px = (im, x, y) => Array.from(im.data.subarray((y * im.width + x) * 4, (y * im.width + x) * 4 + 4));

test('the corpus holds nine inputs, each matching SHA256SUMS and named in inputs.json', () => {
  const rows = readCorpus(CORPUS);
  assert.equal(rows.length, 9);
});

test('a changed corpus byte is refused', () => {
  const dir = keep(mkdtempSync(join(tmpdir(), 'hbf-vtracer-')));
  cpSync(CORPUS, dir, { recursive: true });
  const f = join(dir, '09-sprue-bolt.png');
  const b = readFileSync(f);
  b[b.length - 20] ^= 1;
  writeFileSync(f, b);
  assert.throws(() => readCorpus(dir), /09-sprue-bolt\.png: sha256/);
});

test('decoded motif ink equals the count the python renderer reported', () => {
  // render_sprue_motifs.py printed 126857 and 52962 ink px (computed) when it wrote them.
  for (const [n, w, h, ink] of [['08-sprue-snare.png', 640, 586, 126857], ['09-sprue-bolt.png', 347, 640, 52962]]) {
    const im = png(n);
    assert.deepEqual([im.width, im.height], [w, h]);
    let k = 0;
    for (let i = 0; i < w * h; i++) if (im.data[i * 4] === 0 && im.data[i * 4 + 3] === 255) k++;
    assert.equal(k, ink, n);
  }
});

test('decoded COLLAR and SPRUE exports carry the colours the benches paint', () => {
  const c = png('02-collar-hackbuild.png');
  // collar.html btnPng fills #f5f0e6; the hack.build preset body slot is #1A1A1A.
  assert.deepEqual(px(c, 5, 5), [0xf5, 0xf0, 0xe6, 255]);
  assert.deepEqual(px(c, 1195, 615), [0xf5, 0xf0, 0xe6, 255]);
  assert.deepEqual(px(c, 300, 300), [0x1a, 0x1a, 0x1a, 255]);
  // sprue.html facesPng fills #8a8a8a behind both faces.
  assert.deepEqual(px(png('10-sprue-phx-faces.png'), 0, 0), [0x8a, 0x8a, 0x8a, 255]);
});

test('toGrid fits the long side to 320 cells at 8 px/mm over 40 mm', () => {
  const im = png('09-sprue-bolt.png');
  const g = toGrid(im, { x: 0, y: 0, w: im.width, h: im.height });
  assert.deepEqual([g.width, g.height], [174, 320]);
});

test('svgPaths reads fill, d and a translate', () => {
  const p = svgPaths('<svg><path d="M0,0L2,0Z" fill="#fe0386" transform="translate(3,4)"/><path d="M1,1Z" fill="#000000"/></svg>');
  assert.deepEqual(p, [{ d: 'M0,0L2,0Z', fill: '#FE0386', tx: 3, ty: 4 }, { d: 'M1,1Z', fill: '#000000', tx: 0, ty: 0 }]);
});

test('filterSpeckle is the largest side whose square is under the despeckle cell count', () => {
  // INLAY default: round(0.35 x pi x 2.4^2) = 6 cells (computed, M03-T05 table).
  assert.equal(vtracerOptions(['#000000'], 6).filterSpeckle, 2);
  assert.equal(vtracerOptions(['#000000'], 10).filterSpeckle, 3);
  assert.equal(vtracerOptions(['#000000'], 30).filterSpeckle, 5);
  // A patch of exactly the count survives route A (it drops islands under the count), so a
  // square count must map one side lower: 9 cells keeps a 3 x 3 patch only at side 2.
  assert.equal(vtracerOptions(['#000000'], 9).filterSpeckle, 2);
  assert.equal(vtracerOptions(['#000000'], 4).filterSpeckle, 1);
});

test('vtracer drops a square patch of side s when filterSpeckle >= s', { skip: hasVtracer ? false : 'not run: tools/eval/vtracer has no node_modules' }, () => {
  const kept = (side, fs) => {
    const w = 40, a = new Uint8Array(w * w * 4).fill(255);
    for (let y = 10; y < 10 + side; y++) for (let x = 10; x < 10 + side; x++) a.fill(0, (y * w + x) * 4, (y * w + x) * 4 + 3);
    const svg = vtracer.convertPixels(a, w, w, { clustering: 'color-cluster', hierarchical: 'cutout', mode: 'polygon', palette: ['#000000', '#ffffff'], filterSpeckle: fs });
    return /fill="#000000"/.test(svg);
  };
  for (const side of [3, 4, 5]) for (const fs of [1, 2, 3, 4, 5, 6]) assert.equal(kept(side, fs), fs < side, `side ${side}, filterSpeckle ${fs}`);
});

test('decodePng equals vtracer\'s own decoder on Sub, Up and Paeth filtered PNGs', { skip: hasVtracer ? false : 'not run: tools/eval/vtracer has no node_modules' }, () => {
  const opts = { clustering: 'color-cluster', hierarchical: 'cutout', mode: 'polygon', palette: ['#1A1A1A', '#F5F0E6', '#FE0386', '#8A8A8A'], filterSpeckle: 2 };
  for (const n of ['05-python-coin-preview.png', '06-sprue-face-previews.png']) {
    const bytes = readFileSync(join(CORPUS, n));
    const im = decodePng(bytes);
    const mine = vtracer.convertPixels(new Uint8Array(im.data.buffer), im.width, im.height, opts);
    assert.equal(mine, vtracer.convertBuffer(bytes, opts), n);
  }
});

test('route B fills vtracer paths back onto the source cells, one path per cell', { skip: hasVtracer ? false : 'not run: tools/eval/vtracer has no node_modules' }, async () => {
  const { register } = await import('node:module');
  const { pathToFileURL } = await import('node:url');
  register(pathToFileURL(join(REPO, 'core/dist/resolve-hook.js')).href, import.meta.url);
  const geom = await import('@hackbuild/geom');
  const { routeB } = await import('../eval/vtracer/run.mjs');
  // A rectangle of slot 1 in the top left of a 24 x 18 body of slot 0, so a flip in x or y
  // or a half-cell shift moves it; the truth is the image itself. A rectangle keeps its
  // corners in polygon mode (measured); an L loses one convex corner cell to simplification.
  const w = 24, h = 18, data = new Uint8ClampedArray(w * h * 4), truth = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ink = x >= 3 && x < 9 && y >= 2 && y < 7;
    truth[y * w + x] = ink ? 1 : 0;
    data.set(ink ? [0xfe, 0x03, 0x86, 255] : [0x1a, 0x1a, 0x1a, 255], (y * w + x) * 4);
  }
  const r = routeB({ width: w, height: h, data }, ['#1A1A1A', '#FE0386'], 6, geom);
  assert.equal(r.seamCells, 0);
  assert.deepEqual(Array.from(r.labels), Array.from(truth));
});

test('route B labels match quantize palette labels on flat slot colours', { skip: hasVtracer ? false : 'not run: tools/eval/vtracer has no node_modules' }, async () => {
  const { register } = await import('node:module');
  const { pathToFileURL } = await import('node:url');
  register(pathToFileURL(join(REPO, 'core/dist/resolve-hook.js')).href, import.meta.url);
  const geom = await import('@hackbuild/geom');
  const inlay = await import('@hackbuild/inlay');
  const { routeB, labelMap } = await import('../eval/vtracer/run.mjs');
  // Two rectangles of slots 2 and 3 on a body of slot 1, COLLAR hack.build slot colours.
  const slots = ['#1A1A1A', '#F5F0E6', '#FE0386'];
  const w = 30, h = 20, data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const q = x >= 2 && x < 10 && y >= 3 && y < 15 ? 1 : x >= 14 && x < 27 && y >= 5 && y < 11 ? 2 : 0;
    const [r, g, b] = inlay.hexToRgb(slots[q]);
    data.set([r, g, b, 255], (y * w + x) * 4);
  }
  const img = { width: w, height: h, data };
  const a = inlay.quantize(img, 'palette', { res: 8, slots, body: 1 });
  const r = routeB(img, slots, 6, geom, labelMap(false));
  assert.equal(r.seamCells, 0);
  assert.deepEqual(Array.from(r.labels), Array.from(a.labels));
  assert.equal(new Set(a.labels).size, 3);
});

test('route A hygiene runs print-forge over every art slot with the body as host', async () => {
  const { register } = await import('node:module');
  const { pathToFileURL } = await import('node:url');
  register(pathToFileURL(join(REPO, 'core/dist/resolve-hook.js')).href, import.meta.url);
  const inlay = await import('@hackbuild/inlay');
  const { hygieneCtx } = await import('../eval/vtracer/run.mjs');
  // Three palette entries: body label 0, art slots 2 and 3 (labelMap). One lone cell of slot 3 and a
  // 2 x 2 patch of slot 2 at 8 cells per mm sit under the 6-cell despeckle floor and the 2-cell open
  // radius, so both go to the body; a 20 x 20 square of slot 2 keeps its core (computed).
  const w = 40, labels = new Uint8Array(w * w);
  for (let y = 5; y < 25; y++) for (let x = 5; x < 25; x++) labels[y * w + x] = 2;
  labels[33 * w + 33] = 3;
  for (const [x, y] of [[30, 5], [31, 5], [30, 6], [31, 6]]) labels[y * w + x] = 2;
  const ctx = hygieneCtx(false, ['#1A1A1A', '#F5F0E6', '#FE0386'], 0.6, 0.35);
  assert.equal(ctx.host, 0);
  assert.equal(ctx.slots, 3);
  assert.equal(hygieneCtx(true, ['#FFFFFF', '#000000'], 0.6, 0.35).slots, 1);
  const out = inlay.hygiene({ w, h: w, res: 8, labels }, 'print-forge', ctx).labels;
  assert.equal(out[33 * w + 33], 0);
  assert.equal(out[5 * w + 30], 0);
  assert.equal(out[15 * w + 15], 2);
});

test('run.mjs binds every route A export and exits 0 with nine measured rows', { skip: hasVtracer ? false : 'not run: tools/eval/vtracer has no node_modules' }, async () => {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [join(EVAL, 'run.mjs'), CORPUS], { encoding: 'utf8', cwd: REPO });
  assert.equal(r.status, 0, r.stderr);
  const rows = r.stdout.split('\n').filter((l) => /^\d\d-.*\.png \|/.test(l));
  assert.equal(rows.length, 9);
  for (const l of rows) assert.doesNotMatch(l, /not run/, l);
});
