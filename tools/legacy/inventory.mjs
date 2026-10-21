// The machine list of every tracked file under the four legacy globs (PLAN.md
// 5, move legacy, keep sha256 and records public): sha256, bytes, class, the
// originals path of a byte copy, and the files outside legacy folders that
// read each folder. Classes, in the order they apply:
//   lineage   README.md, SHA256SUMS, sha256.txt
//   original  HBF_ORIGINALS holds a file with the same sha256
//   unmatched everything else
// Fab's own harness (record and extraction scripts, captured fixtures)
// lives under designs/<id>/extract/ and reference/fit/<id>/extract/
// (R1-rails-public-07), outside the globs, so no row is harness. A file
// left under legacy/tools/ is a copy of an upstream tool and classes by
// the originals lookup like any other copy.
// A copy git no longer tracks that a SHA256SUMS under designs/<id>/legacy
// still lists is held in the owner's archive (D-286, R1-rails-public-11):
// its row says where: private and names its archive copy, the original
// when the originals hold its bytes, else the parking copy under
// fab-knowledge:originals/_legacy/<repo path>. The parking folder is not an
// original, so the lookup that classes a row skips it.
// Readers are found by text and are approximate: a dynamic path such as
// new URL(`legacy/${f}`, DESIGN) counts through the folder-name match, so a
// false reader is kept over a missed one.
//
//   node tools/legacy/inventory.mjs --write   write tools/legacy/inventory.json
//   node tools/legacy/inventory.mjs --check   recompute, exit 1 on any difference
//   --root=<dir>                              run against another checkout (tests use a temp repo)
// The originals lookup runs only with HBF_ORIGINALS set; --check without it
// keeps each row's recorded original or unmatched class.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { legacySums } from './held.mjs';

