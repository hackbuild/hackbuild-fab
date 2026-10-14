#!/usr/bin/env node
// Extraction check (D-028, D-029, D-036, D-037; REPOS.md 10.5). Prints three lines
// for a package: trigger part one (the trigger's designs build on the
// package and import no legacy code), trigger part two (the parity commands
// exit 0) and the import closure (every dependency of the package resolves
// outside this workspace). Exit 0 when all three hold, 1 otherwise, 2 on a
// usage error. It never splits, pushes, tags or publishes (D-006).
//
// Under D-178 a build.ts imports only @hackbuild/spec, so part one reads
// every source of the design folder outside legacy/: the design builds on
// the package when one of them imports it. A workspace dependency resolves
// outside the workspace only when its own package.json is not private, or
// when @hackbuild/kernel is not private and exports its subpath (D-036);
// nothing publishes before D-037 clears.
//
// Usage: node tools/extract-check.mjs <package> [--skip-parity] [--root DIR]
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { code, specifiers, walk } from './source-scan.mjs';

const harness = (id) => ({
  name: `${id}_parity`,
  cmd: 'uv',
  args: ['run', '--project', 'tools/py', '--extra', 'bench', `tools/py/harness/${id}_parity.py`,
    `designs/${id}/legacy/${id}.html`, `designs/${id}/test/parity.html`],
});

const hbfParity = (ref) => ({ name: `hbf parity ${ref}`, cmd: 'npx', args: ['--no-install', 'hbf', 'parity', ref] });

/** The six KEYWAY family boards M05-T15 adds beside KEYWAY and the SPLICE ladder. */
const VINYL_FAMILY = ['vernier', 'quadrant', 'spline', 'tessera', 'fret', 'stave'];

/**
 * Extraction triggers by package. A design is an id under designs/, or
 * { id, dir } when it lives elsewhere (KEYWAY is the reference
 * reference/copper/keyway, M05-T14). Inlay: the parity commands are the M03
 * Exit rows for M03-T09, M03-T10 and M03-T08. Copper (D-029, M05-T16 step
 * 1): BLOCKS seats on the package (M05-T09), then every reference the M05
 * Exit table runs through hbf parity, in Exit order.
 */
export const TRIGGERS = {
  inlay: {
    decision: 'D-028',
    designs: ['collar', 'sprue'],
    parity: [
      harness('collar'),
      harness('sprue'),
      { name: 'hbf parity reference/cosmetic/coin-inlay', cmd: 'npx', args: ['--no-install', 'hbf', 'parity', 'reference/cosmetic/coin-inlay'] },
    ],
  },
  copper: {
    decision: 'D-029',
    designs: ['blocks', { id: 'keyway', dir: 'reference/copper/keyway' }],
    parity: [
      { name: 'npm test -w designs/blocks -- route-seat', cmd: 'npm', args: ['test', '-w', 'designs/blocks', '--', 'route-seat'] },
      hbfParity('reference/electrical/blocks-pullup-band'),
      hbfParity('reference/electrical/pip-buried-route'),
      hbfParity('reference/electrical/pip-drive'),
      hbfParity('reference/electrical/capricate-touch'),
      hbfParity('reference/copper/keyway'),
      hbfParity('reference/copper/splice-ladder'),
      ...VINYL_FAMILY.map((name) => hbfParity(`reference/copper/${name}`)),
      hbfParity('reference/keys/flex-pair'),
    ],
  },
};

/** A trigger design as { id, dir }, dir relative to the root. */
export const designOf = (d) => (typeof d === 'string' ? { id: d, dir: `designs/${d}` } : d);

const readJson = (file) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
};
const rel = (root, p) => path.relative(root, p).split(path.sep).join('/');
const isRelative = (s) => s.startsWith('./') || s.startsWith('../') || s === '.' || s === '..';
const inside = (dir, p) => {
  const r = path.relative(dir, p);
  return r === '' || (!r.startsWith('..') && !path.isAbsolute(r));
};
const packageName = (spec) => {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
};
const builtins = new Set(builtinModules);
const isBuiltin = (spec) => spec.startsWith('node:') || builtins.has(packageName(spec));

const sourceSpecs = (file) => specifiers(code(fs.readFileSync(file, 'utf8')));

/** Workspace package.json files by package name, from the root workspaces list. */
export function workspaces(root) {
  const out = new Map();
  for (const entry of readJson(path.join(root, 'package.json'))?.workspaces ?? []) {
    const dirs = entry.endsWith('/*')
      ? (fs.existsSync(path.join(root, entry.slice(0, -2)))
        ? fs.readdirSync(path.join(root, entry.slice(0, -2)), { withFileTypes: true })
          .filter((d) => d.isDirectory()).map((d) => path.join(root, entry.slice(0, -2), d.name))
        : [])
      : [path.join(root, entry)];
    for (const dir of dirs) {
      const pj = readJson(path.join(dir, 'package.json'));
      if (pj?.name) out.set(pj.name, { dir, json: pj });
    }
  }
  return out;
}

/** Part one: each trigger design has a source outside legacy/ importing the package, and none importing legacy/. */
export function partOne(root, pkg, trigger) {
  const target = `@hackbuild/${pkg}`;
  const designs = trigger.designs.map(designOf).map(({ id, dir: where }) => {
    const dir = path.join(root, where);
    if (!fs.existsSync(dir)) return { id, missing: true, importers: [], legacy: [] };
    const legacyDir = path.join(dir, 'legacy');
    const importers = [];
    const legacy = [];
    for (const file of walk(dir, [], new Set(['legacy'])).sort()) {
      for (const s of sourceSpecs(file)) {
        if (s === target || s.startsWith(`${target}/`)) importers.push(rel(dir, file));
        else if (isRelative(s) && inside(legacyDir, path.resolve(path.dirname(file), s))) legacy.push(`${rel(dir, file)} imports ${s}`);
      }
    }
    return { id, missing: false, importers: [...new Set(importers)], legacy };
  });
  const holds = designs.every((d) => !d.missing && d.importers.length > 0 && d.legacy.length === 0);
  return { holds, designs };
}

