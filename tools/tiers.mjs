#!/usr/bin/env node
// Tier gate (D-044, D-045). Reads tools/tiers.json and fails on an
// @hackbuild edge its `edges` list does not name for the source, an upward
// edge outside `sameTier`, DOM or vue use in a headless src/, a relative
// import in src/ that leaves its workspace, a computed import() in a
// headless src/ or a new URL('../...') in src/ that reaches another workspace,
// an import with no declared
// dependency or tsconfig reference, a root tsconfig whose references
// list a workspace before one it depends on, and a line matching a `forbid`
// pattern under its folder (Math.random in packages/sim/src), and a trig
// placement formula of a machine the kinematics module owns written outside
// that module (`placement`, D-139). Edges are read from
// package.json and every code file of the workspace (outside src/ and
// scenes/, a relative import that lands in another workspace counts as an
// edge to it).
// Usage: node tools/tiers.mjs [root]   (root defaults to the repo root)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bare, code, computedImports, specifiers, urlPaths, walk } from './source-scan.mjs';

const root = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const table = JSON.parse(fs.readFileSync(path.join(root, 'tools/tiers.json'), 'utf8'));

const failures = [];
const fail = (msg) => { failures.push(msg); console.log(`tiers: fail ${msg}`); };
const report = (msg) => console.log(`tiers: report ${msg}`);

const readJson = (file) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
};

function dirFor(name, tier) {
  if (tier === 'S') return name;
  if (tier === 'app') return name;
  if (name === table.kernel.package) return name;
  return `packages/${name}`;
}

// rank: position in `order`; kernel sits above tier 2 and below tier 3, so
// tiers 3 and app may depend on it and it may depend on its mayImport tiers.
const order = table.order;
const rankOf = (tier) => order.indexOf(tier);
const workspaces = new Map();
for (const tier of order) {
  for (const name of table.tiers[tier] ?? []) {
    workspaces.set(name, { name, tier, rank: rankOf(tier), dir: dirFor(name, tier), headless: table.headless.includes(tier) });
  }
}
const kernelName = table.kernel.package;
workspaces.set(kernelName, {
  name: kernelName,
  tier: 'kernel',
  rank: rankOf('2') + 0.5,
  dir: dirFor(kernelName, 'kernel'),
  headless: table.headless.includes('kernel'),
  mayImport: table.kernel.mayImport,
});
// edges: the may-import list per workspace (ARCHITECTURE.md 3); "*" admits any
// target. edgeExceptions: dated edges the plan has not reconciled yet, the
// rank rule included; they are reported, and the gate fails once no edge
// uses them.
const edges = table.edges ?? {};
for (const w of workspaces.values()) {
  if (!Array.isArray(edges[w.name])) fail(`tools/tiers.json edges has no list for ${w.name}`);
}
for (const [name, list] of Object.entries(edges)) {
  if (!workspaces.has(name)) fail(`tools/tiers.json edges names ${name}, which no tier lists`);
  for (const t of list) if (t !== '*' && !workspaces.has(t)) fail(`tools/tiers.json edges.${name} names ${t}, which no tier lists`);
}
const exceptions = new Map();
for (const e of table.edgeExceptions ?? []) {
  for (const t of e.targets ?? []) exceptions.set(`${e.source}>${t}`, { ...e, used: false });
}
// sameTier entries are [source, target] pairs or {source, target} objects (PACKAGES.md 3.2).
const sameTier = new Set((table.sameTier ?? []).map((p) => (Array.isArray(p) ? `${p[0]}>${p[1]}` : `${p.source}>${p.target}`)));

const byDir = new Map([...workspaces.values()].map((w) => [path.resolve(root, w.dir), w]));

// A folder under packages/ that tiers.json does not list has no tier.
const pkgRoot = path.join(root, 'packages');
if (fs.existsSync(pkgRoot)) {
  for (const d of fs.readdirSync(pkgRoot, { withFileTypes: true })) {
    if (d.isDirectory() && !byDir.has(path.resolve(pkgRoot, d.name))) fail(`packages/${d.name} is not listed in tools/tiers.json`);
  }
}

