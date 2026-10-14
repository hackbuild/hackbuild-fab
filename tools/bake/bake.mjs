#!/usr/bin/env node
// tools/bake/bake.mjs: one per-design manifest in, one offline HTML file out (D-129).
//
//   node tools/bake/bake.mjs <bake.json> [--out-root <dir>]
//   node tools/bake/bake.mjs --all     every bake.json under designs, reference and packages
//
// Seeds: pip-controller tools/build_bench.py (block format, vendor swap, @font-face
// rule text, assembly order) and the COTTER baker tools/build.py (ESM manifold to a
// classic script, base64 wasm, exactly-one-match asserts, dash assert).
// The output carries no timestamp and no absolute path, uses LF line endings, and is
// written in manifest order, so two runs on the same inputs give the same sha256.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintText } from '../../packages/checks/voice/rules.mjs';
import { licenceManifest, npmSources, readTable } from './licence-manifest.mjs';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_BUDGET = 16777216;


export class BakeError extends Error {}

function fail(msg) {
  throw new BakeError(msg);
}

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** Resolve `from` against the manifest folder; `npm:<pkg>/<path>` walks up to node_modules. */
export function resolveFrom(base, from) {
  if (!from.startsWith('npm:')) return resolve(base, from);
  const spec = from.slice(4);
  const parts = spec.split('/');
  const pkgLen = spec.startsWith('@') ? 2 : 1;
  const pkg = parts.slice(0, pkgLen).join('/');
  const rest = parts.slice(pkgLen).join('/');
  for (let dir = base; ; dir = dirname(dir)) {
    const root = join(dir, 'node_modules', pkg);
    if (existsSync(join(root, 'package.json'))) return join(root, rest);
    if (dirname(dir) === dir) fail(`package ${pkg} not installed above ${rel(base)}. run npm ci first.`);
  }
}

/** Version and name of the installed package that holds a resolved file, if any. */
export function packageOf(file) {
  for (let dir = dirname(file); dirname(dir) !== dir; dir = dirname(dir)) {
    const meta = join(dir, 'package.json');
    if (existsSync(meta) && dir.split(sep).includes('node_modules')) {
      const { name, version } = JSON.parse(readFileSync(meta, 'utf8'));
      if (name) return { name, version, root: dir };
    }
  }
  return null;
}

function rel(p) {
  const r = relative(REPO, p);
  return r.startsWith('..') ? p : r.split(sep).join('/');
}

function readText(path) {
  if (!existsSync(path)) fail(`missing ${rel(path)}. run npm ci first.`);
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
}

function countOf(hay, needle) {
  let n = 0;
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + needle.length)) n += 1;
  return n;
}

function replaceOnce(hay, needle, value, what) {
  const n = countOf(hay, needle);
  if (n !== 1) fail(`${what}: match ${JSON.stringify(needle.slice(0, 80))} hit ${n} times, legal 1`);
  const i = hay.indexOf(needle);
  return hay.slice(0, i) + value + hay.slice(i + needle.length);
}

// The dash set of RULES.md Language, from the one copy of the voice rules (D-004).
function noDash(text, what) {
  const hit = lintText(what, text).find((f) => f.rule === 'dash');
  if (hit) {
    const cps = [...hit.text].map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase()}`);
    const shown = [...hit.text].length === 1 ? cps[0] : hit.text;
    fail(`dash ${shown} in ${what} line ${hit.line}. use a comma, a period or "to".`);
  }
}

function noScriptClose(text, what) {
  if (/<\/script/i.test(text)) fail(`${what} holds a closing script tag and cannot be inlined`);
}

// build_bench.py block(): the trailing newline separates this block from the next.
export const block = (label, source, type = '') =>
  `<script${type ? ` type="${type}"` : ''}>/* ${label} */\n${source}\n</script>\n`;

// build_bench.py font_face(), with the style taken from the manifest.
export function fontFace(font, bytes) {
  return (
    `@font-face{font-family:'${font.family}';font-style:${font.style};font-weight:${font.weight};` +
    `font-display:block;src:url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2')}`
  );
}

const IMPORT = /@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?\s*\)?\s*[^;]*;/g;

/** Inline relative `@import` statements; a network `@import` fails. */
export function resolveCss(path, seen = new Set()) {
  if (seen.has(path)) fail(`css import cycle at ${rel(path)}`);
  seen.add(path);
  const text = readText(path);
  return text.replace(IMPORT, (_all, target) => {
    if (/^(?:[a-z]+:)?\/\//i.test(target) || /^(?:https?|data):/i.test(target)) {
      fail(`network @import ${target} in ${rel(path)}. inline the file or drop the import.`);
    }
    return resolveCss(resolve(dirname(path), target), seen);
  });
}