export function formatPartOne(pkg, trigger, r) {
  const head = `trigger part one (${trigger.decision}): ${r.holds ? 'holds' : 'fails'}`;
  const parts = r.designs.map((d) => {
    if (d.missing) return `${d.id} missing`;
    const via = d.importers.length ? `${d.id} via ${d.importers.join(', ')}` : `${d.id} imports no @hackbuild/${pkg}`;
    return d.legacy.length ? `${via}, legacy import ${d.legacy.join(', ')}` : via;
  });
  const clean = r.designs.every((d) => d.legacy.length === 0);
  return `${head}; ${parts.join('; ')}${clean ? '; no legacy import' : ''}`;
}

/** Part two: every parity command exits 0. A command that cannot start is not run, and part two does not hold. */
export function partTwo(root, trigger, run = defaultRun) {
  const rows = trigger.parity.map((p) => {
    const r = run(p.cmd, p.args, root);
    if (r.error) return { name: p.name, ran: false, status: null, reason: r.error.code ?? r.error.message, tail: '' };
    return { name: p.name, ran: true, status: r.status, reason: r.signal ?? null, tail: lastLine(r.stdout, r.stderr) };
  });
  return { holds: rows.every((r) => r.ran && r.status === 0), skipped: false, rows };
}

function defaultRun(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 600_000 });
}
function lastLine(...texts) {
  const lines = texts.join('\n').split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.at(-1) ?? '';
}

export function formatPartTwo(trigger, r) {
  const head = `trigger part two (${trigger.decision})`;
  if (r.skipped) return `${head}: not run (--skip-parity)`;
  const parts = r.rows.map((x) => (x.ran ? `${x.name} exit ${x.status ?? x.reason}` : `${x.name} not run (${x.reason})`));
  return `${head}: ${r.holds ? 'holds' : 'fails'}; ${parts.join(', ')}`;
}

/** The import closure of packages/<pkg>: src imports and declared dependencies, each resolved outside the workspace or blocked. */
export function closure(root, pkg) {
  const ws = workspaces(root);
  const self = ws.get(`@hackbuild/${pkg}`);
  if (!self) return null;
  const names = new Set([
    ...Object.keys(self.json.dependencies ?? {}),
    ...Object.keys(self.json.peerDependencies ?? {}),
  ]);
  const escapes = [];
  for (const file of walk(path.join(self.dir, 'src')).sort()) {
    for (const s of sourceSpecs(file)) {
      if (isRelative(s)) {
        if (!inside(self.dir, path.resolve(path.dirname(file), s))) escapes.push(`${rel(root, file)} imports ${s}`);
      } else if (!isBuiltin(s)) {
        names.add(packageName(s));
      }
    }
  }
  const kernel = ws.get('@hackbuild/kernel');
  const kernelOpen = Boolean(kernel && kernel.json.private !== true);
  const kernelExports = kernel?.json.exports && typeof kernel.json.exports === 'object' ? kernel.json.exports : {};
  const blocked = [];
  const external = [];
  for (const name of [...names].sort()) {
    const w = ws.get(name);
    if (!w) { external.push(name); continue; }
    const short = name.replace(/^@hackbuild\//, '');
    const published = w.json.private !== true || (kernelOpen && Object.hasOwn(kernelExports, `./${short}`));
    if (!published) blocked.push(short);
  }
  return { holds: blocked.length === 0 && escapes.length === 0, imports: [...names].sort(), blocked, escapes, external, kernelOpen };
}

export function formatClosure(c) {
  if (c.holds) return `import closure: holds; ${c.imports.length ? c.imports.join(', ') : 'no imports'} resolve outside the workspace`;
  const parts = [];
  if (c.blocked.length) {
    const why = c.kernelOpen
      ? '@hackbuild/kernel exports none of them'
      : '@hackbuild/kernel is private';
    parts.push(`fails on ${c.blocked.join(', ')} (private workspace packages; ${why}; D-036, D-037)`);
  }
  if (c.escapes.length) parts.push(`relative imports leave the package: ${c.escapes.join(', ')}`);
  return `import closure: ${parts.join('; ')}; extraction deferred until @hackbuild/kernel publishes`;
}

export function main(argv, { run = defaultRun, log = console.log, root: rootDefault } = {}) {
  const args = [...argv];
  const skip = args.includes('--skip-parity');
  const ri = args.indexOf('--root');
  const root = path.resolve(ri >= 0 ? args[ri + 1] : rootDefault ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const pkg = args.filter((a, i) => !a.startsWith('--') && !(ri >= 0 && i === ri + 1))[0];
  const trigger = TRIGGERS[pkg];
  if (!trigger) {
    log(`extract-check: no trigger for ${pkg ?? '(none)'}; known: ${Object.keys(TRIGGERS).join(', ')}`);
    return 2;
  }
  const one = partOne(root, pkg, trigger);
  const two = skip ? { holds: false, skipped: true, rows: [] } : partTwo(root, trigger, run);
  const c = closure(root, pkg);
  if (!c) {
    log(`extract-check: packages/${pkg} has no workspace package.json`);
    return 2;
  }
  log(formatPartOne(pkg, trigger, one));
  log(formatPartTwo(trigger, two));
  log(formatClosure(c));
  for (const r of two.rows) if (r.ran && r.status !== 0 && r.tail) process.stderr.write(`${r.name}: ${r.tail}\n`);
  return one.holds && two.holds && c.holds ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