const hackbuildTarget = (spec) => {
  const m = spec.match(/^@hackbuild\/([^/]+)/);
  return m ? m[1] : null;
};
// document or window used as an object, directly, through globalThis or self,
// or an HTML*Element type. The bare form excludes a name inside a module
// path or after a member dot ("./click-spring-window.js", "a.window.b").
const DOM = /\b(?:globalThis|self)\s*(?:\?\.|\.)\s*(?:document|window)\b|\b(?:globalThis|self)\s*\[\s*['"`](?:document|window)['"`]|(?<![\w$./-])(?:document|window)\s*(?:\?\.|\.|\[)|\bHTML\w*Element\b/;
const isVue = (spec) => spec === 'vue' || spec.startsWith('vue/');

function checkEdge(src, targetName, where) {
  if (targetName === src.name) return;
  const target = workspaces.get(targetName);
  if (!target) { fail(`${where}: @hackbuild/${targetName} is not listed in tools/tiers.json`); return; }
  const list = edges[src.name] ?? [];
  const key = `${src.name}>${targetName}`;
  if (!list.includes('*') && !list.includes(targetName)) {
    const ex = exceptions.get(key);
    if (!ex) fail(`${where}: ${src.name} imports @hackbuild/${targetName}, an edge tools/tiers.json edges.${src.name} does not list`);
    else {
      if (!ex.used) report(`${src.name} imports @hackbuild/${targetName} under edgeExceptions (since ${ex.since}): ${ex.note}`);
      ex.used = true;
      // a dated exception covers the edge whole, the rank rule included; it is reported and goes stale on its own
      return;
    }
  }
  // The rank rule runs as a second guard, so a listed edge that points up
  // still fails unless sameTier names the pair.
  if (src.mayImport) {
    if (!src.mayImport.includes(target.tier)) fail(`${where}: ${src.name} (kernel) imports @hackbuild/${targetName} (tier ${target.tier}), allowed tiers ${src.mayImport.join(', ')}`);
    return;
  }
  if (target.rank < src.rank) return;
  if (sameTier.has(`${src.name}>${targetName}`)) return;
  fail(`${where}: ${src.name} (tier ${src.tier}) imports @hackbuild/${targetName} (tier ${target.tier}), legal only from a higher tier`);
}

// The workspace whose folder holds an absolute path (longest match), or null.
const dirsByLength = [...byDir.entries()].sort((a, b) => b[0].length - a[0].length);
const workspaceAt = (abs) => {
  for (const [dir, w] of dirsByLength) if (abs === dir || abs.startsWith(dir + path.sep)) return w;
  return null;
};
const inside = (abs, dir) => abs === dir || abs.startsWith(dir + path.sep);

// Folders scanned per workspace and how: src/ and scenes/ (code the package
// loads at run time, the sim scenes) are held to every rule, seed is legacy
// code (edges fail, DOM is reported), and every other code file in the
// workspace, test/, scripts/, bench/ and loose config files included, is
// held to edges only (its dependencies may be devDependencies). No code
// file of a workspace goes unscanned. spec keeps its sources at the folder
// root, beside test/ and fixtures/.
export const RUNTIME_DIRS = ['src', 'scenes'];
function scanSets(w, abs) {
  if (w.name === 'spec') {
    return [
      { kind: 'src', files: walk(abs, [], new Set(['test', 'fixtures'])) },
      { kind: 'test', files: [...walk(path.join(abs, 'test')), ...walk(path.join(abs, 'fixtures'))] },
    ];
  }
  return [
    { kind: 'src', files: RUNTIME_DIRS.flatMap((d) => walk(path.join(abs, d))) },
    { kind: 'seed', files: walk(path.join(abs, 'seed')) },
    { kind: 'test', files: walk(abs, [], new Set([...RUNTIME_DIRS, 'seed', 'out'])) },
  ];
}

const depsOf = new Map();
for (const w of workspaces.values()) {
  const abs = path.resolve(root, w.dir);
  const pj = readJson(path.join(abs, 'package.json'));
  if (!pj) {
    console.log(`tiers: ${w.dir} absent`);
    continue;
  }
  const declared = new Set();
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const dep of Object.keys(pj[field] ?? {})) {
      const t = hackbuildTarget(dep);
      if (t) { declared.add(t); checkEdge(w, t, `${w.dir}/package.json`); }
    }
  }
  const tsconfig = readJson(path.join(abs, 'tsconfig.json'));
  const refs = new Set((tsconfig?.references ?? []).map((r) => path.resolve(abs, r.path)));
  const used = new Set(declared);

  for (const { kind: folder, files } of scanSets(w, abs)) {
    for (const file of files) {
      const rel = path.relative(root, file);
      const text = fs.readFileSync(file, 'utf8');
      const specs = specifiers(text);
      for (const s of specs) {
        if (s.startsWith('.')) {
          const to = path.resolve(path.dirname(file), s);
          if (inside(to, abs)) continue;
          if (folder === 'src') {
            fail(`${rel}: relative import ${s} leaves ${w.dir}; import another workspace by @hackbuild name`);
            continue;
          }
          const other = workspaceAt(to);
          if (other) checkEdge(w, other.name, `${rel} (relative ${s})`);
          continue;
        }
        const t = hackbuildTarget(s);
        if (t) {
          checkEdge(w, t, rel);
          if (folder === 'src' && t !== w.name) {
            used.add(t);
            if (!declared.has(t)) fail(`${rel}: imports @hackbuild/${t} with no entry in ${w.dir}/package.json dependencies`);
            const target = workspaces.get(t);
            if (target && t !== 'spec' && !refs.has(path.resolve(root, target.dir))) {
              fail(`${rel}: imports @hackbuild/${t} with no {"path": ...} reference in ${w.dir}/tsconfig.json`);
            }
          }
        }
      }
      if (folder === 'src') {
        // An edge the specifier list cannot see: a computed import() in a
        // headless src file, or a URL climbing out of the workspace.
        if (w.headless) for (const a of computedImports(text)) fail(`${rel}: import(${a}) is computed; import by a literal specifier so the edge is seen`);
        for (const u of urlPaths(text)) {
          const to = path.resolve(path.dirname(file), u);
          if (inside(to, abs)) continue;
          const other = workspaceAt(to);
          // Into another workspace it is an unlisted edge; to repo data
          // (designs/, legacy fixtures) it is reported.
          if (other) fail(`${rel}: new URL('${u}') reaches ${other.dir}; import it by @hackbuild name so the edge is listed`);
          else report(`${rel} reads ${path.relative(root, to) || '.'} by URL (data outside ${w.dir})`);
        }
      }
      if (w.headless && folder !== 'test') {
        const vue = specs.some(isVue);
        const dom = DOM.test(code(text));
        if (vue || dom) {
          const what = [dom ? 'touches the DOM' : null, vue ? 'imports vue' : null].filter(Boolean).join(' and ');
          if (folder === 'src') fail(`${rel} ${what} in headless tier ${w.tier} (D-045)`);
          else report(`${rel} ${what} (seed)`);
        }
      }
    }
  }
  depsOf.set(w.name, used);
}

