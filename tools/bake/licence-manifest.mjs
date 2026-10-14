// The licence manifest of a bake (LICENSING.md 1.2 and 3, D-043): every
// installed package a bake inlines, found from the manifest itself (each
// `npm:` source) and from the modules vite bundles for a ui entry, matched
// to its row in tools/licences.json. tools/bake/bake.mjs writes it beside
// the baked page as <id>.licences.json and fails the bake on a problem;
// tools/licences.mjs --notices builds THIRD-PARTY-NOTICES.txt from the
// same rows, so the two never disagree.
//
// Problems: an inlined package with no row; an LGPL item in a default
// bake (eecircuit-engine, replicad-opencascadejs, occt-import-js load only
// as lazy separate files, never inside the offline bake).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The manifest keys whose `from` sources are inlined into the page. */
const SOURCES = ['vendor', 'classic', 'fonts', 'css', 'blocks'];

/** Every `npm:` source a manifest names, in manifest order. */
export function npmSources(manifest) {
  const out = [];
  for (const key of SOURCES) for (const x of manifest[key] ?? []) if (typeof x.from === 'string' && x.from.startsWith('npm:')) out.push(x.from);
  if (manifest.wasm?.from?.startsWith('npm:')) out.push(manifest.wasm.from);
  return out;
}

const key = (p) => `${p.name}@${p.version}`;

/**
 * Rows for the packages a bake inlines. `packages` holds {name, version};
 * duplicates collapse. Returns { rows, problems } with rows sorted by name.
 */
export function licenceManifest(packages, table) {
  const seen = new Map();
  for (const p of packages) seen.set(key(p), p);
  const rows = [];
  const problems = [];
  for (const p of [...seen.values()].sort((a, b) => (key(a) < key(b) ? -1 : 1))) {
    const row = (table.dependencies ?? []).find((d) => d.ecosystem === 'npm' && d.name === p.name && d.version === p.version);
    if (row === undefined) {
      problems.push(`${key(p)} is inlined and has no row in tools/licences.json`);
      continue;
    }
    if (/LGPL/.test(row.audited ?? '')) problems.push(`${key(p)} audited ${row.audited} is inlined; LGPL items load only as a lazy separate file, never in a default bake (D-043)`);
    rows.push({ name: p.name, version: p.version, audited: row.audited, load: row.load, ...(row.note ? { note: row.note } : {}) });
  }
  return { rows, problems };
}

export const readTable = (repo) => JSON.parse(readFileSync(join(repo, 'tools/licences.json'), 'utf8'));
