#!/usr/bin/env node
// Exact pins for the board stack (M08-T01 step 7, R-07 in RISKS.md, D-040).
// tscircuit, @tscircuit/core and circuit-json publish 0.0.x releases daily,
// so a range in any package.json lets one install differ from the next.
// Fails when one of the three carries a range anywhere a package.json can
// name it (dependencies, devDependencies, peerDependencies,
// optionalDependencies, overrides, hbf.pinsBlocked), or when any pin in
// packages/board/package.json is a range.
// Usage: node tools/pins-exact.mjs [root]   (root defaults to the repo root)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const WATCHED = ['tscircuit', '@tscircuit/core', 'circuit-json'];
const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/;
const FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

/** Every package.json the workspace declares, root first, as repo-relative paths. */
export function manifests(root) {
  const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const out = ['package.json'];
  for (const pattern of rootPkg.workspaces ?? []) {
    if (pattern.endsWith('/*')) {
      const base = path.join(root, pattern.slice(0, -2));
      if (!fs.existsSync(base)) continue;
      for (const e of fs.readdirSync(base, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
        const rel = path.posix.join(pattern.slice(0, -2), e.name, 'package.json');
        if (e.isDirectory() && fs.existsSync(path.join(root, rel))) out.push(rel);
      }
    } else if (fs.existsSync(path.join(root, pattern, 'package.json'))) out.push(path.posix.join(pattern, 'package.json'));
  }
  return out;
}

/** Each pin a manifest names: field, package and spec; overrides are walked at every depth. */
function pinsOf(pkg) {
  const out = [];
  for (const f of FIELDS) for (const [name, spec] of Object.entries(pkg[f] ?? {})) out.push({ field: f, name, spec });
  const walk = (obj, at) => {
    for (const [k, v] of Object.entries(obj)) {
      if (k === '.') out.push({ field: at, name: at.split(' > ').pop(), spec: v });
      else if (typeof v === 'string') out.push({ field: `${at} > ${k}`, name: k, spec: v });
      else if (v && typeof v === 'object') walk(v, `${at} > ${k}`);
    }
  };
  walk(pkg.overrides ?? {}, 'overrides');
  for (const [name, spec] of Object.entries(pkg.hbf?.pinsBlocked ?? {})) out.push({ field: 'hbf.pinsBlocked', name, spec });
  return out;
}

export function check(root) {
  const failures = [];
  for (const rel of manifests(root)) {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
    const board = rel === 'packages/board/package.json';
    for (const p of pinsOf(pkg)) {
      if (p.spec.startsWith('$') || EXACT.test(p.spec)) continue;
      if (p.name.startsWith('@hackbuild/') && !WATCHED.includes(p.name)) continue;
      if (WATCHED.includes(p.name) || board) failures.push(`${rel} ${p.field} ${p.name} "${p.spec}" is a range; pin it exactly (R-07)`);
    }
  }
  return failures;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const rootArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const root = path.resolve(rootArg ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const failures = check(root);
  for (const f of failures) console.log(`pins-exact: fail ${f}`);
  console.log(`pins-exact: ${failures.length === 0 ? 'pass' : `${failures.length} failures`} over ${manifests(root).length} package.json files`);
  process.exit(failures.length === 0 ? 0 : 1);
}