// Root references must be topological: no workspace before one it depends on.
const rootTs = readJson(path.join(root, 'tsconfig.json'));
const listed = (rootTs?.references ?? []).map((r) => byDir.get(path.resolve(root, r.path))?.name ?? r.path);
const position = new Map(listed.map((n, i) => [n, i]));
for (const [name, deps] of depsOf) {
  if (!position.has(name)) {
    fail(`root tsconfig.json references omit ${workspaces.get(name).dir}`);
    continue;
  }
  for (const d of deps) {
    if (position.has(d) && position.get(d) > position.get(name)) {
      fail(`root tsconfig.json lists ${name} before ${d}, which it depends on`);
    }
  }
}

// forbid: a pattern refused anywhere under a folder, comments included, so
// a plain grep of the folder agrees with the gate. `except` lists folders
// under it that are the pattern's one home.
for (const row of table.forbid ?? []) {
  const re = new RegExp(row.pattern);
  const homes = (row.except ?? []).map((d) => path.resolve(root, d) + path.sep);
  for (const file of walk(path.resolve(root, row.dir)).filter((f) => !homes.some((h) => f.startsWith(h)))) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (re.test(line)) fail(`${path.relative(root, file)}:${i + 1}: matches the forbid pattern for ${row.dir}: ${row.why}`);
    });
  }
}

// placement (D-139, M07-T10): every pose of a machine the kinematics
// module owns has one formula, in its home folder. A code file anywhere
// else fails when, comments and string contents blanked, it both calls one
// of the trig functions and names one of that machine's parts. Folders in
// `skip` (legacy copies, the originals the module ports) are not scanned.
const placement = table.placement;
if (placement) {
  const trig = new RegExp(placement.trig);
  const homes = placement.home.map((d) => path.resolve(root, d));
  const skip = new Set(placement.skip);
  const machines = placement.machines.map((m) => ({ ...m, re: new RegExp(m.parts) }));
  const files = [];
  const visit = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) visit(p);
      else if (/\.(?:[cm]?[jt]sx?|vue)$/.test(e.name)) files.push(p);
    }
  };
  visit(root);
  for (const file of files) {
    if (homes.some((h) => inside(file, h))) continue;
    const text = bare(fs.readFileSync(file, 'utf8'));
    const call = text.match(trig);
    if (call === null) continue;
    for (const m of machines) {
      const part = text.match(m.re);
      if (part !== null) fail(`${path.relative(root, file)}: calls ${call[0].replace(/\s*\($/, '')} and names ${m.machine} part ${part[0]}; place ${m.machine} parts through ${placement.home.join(', ')} (${placement.why})`);
    }
  }
}

for (const [key, ex] of exceptions) {
  if (!ex.used) fail(`tools/tiers.json edgeExceptions lists ${key.replace('>', ' to ')}, which no edge uses any more; remove it`);
}

console.log(`tiers: ${failures.length} failure(s)`);
process.exit(failures.length ? 1 : 0);