/** One `<style>` element; hackbuild-ui sheets carry the version and the sha256 of the inlined text. */
export function styleTag(path) {
  const css = resolveCss(path);
  if (/<\/style/i.test(css)) fail(`${rel(path)} holds a closing style tag`);
  const pkg = packageOf(path);
  const attrs =
    pkg && pkg.name === '@virgilvox/hackbuild-ui'
      ? ` data-hb-ui="${pkg.version}" data-sha256="${sha256(css)}"`
      : '';
  return `<style${attrs}>\n${css}\n</style>`;
}

/** COTTER baker: ESM to a classic script, every replacement asserted once. */
export function classicScript(spec, base) {
  let src = readText(resolveFrom(base, spec.from));
  for (const r of spec.replace) src = replaceOnce(src, r.match, r.with, `classic ${spec.label}`);
  src = src.replace(/\s+$/, '');
  const tail = `export default ${spec.exportDefault};`;
  if (countOf(src, tail) !== 1 || !src.endsWith(tail)) {
    fail(`classic ${spec.label}: expected one trailing "${tail}"`);
  }
  src = src.slice(0, -tail.length);
  if (src.includes('import.meta')) fail(`classic ${spec.label}: import.meta left after replacements`);
  return `(function(){\n${src}\nglobalThis.${spec.global}=${spec.exportDefault};\n})();`;
}