export const OUT = 'tools/legacy/inventory.json';
export const ORIGINALS_PREFIX = 'fab-knowledge:originals';
/** The archive folder for held copies the originals do not hold, mirrored by repo path. */
export const PARKED = '_legacy';
/** The four legacy globs as anchored patterns; group 1 is the folder. */
export const LEGACY_GLOBS = [
  ['designs/*/legacy', /^(designs\/[^/]+\/legacy)\//],
  ['reference/copper/*/legacy', /^(reference\/copper\/[^/]+\/legacy)\//],
  ['reference/fit/ogee16-r16p/legacy', /^(reference\/fit\/ogee16-r16p\/legacy)\//],
  ['tools/corpus/3mf/legacy', /^(tools\/corpus\/3mf\/legacy)\//],
];
const LINEAGE = new Set(['README.md', 'SHA256SUMS', 'sha256.txt']);
/** Record files that name legacy paths without reading them. */
const NOT_READERS = [/\.md$/, /^lineage\.json$/, /^lineage\//, /^tools\/legacy\/inventory\.(json|mjs)$/, /^tools\/test\/legacy-inventory\.test\.mjs$/];
const MAX_TEXT = 4 * 1024 * 1024;

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** The legacy folder a repo-relative path sits in, or null. */
export function legacyFolder(rel) {
  for (const [, re] of LEGACY_GLOBS) {
    const m = re.exec(rel);
    if (m) return m[1];
  }
  return null;
}

/** lineage, or null when the originals lookup decides. */
export function fixedClass(rel) {
  return LINEAGE.has(path.posix.basename(rel)) ? 'lineage' : null;
}

/** sha256 to the sorted relative paths and size of every file under dir, the parking folder left out. */
export function hashTree(dir) {
  const out = new Map();
  const walk = (rel) => {
    for (const e of readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const child = rel ? `${rel}/${e.name}` : e.name;
      if (!rel && e.name === PARKED) continue;
      if (e.isDirectory()) walk(child);
      else if (e.isFile()) {
        const buf = readFileSync(path.join(dir, child));
        const h = sha256(buf);
        const paths = [...(out.get(h) ?? []), child].sort();
        out.set(h, Object.assign(paths, { bytes: buf.length }));
      }
    }
  };
  walk('');
  return out;
}

/** The parked copy of a held file: its archive id and bytes, or null when absent or not those bytes. */
export function parked(dir, rel, want) {
  const file = path.join(dir, PARKED, rel);
  if (!existsSync(file)) return null;
  const buf = readFileSync(file);
  return sha256(buf) === want ? { originals: `${ORIGINALS_PREFIX}/${PARKED}/${rel}`, bytes: buf.length } : null;
}

/** Lines of a source file with whole-line comments removed, path joins collapsed to slashes. */
export function codeText(rel, text) {
  const hash = /\.(py|ya?ml|sh|toml|cfg|ini)$/.test(rel) || /(^|\/)(Makefile|\.gitignore|[^/.]+)$/.test(rel);
  const slash = /\.(m?[jt]sx?|c[jt]s|vue|css|html?|rs|go|c|h)$/.test(rel);
  const keep = text.split('\n').filter((line) => {
    const t = line.trim();
    if (hash && t.startsWith('#')) return false;
    if (slash && (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*'))) return false;
    return true;
  });
  // os.path.join(ROOT, "designs", "x", "legacy") and ROOT / "designs" / "x" read as designs/x/legacy.
  return keep.join('\n').replace(/(["'])\s*(?:,|\/)\s*\1/g, '/');
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LEGACY_TOKEN = /(^|["'`/])legacy(["'`/]|$)/m;

/** True when the code text of a file outside the folder reads it. */
export function readsFolder(readerRel, code, folder) {
  const parent = folder.slice(0, -'/legacy'.length);
  if (new RegExp(`${esc(folder)}(?![A-Za-z0-9_.-])`).test(code)) return true;
  if (readerRel.startsWith(`${parent}/`) && /(^|["'`/])\.\.?\/legacy(\/|["'`]|$)/m.test(code)) return true;
  return new RegExp(`${esc(parent)}(?=[/"'\`])`).test(code) && LEGACY_TOKEN.test(code);
}

/** Every tracked path, sorted. */
export function tracked(root) {
  return execFileSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0').filter(Boolean).sort();
}

/** Folder to sorted reader paths, for the given folders. */
export function findReaders(root, files, folders) {
  const out = new Map(folders.map((f) => [f, []]));
  for (const rel of files) {
    if (legacyFolder(rel) || NOT_READERS.some((re) => re.test(rel))) continue;
    let buf;
    try {
      const st = statSync(path.join(root, rel));
      if (!st.isFile() || st.size > MAX_TEXT) continue;
      buf = readFileSync(path.join(root, rel));
    } catch {
      continue;
    }
    if (buf.includes(0)) continue;
    const text = buf.toString('utf8');
    if (!text.includes('legacy')) continue;
    const code = codeText(rel, text);
    for (const f of folders) if (readsFolder(rel, code, f)) out.get(f).push(rel);
  }
  return out;
}

/**
 * The held rows of a checkout: every SHA256SUMS row under designs/<id>/legacy
 * git does not track. With the archive (dir and its hashTree) each takes
 * class, archive id and bytes from it; without, from prior (same path and
 * sha256), else class null.
 */
function heldRows(root, files, { dir = null, originals = null, priorRows }) {
  const tracked = new Set(files);
  const rows = [];
  for (const [rel, sha] of legacySums(root)) {
    if (tracked.has(rel)) continue;
    const row = { path: rel, sha256: sha, bytes: null, class: null, where: 'private' };
    if (originals) {
      const hit = originals.get(sha);
      const park = hit ? null : parked(dir, rel, sha);
      row.class = hit ? 'original' : 'unmatched';
      if (hit) Object.assign(row, { originals: `${ORIGINALS_PREFIX}/${hit[0]}`, bytes: hit.bytes });
      else if (park) Object.assign(row, park);
    } else {
      const was = priorRows.get(rel);
      if (was && was.sha256 === sha && was.where === 'private') Object.assign(row, { bytes: was.bytes, class: was.class }, was.originals ? { originals: was.originals } : {});
    }
    rows.push(row);
  }
  return rows;
}

/**
 * The inventory of a checkout. originals is a hashTree map or null; with null,
 * a row the lookup would decide takes its class from prior (same path and
 * sha256) and is marked lookup: false when prior has no such row. dir is the
 * originals folder, for the parked copies of held rows.
 */
export function inventory(root, { originals = null, prior = null, dir = null } = {}) {
  const files = tracked(root);
  const priorRows = new Map((prior?.files ?? []).map((r) => [r.path, r]));
  const rows = [];
  for (const rel of files) {
    const folder = legacyFolder(rel);
    if (!folder) continue;
    const buf = readFileSync(path.join(root, rel));
    const row = { path: rel, sha256: sha256(buf), bytes: buf.length, class: fixedClass(rel) };
    if (!row.class && originals) {
      const hit = originals.get(row.sha256);
      row.class = hit ? 'original' : 'unmatched';
      if (hit) row.originals = `${ORIGINALS_PREFIX}/${hit[0]}`;
    } else if (!row.class) {
      const was = priorRows.get(rel);
      if (was && was.sha256 === row.sha256 && (was.class === 'original' || was.class === 'unmatched')) {
        row.class = was.class;
        if (was.originals) row.originals = was.originals;
      } else row.class = null;
    }
    rows.push(row);
  }
  rows.push(...heldRows(root, files, { dir, originals, priorRows }));
  rows.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const folders = [...new Set(rows.map((r) => legacyFolder(r.path)))].sort();
  const readers = findReaders(root, files, folders);
  return {
    globs: LEGACY_GLOBS.map(([g]) => g),
    folders: Object.fromEntries(folders.map((f) => [f, { readers: readers.get(f) }])),
    files: rows,
  };
}

/** One row per line so a diff names the file that moved. */
export function serialize(inv) {
  const folders = Object.entries(inv.folders).map(([f, v]) => `    ${JSON.stringify(f)}: ${JSON.stringify(v)}`);
  const files = inv.files.map((r) => `    ${JSON.stringify(r)}`);
  return `{\n  "globs": ${JSON.stringify(inv.globs)},\n  "folders": {\n${folders.join(',\n')}\n  },\n  "files": [\n${files.join(',\n')}\n  ]\n}\n`;
}

/** Differences between a recorded inventory and a recomputed one, as lines. */
export function compare(recorded, now) {
  const out = [];
  const rec = new Map(recorded.files.map((r) => [r.path, r]));
  const cur = new Map(now.files.map((r) => [r.path, r]));
  for (const [p, r] of cur) {
    const was = rec.get(p);
    if (!was) { out.push(r.where ? `${p}: held (SHA256SUMS lists it, git does not track it), no row` : `${p}: tracked under a legacy glob, no row`); continue; }
    if ((was.where ?? null) !== (r.where ?? null)) out.push(`${p}: where recorded ${was.where ?? 'tracked'}, measured ${r.where ?? 'tracked'}`);
    for (const k of ['sha256', 'bytes']) if (was[k] !== r[k] && !(k === 'bytes' && r.class === null)) out.push(`${p}: ${k} recorded ${was[k]}, measured ${r[k]}`);
    if (r.class === null) {
      if (was.class !== 'original' && was.class !== 'unmatched') out.push(`${p}: class recorded ${was.class}, measured needs the originals lookup`);
    } else if (was.class !== r.class) out.push(`${p}: class recorded ${was.class}, measured ${r.class}`);
    else if ((was.originals ?? null) !== (r.originals ?? null)) out.push(`${p}: originals recorded ${was.originals}, measured ${r.originals}`);
  }
  for (const p of rec.keys()) if (!cur.has(p)) out.push(`${p}: row names no tracked file and no SHA256SUMS row`);
  const sorted = recorded.files.map((r) => r.path);
  if (sorted.join('\n') !== [...sorted].sort().join('\n')) out.push('files: rows are not sorted by path');
  const fr = recorded.folders ?? {};
  for (const f of new Set([...Object.keys(fr), ...Object.keys(now.folders)])) {
    const a = JSON.stringify(fr[f]?.readers ?? null);
    const b = JSON.stringify(now.folders[f]?.readers ?? null);
    if (a !== b) out.push(`${f}: readers recorded ${a}, measured ${b}`);
  }
  if (JSON.stringify(recorded.globs) !== JSON.stringify(now.globs)) out.push('globs: recorded list differs');
  return out;
}

export function classCounts(inv) {
  const n = {};
  for (const r of inv.files) n[r.class ?? 'unlooked'] = (n[r.class ?? 'unlooked'] ?? 0) + 1;
  return n;
}

function main(argv, env) {
  const rootArg = argv.find((a) => a.startsWith('--root='));
  const root = rootArg ? path.resolve(rootArg.slice('--root='.length)) : fileURLToPath(new URL('../../', import.meta.url));
  const mode = argv.includes('--write') ? 'write' : argv.includes('--check') ? 'check' : null;
  if (!mode) { console.error('usage: node tools/legacy/inventory.mjs --write | --check [--root=<dir>]'); return 2; }
  const outFile = path.join(root, OUT);
  let prior = null;
  try { prior = JSON.parse(readFileSync(outFile, 'utf8')); } catch { prior = null; }
  const dir = env.HBF_ORIGINALS;
  const originals = dir ? hashTree(dir) : null;
  if (!originals) console.log('originals lookup not run: HBF_ORIGINALS is unset');
  const inv = inventory(root, { originals, prior, dir });
  if (originals) console.log(`classes: ${JSON.stringify(classCounts(inv))} (measured, ${inv.files.length} rows)`);
  if (mode === 'write') {
    const open = inv.files.filter((r) => r.class === null);
    if (open.length) {
      console.error(`${open.length} rows need the originals lookup, first ${open[0].path}. set HBF_ORIGINALS to a copy of fab-knowledge/originals`);
      return 1;
    }
    const lost = inv.files.filter((r) => r.where === 'private' && !r.originals);
    if (lost.length) {
      for (const r of lost) console.error(`${r.path}: held, and neither the originals nor ${PARKED}/ hold its bytes. copy it to ${ORIGINALS_PREFIX}/${PARKED}/${r.path} first`);
      return 1;
    }
    mkdirSync(path.dirname(outFile), { recursive: true });
    writeFileSync(outFile, serialize(inv));
    console.log(`wrote ${OUT}: ${inv.files.length} rows, ${Object.keys(inv.folders).length} folders`);
    return 0;
  }
  if (!prior) { console.error(`${OUT} is missing or not JSON. run --write`); return 1; }
  const diff = compare(prior, inv);
  if (diff.length) {
    for (const d of diff.slice(0, 50)) console.error(d);
    console.error(`${diff.length} differences against ${OUT}. rerun with --write after checking them`);
    return 1;
  }
  console.log(`${OUT} matches: ${inv.files.length} rows, ${Object.keys(inv.folders).length} folders`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2), process.env);
}
