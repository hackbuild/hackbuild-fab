#!/usr/bin/env node
// tools/bake/check-ui-css.mjs: the hackbuild-ui stylesheets a bake inlines match the
// pinned version (D-116).
//
//   node tools/bake/check-ui-css.mjs [baked.html ...]
//
// Recomputes from node_modules (installed version, each file's sha256, the inlined
// text after @import resolution) and from each baked file (every
// <style data-hb-ui data-sha256> element's text). With no arguments it reads every
// .html under dist/bench and dist/kit. A baked ui file with no hackbuild-ui style,
// or no baked file at all, fails: a check that read nothing passes nothing.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO, resolveCss, sha256 } from './bake.mjs';

const LOCK = join(REPO, 'tools', 'bake', 'ui-css.lock.json');

export function checkInstalled(lock, modulesRoot = join(REPO, 'node_modules')) {
  const errs = [];
  const root = join(modulesRoot, lock.package);
  const meta = join(root, 'package.json');
  if (!existsSync(meta)) return [`${lock.package} not installed. run npm ci.`];
  const version = JSON.parse(readFileSync(meta, 'utf8')).version;
  if (version !== lock.version) errs.push(`${lock.package} installed ${version}, lock ${lock.version}`);
  for (const [file, want] of Object.entries(lock.files)) {
    const p = join(root, file);
    const got = existsSync(p) ? sha256(readFileSync(p)) : 'missing';
    if (got !== want) errs.push(`${file} sha256 ${got}, lock ${want}`);
  }
  for (const [file, want] of Object.entries(lock.inlined)) {
    const got = sha256(resolveCss(join(root, file)));
    if (got !== want) errs.push(`${file} inlined sha256 ${got}, lock ${want}`);
  }
  return errs;
}

const STYLE = /<style\b([^>]*)>\n([\s\S]*?)\n<\/style>/g;
const attr = (attrs, name) => new RegExp(`\\s${name}="([^"]*)"`).exec(attrs)?.[1];

export function checkBaked(lock, html, label) {
  const errs = [];
  const allowed = new Set(Object.values(lock.inlined));
  let n = 0;
  for (let m = STYLE.exec(html); m; m = STYLE.exec(html)) {
    const version = attr(m[1], 'data-hb-ui');
    if (version === undefined) continue;
    n += 1;
    const claimed = attr(m[1], 'data-sha256');
    const got = sha256(m[2]);
    if (version !== lock.version) errs.push(`${label}: style data-hb-ui ${version}, lock ${lock.version}`);
    if (claimed !== got) errs.push(`${label}: style text sha256 ${got}, data-sha256 ${claimed}`);
    if (!allowed.has(got)) errs.push(`${label}: style text sha256 ${got} is not a locked hackbuild-ui sheet`);
  }
  STYLE.lastIndex = 0;
  if (n === 0) errs.push(`${label}: no hackbuild-ui style element`);
  return errs;
}

function defaultTargets() {
  const out = [];
  for (const sub of ['bench', 'kit']) {
    const dir = join(REPO, 'dist', sub);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) if (f.endsWith('.html')) out.push(join(dir, f));
  }
  return out;
}

function main(argv) {
  const lock = JSON.parse(readFileSync(LOCK, 'utf8'));
  const targets = argv.length ? argv.map((a) => resolve(a)) : defaultTargets();
  const errs = checkInstalled(lock);
  if (targets.length === 0) errs.push('no baked ui file to check. run npm run bake:all.');
  for (const t of targets) errs.push(...checkBaked(lock, readFileSync(t, 'utf8'), t.replace(`${REPO}/`, '')));
  if (errs.length) {
    for (const e of errs) console.error(`check-ui-css: ${e}`);
    return 1;
  }
  console.log(`check-ui-css: ${lock.package} ${lock.version}, ${targets.length} baked files match the lock`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