/** Bundle a ui entry with vite into one ES module, no code splitting. */
export async function bundleEntry(entry) {
  const { build } = await import('vite');
  // Single-file components of packages/ui compile here; they carry no <style>,
  // so the bundle stays one chunk with no CSS asset.
  const { default: vue } = await import('@vitejs/plugin-vue');
  const out = await build({
    configFile: false,
    plugins: [vue()],
    logLevel: 'silent',
    root: REPO,
    mode: 'production',
    define: {
      'process.env.NODE_ENV': '"production"',
      __VUE_OPTIONS_API__: 'false',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
    build: {
      write: false,
      target: 'es2022',
      minify: true,
      sourcemap: false,
      modulePreload: false,
      copyPublicDir: false,
      reportCompressedSize: false,
      lib: { entry, formats: ['es'], fileName: 'entry' },
      rollupOptions: { output: { codeSplitting: false } },
    },
  });
  const outputs = (Array.isArray(out) ? out : [out]).flatMap((o) => o.output);
  const chunks = outputs.filter((o) => o.type === 'chunk');
  const assets = outputs.filter((o) => o.type === 'asset');
  if (chunks.length !== 1) fail(`entry ${rel(entry)} bundled to ${chunks.length} chunks, legal 1`);
  if (assets.length !== 0) {
    fail(`entry ${rel(entry)} emitted assets ${assets.map((a) => a.fileName).join(', ')}; list stylesheets under css`);
  }
  const own = chunks[0].moduleIds.filter((id) => !id.includes(`${sep}node_modules${sep}`) && existsSync(id));
  // The installed packages the bundle inlines, for the licence manifest (LICENSING.md 3).
  const inlined = chunks[0].moduleIds.filter((id) => id.includes(`${sep}node_modules${sep}`)).map((id) => packageOf(id.replace(/\?.*$/, '').replace(/^\0/, ''))).filter((p) => p !== null);
  return { code: chunks[0].code.replace(/\s+$/, ''), own, inlined };
}

const UI_SHELL = (title) =>
  '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  `<title>${title}</title>\n<style>\n</style>\n</head>\n<body class="hb">\n<div id="app"></div>\n`;

/** Run one manifest. Returns { out, bytes, blocks, sha256 } and writes the file and SHA256SUMS. */
export async function bake(manifestPath, opts = {}) {
  const mpath = resolve(manifestPath);
  const base = dirname(mpath);
  const m = JSON.parse(readText(mpath));
  for (const k of ['id', 'shell']) if (typeof m[k] !== 'string' || !m[k]) fail(`${rel(mpath)}: ${k} missing`);
  const ui = m.shell === 'ui';
  if (ui && !m.entry) fail(`${rel(mpath)}: a ui shell needs entry`);
  const budget = m.budget ?? DEFAULT_BUDGET;

  let html;
  if (ui) {
    html = UI_SHELL(m.title ?? m.id);
  } else {
    const shellPath = resolve(base, m.shell);
    html = readText(shellPath);
    noDash(html, rel(shellPath));
  }

  for (const d of m.drop ?? []) html = replaceOnce(html, d, '', 'drop');

  for (const v of m.vendor ?? []) {
    const src = readText(resolveFrom(base, v.from));
    noScriptClose(src, v.label);
    html = replaceOnce(html, v.match, block(v.label, src).replace(/\n$/, ''), `vendor ${v.label}`);
  }

  if (m.fonts?.length) {
    const rules = m.fonts.map((f) => {
      const p = resolveFrom(base, f.from);
      if (!existsSync(p)) fail(`missing font ${rel(p)}. run npm ci first.`);
      return fontFace(f, readFileSync(p)) + '\n';
    });
    html = replaceOnce(html, '<style>\n', `<style>\n${rules.join('')}\n`, 'fonts');
  }

  if (m.css?.length) {
    const tags = m.css.map((c) => styleTag(resolveFrom(base, c.from))).join('\n');
    html = replaceOnce(html, '</head>', `${tags}\n</head>`, 'css');
  }

  const inlined = npmSources(m).map((f) => packageOf(resolveFrom(base, f))).filter((p) => p !== null);
  const blocks = [];
  for (const key of Object.keys(m)) {
    if (key === 'wasm') {
      const w = m.wasm;
      const p = resolveFrom(base, w.from);
      if (!existsSync(p)) fail(`missing wasm ${rel(p)}. run npm ci first.`);
      blocks.push(block(w.label, `globalThis.${w.global}="${readFileSync(p).toString('base64')}";`));
    } else if (key === 'classic') {
      for (const c of m.classic) blocks.push(block(c.label, classicScript(c, base)));
    } else if (key === 'blocks') {
      for (const b of m.blocks) {
        const src = readText(resolveFrom(base, b.from));
        if (!b.vendored) noDash(src, rel(resolveFrom(base, b.from)));
        noScriptClose(src, b.label);
        blocks.push(block(b.label, src));
      }
    } else if (key === 'entry') {
      const entry = resolve(base, m.entry);
      const { code, own, inlined: bundled } = await bundleEntry(entry);
      inlined.push(...bundled);
      for (const id of own) noDash(readText(id), rel(id));
      noScriptClose(code, `entry ${rel(entry)}`);
      blocks.push(block(`entry ${basename(entry)}`, code, 'module'));
    }
  }

  const text = `${html}\n${blocks.join('')}</body>\n</html>\n`;

  if (/<script\b[^>]*\ssrc\s*=/i.test(text)) fail('output holds <script src=>; every script must be inline');
  const link = /<link\b[^>]*\shref\s*=\s*["']?([^"'\s>]+)/gi;
  for (let x = link.exec(text); x; x = link.exec(text)) {
    if (/^(?:[a-z]+:)?\/\//i.test(x[1]) && !x[1].startsWith('data:')) fail(`output links off the file: ${x[1]}`);
  }
  if (text.includes(REPO)) fail('output holds an absolute repo path');

  const licences = licenceManifest(inlined, opts.licences ?? readTable(REPO));
  if (licences.problems.length > 0) fail(`licence manifest: ${licences.problems.join('; ')}`);

  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > budget) fail(`output ${bytes} bytes, legal at most ${budget}, set by budget in ${rel(mpath)}`);

  const outRoot = resolve(opts.outRoot ?? join(REPO, 'dist'));
  const dir = join(outRoot, m.out ?? (ui ? 'bench' : 'legacy'));
  const file = join(dir, `${m.id}.html`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, text);
  writeFileSync(join(dir, `${m.id}.licences.json`), `${JSON.stringify({ bake: `${m.id}.html`, inlined: licences.rows }, null, 1)}\n`);
  const hash = sha256(text);

  const sums = join(dir, 'SHA256SUMS');
  const name = `${m.id}.html`;
  const kept = existsSync(sums)
    ? readFileSync(sums, 'utf8').split('\n').filter((l) => l && !l.endsWith(`  ${name}`))
    : [];
  kept.push(`${hash}  ${name}`);
  kept.sort((a, b) => (a.slice(66) < b.slice(66) ? -1 : 1));
  writeFileSync(sums, kept.join('\n') + '\n');

  return { out: file, bytes, blocks: blocks.length, sha256: hash, licences: licences.rows };
}

const SKIP = new Set(['node_modules', 'dist', 'out', '.git']);

/** Every bake.json under designs, reference and packages, sorted, so no list is typed by hand. */
export function findManifests(root = REPO) {
  const found = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory() && !SKIP.has(e.name)) walk(join(dir, e.name));
      else if (e.isFile() && e.name === 'bake.json') found.push(join(dir, e.name));
    }
  };
  for (const top of ['designs', 'reference', 'packages']) if (existsSync(join(root, top))) walk(join(root, top));
  return found.sort();
}

async function main(argv) {
  const args = argv.slice(2);
  const oi = args.indexOf('--out-root');
  const outRoot = oi >= 0 ? args.splice(oi, 2)[1] : undefined;
  const all = args[0] === '--all' && args.length === 1;
  if (!all && args.length !== 1) {
    console.error('usage: node tools/bake/bake.mjs <bake.json> [--out-root <dir>] | --all');
    return 2;
  }
  try {
    const list = all ? findManifests() : args;
    if (list.length === 0) fail('no bake.json found');
    for (const m of list) {
      const r = await bake(m, { outRoot });
      console.log(`bake: ${rel(r.out)} ${r.bytes} bytes, ${r.blocks} script blocks, sha256 ${r.sha256}`);
    }
    return 0;
  } catch (e) {
    if (e instanceof BakeError) {
      console.error(`bake: ${e.message}`);
      return 1;
    }
    throw e;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv);
}
