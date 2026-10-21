// lineage.json against tools/lineage.schema.json and the README tables that mirror it (M-1-T09, D-156).
// No schema library: the checks below read the patterns and field list from the schema file itself.
import { test } from 'node:test';
import { heldSha, legacySums } from '../legacy/held.mjs';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { planCard, planSkip } from '../test-support/plan-root.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
// The milestone cards come from the plan archive (tools/test-support/plan-root.mjs); a test that
// reads one skips as not run on a runner without it.
const PLAN_SKIP = planSkip();
const rows = JSON.parse(readFileSync(root + 'lineage.json', 'utf8'));
const schema = JSON.parse(readFileSync(root + 'tools/lineage.schema.json', 'utf8'));
const FIELDS = ['id', 'kind', 'source', 'sha256', 'fixes', 'dest'];
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const { readStored } = await import(new URL('../legacy/stored-zip.mjs', import.meta.url).href);
const { ORIGINALS_OF_RECORD, sourcePath } = await import(new URL('../test-support/originals-root.ts', import.meta.url).href);
const { publishText } = await import(new URL('../publish-paths.mjs', import.meta.url).href);

/**
 * Bytes at a lineage path: a file, or `<zip>!<member>` for a legacy file kept
 * as a stored zip member (tools/legacy/stored-zip.mjs); null when absent.
 */
function bytesAt(path) {
  const [file, member] = path.split('!');
  if (!existsSync(file)) return null;
  if (member === undefined) return readFileSync(file);
  const data = readStored(readFileSync(file)).get(member);
  return data ? Buffer.from(data) : null;
}
const shaOf = (buf) => createHash('sha256').update(buf).digest('hex');

// README tables that mirror lineage rows, keyed by the subject they copy.
const MIRRORS = { healer: 'packages/mesh/seed/README.md' };

test('schema is 2020-12 with exactly the six required fields and no others', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.type, 'array');
  const item = schema.items;
  assert.deepEqual([...item.required].sort(), [...FIELDS].sort());
  assert.deepEqual(Object.keys(item.properties).sort(), [...FIELDS].sort());
  assert.equal(item.additionalProperties, false);
});

test('rows match the schema', () => {
  assert.ok(Array.isArray(rows) && rows.length > 0, 'lineage.json is a non-empty array');
  const p = schema.items.properties;
  const idRe = new RegExp(p.id.pattern), shaRe = new RegExp(p.sha256.pattern);
  for (const r of rows) {
    assert.deepEqual(Object.keys(r).sort(), [...FIELDS].sort(), `row ${r.id} fields`);
    assert.ok(typeof r.id === 'string' && idRe.test(r.id), `row ${r.id} id pattern ${p.id.pattern}`);
    assert.ok(p.kind.enum.includes(r.kind), `row ${r.id} kind ${r.kind}`);
    assert.ok(typeof r.source === 'string' && r.source.length >= p.source.minLength, `row ${r.id} source`);
    assert.ok(typeof r.sha256 === 'string' && shaRe.test(r.sha256), `row ${r.id} sha256 pattern`);
    assert.ok(Array.isArray(r.fixes) && r.fixes.every((f) => typeof f === 'string' && f.length > 0), `row ${r.id} fixes`);
    assert.ok(r.dest === null || (typeof r.dest === 'string' && r.dest.length > 0), `row ${r.id} dest`);
  }
});

test('ids are unique and rows are sorted by id', () => {
  const ids = rows.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate id');
  assert.deepEqual(ids, [...ids].sort(), 'rows not sorted by id');
});

test('one canonical row per subject', () => {
  const subjects = new Map();
  for (const r of rows) {
    const s = r.id.split('/')[0];
    subjects.set(s, (subjects.get(s) || 0) + (r.kind === 'canonical' ? 1 : 0));
  }
  for (const [s, n] of subjects) assert.equal(n, 1, `subject ${s} has ${n} canonical rows`);
});

// M05-T08 step 1 names the router canonical file, every known copy and the
// fixes they carry (D-156). Each named file has a router row, and each named
// fix is carried by a router row, so a seeded subject cannot drop the copy
// that holds a fix (the BAFFLE Float64 best[] fix stayed local until this row).
test('router subject lists every copy and fix M05-T08 step 1 names', { skip: PLAN_SKIP }, () => {
  const card = planCard('M05-circuit-copper.md');
  const section = card.split(/^## /m).find((s) => s.startsWith('M05-T08 '));
  assert.ok(section, 'M05-circuit-copper.md has no M05-T08 section');
  const step = section.match(/^1\. Record in lineage\.json:([\s\S]*?)(?=^\d+\. )/m);
  assert.ok(step, 'M05-T08 step 1 not found');
  const text = step[1].replace(/\s+/g, ' ');
  const files = [...new Set(text.match(/[\w-]+\.js\b/g) || [])];
  assert.ok(files.length >= 4, `M05-T08 step 1 names ${files.length} files`);
  const router = rows.filter((r) => r.id.split('/')[0] === 'router');
  for (const f of files) {
    assert.ok(router.some((r) => r.source.endsWith('/' + f)), `no router row has source ${f} (M05-T08 step 1)`);
  }
  const carried = text.match(/fixes carried: ([^(]+)\(/);
  assert.ok(carried, 'M05-T08 step 1 names no carried fixes');
  for (const fix of carried[1].split(/,| and /).map((s) => s.trim()).filter(Boolean)) {
    const [design, ...words] = fix.split(' ');
    const holder = router.find((r) => r.source.toLowerCase().includes(design.toLowerCase())
      && r.fixes.some((f) => words.every((w) => f.includes(w))));
    assert.ok(holder, `no router row from ${design} carries the ${words.join(' ')} fix (M05-T08 step 1)`);
  }
});

// Two subjects that hold the same file must agree on whether it is the most
// refined copy (D-156): a file one subject ranks below a newer copy cannot be
// the start of a port under another subject. Byte-identical files inside one
// subject (a harvest path and its original) are allowed.
test('a file that is a copy under one subject is canonical under no other subject', () => {
  const kinds = new Map();
  for (const r of rows) {
    const s = r.id.split('/')[0];
    if (!kinds.has(r.sha256)) kinds.set(r.sha256, []);
    kinds.get(r.sha256).push({ s, id: r.id, kind: r.kind });
  }
  for (const list of kinds.values()) {
    for (const c of list.filter((x) => x.kind === 'canonical')) {
      const other = list.find((x) => x.kind === 'copy' && x.s !== c.s);
      assert.ok(!other, `${c.id} is canonical but ${other?.id} names the same file a copy; port from the most refined copy (D-156)`);
    }
  }
});

test('every source is written in the publish form, never as an absolute path', () => {
  for (const r of rows) assert.ok(!r.source.startsWith('/') && publishText(r.source) === r.source, `row ${r.id} source ${r.source} is not in publish form (tools/publish-paths.mjs)`);
});

test('every sha256 matches its source when the source exists', (t) => {
  let checked = 0;
  for (const r of rows) {
    const bytes = bytesAt(sourcePath(r.source));
    if (bytes === null) { t.diagnostic(`source not on this machine, sha256 not checked: ${r.source}`); continue; }
    assert.equal(shaOf(bytes), r.sha256, `row ${r.id} sha256`);
    checked++;
  }
  t.diagnostic(`${checked} of ${rows.length} sources hashed`);
});

test('every dest exists in the repo', () => {
  // A held copy (D-286, tools/legacy/held.mjs) exists as its SHA256SUMS row.
  const sums = legacySums(root);
  for (const r of rows) if (r.dest !== null) assert.ok(bytesAt(root + r.dest) !== null || heldSha(root, r.dest, sums) !== null, `row ${r.id} dest ${r.dest} missing`);
});

// M00-T05 done-when: one canonical row per ported route. Each route file
// under packages/mesh/src/routes is the dest of a canonical row of a mesh.<route>
// subject (revolve.ts holds two: mesh.revolve and mesh.revolve-profile), so a
// route cannot land without its source, sha256 and fixes (stack.ts did).
test('every mesh route file is the dest of a canonical mesh.<route> row', () => {
  const dir = 'packages/mesh/src/routes';
  const files = readdirSync(root + dir).filter((n) => n.endsWith('.ts'));
  assert.ok(files.length >= 4, `only ${files.length} route files in ${dir}`);
  for (const name of files) {
    const route = name.replace(/\.ts$/, '');
    const dest = `${dir}/${name}`;
    const hit = rows.filter((r) => r.kind === 'canonical' && r.dest === dest
      && (r.id.split('/')[0] === `mesh.${route}` || r.id.startsWith(`mesh.${route}-`)));
    assert.ok(hit.length > 0, `${dest} is the dest of no canonical mesh.${route} row (M00-T05)`);
  }
});

// D-156: lineage lists every known copy with its sha256. Each rastermesh.js
// in the sample set originals is a healer row source, so a copy found there
// cannot sit outside the record (four did until the M00 audit).
test('every rastermesh.js under fab-knowledge/originals is a healer row', (t) => {
  const near = sourcePath(ORIGINALS_OF_RECORD);
  if (!existsSync(near)) { t.skip(`not on this machine: ${near}`); return; }
  const originals = realpathSync(near) + '/';
  const found = readdirSync(originals, { recursive: true })
    .filter((n) => n === 'rastermesh.js' || n.endsWith('/rastermesh.js'))
    .filter((n) => !n.split('/').includes('node_modules'))
    .map((n) => ({ file: originals + n, record: ORIGINALS_OF_RECORD + n }));
  assert.ok(found.length >= 4, `only ${found.length} rastermesh.js copies under ${originals}`);
  const healer = rows.filter((r) => r.id.split('/')[0] === 'healer');
  for (const { file, record } of found) {
    const row = healer.find((r) => r.source === record);
    assert.ok(row, `${record} has no healer row (D-156 every known copy)`);
    assert.equal(row.sha256, sha(file), `${row.id} sha256`);
  }
});

// The two checks below cover the 3MF writers, geom, the wasm scope, the
// stack route, the mesh audit, the flex-pair key port (D-222, D-223) and
// the SNAPFE port in packages/sim/src/fe (M01-T01), the interval fixtures
// in packages/constraints/src/fixtures (M01-T10), the M01 interval ports in
// circuit, sim and profile, the OGEE R16-P fits reference (M01-T09), and
// the M-S circuit slice and skeleton checks (M-S-T05, M-S-T06).
// The ui-core bench seeds (inlay part2.js, part3.js) and the mesh
// rastermesh seed are not yet recorded; each prefix or file joins its list
// when its row names the dest.
const SEED_SCOPE = ['packages/3mf/', 'tools/py/'];
const PORT_SCOPE = ['packages/geom/src', 'packages/3mf/src', 'packages/mesh/src/wasm.ts', 'packages/mesh/src/routes/stack.ts',
  'packages/mesh/src/audit.ts', 'reference/keys/flex-pair/build.ts', 'reference/keys/flex-pair/chase.ts', 'packages/sim/src/fe',
  'reference/keys/click-spring-window/build.ts', 'reference/keys/click-spring-window/chase.ts',
  'packages/constraints/src/fixtures', 'packages/circuit/src', 'packages/checks/src', 'packages/sim/src/constraints',
  'packages/profile/src', 'reference/fit/ogee16-r16p/build.ts', 'reference/fit/ogee16-r16p/chase.ts'];

// M-1-T09: dest is where the port or copy lands. A seed the manifest copies
// into the repo carries the sha256 of a lineage row, so one row with that
// sha256 names the copy as its dest (orca3mf.js and orca3mf.py sat at null).
test('every seed copy of a lineage file is the dest of a row with its sha256', () => {
  const manifest = JSON.parse(readFileSync(root + 'tools/seed-manifest.json', 'utf8'));
  let matched = 0;
  for (const m of manifest.filter((e) => typeof e.dest === 'string' && SEED_SCOPE.some((p) => e.dest.startsWith(p)))) {
    const same = rows.filter((r) => r.sha256 === m.sha256);
    if (same.length === 0) continue;
    matched++;
    assert.ok(same.some((r) => r.dest === m.dest),
      `${m.dest} is a copy of ${same.map((r) => r.id).join(', ')} but no row names it as dest`);
  }
  assert.ok(matched >= 2, `only ${matched} seed files match a lineage row`);
});

// A port's header cites the original it came from (cotter-src/src/geo.js,
// pip-controller/src/geom.js). The row for that original names the port as
// its dest or in a fixes line, so lineage cannot drop a port the code admits.
test('every original a port header cites records the port', () => {
  const cite = /\b((?:[\w.-]+\/)+[\w.-]+\.(?:js|py|html|scad|ino))\b/g;
  const files = PORT_SCOPE.flatMap((p) => (/\.\w+$/.test(p) ? [p]
    : readdirSync(root + p, { recursive: true }).map((n) => `${p}/${n}`)));
  let checked = 0;
  for (const file of files.filter((f) => /\.(ts|mjs|js)$/.test(f))) {
    const comments = readFileSync(root + file, 'utf8').split('\n')
      .filter((l) => /^\s*(\/\/|\*|\/\*\*?)/.test(l)).join('\n');
    for (const [, frag] of comments.matchAll(cite)) {
      const tail = '/' + frag.replace(/^x\//, '');
      const cited = rows.filter((r) => r.source.endsWith(tail));
      if (cited.length === 0) continue;
      checked++;
      assert.ok(cited.some((r) => r.dest === file || r.fixes.some((f) => f.includes(file))),
        `${file} cites ${frag} but no row for it (${cited.map((r) => r.id).join(', ')}) names ${file}`);
    }
  }
  assert.ok(checked >= 3, `only ${checked} port citations matched a lineage row`);
});

// The same rule without PORT_SCOPE's list: every runtime file of a package
// (src/, scenes/), every design and reference, and core/src. A header block
// (the leading comment lines) that calls the file a port is held to it: each
// original it cites, by path, by bare file name or through a repo legacy
// copy, must have a row naming the file as dest or in fixes, when any row
// has that original's file name, and each lineage row id it names must name
// the file. The
// ports below were found unrecorded on 2026-10-08 (audit2, fidelity lens);
// their rows land in the root lineage.json. The list must equal what the
// scan finds: a new unrecorded port fails, and so does a listed one once
// its row lands, until it leaves this list.
const UNRECORDED_2026_10_08 = [
];

export function unrecordedPorts(files, read, lineage) {
  const base = (p) => p.split('/').pop();
  const names = (f, r) => r.dest === f || r.fixes.some((x) => x.includes(f));
  const ids = new Set(lineage.map((r) => r.id));
  const cite = /(?:^|[\s(`'"])((?:[\w.-]+\/)*([\w-][\w.-]*\.(?:js|py|html|scad|ino)))\b/g;
  const rowId = /\b([a-z0-9-]+(?:\.[a-z0-9-]+)*\/[\w.-]*[\w-])/g;
  const out = new Set();
  for (const file of files) {
    const head = [];
    for (const l of read(file).split('\n')) {
      if (/^\s*(\/\/|\*|\/\*\*?)/.test(l)) head.push(l);
      else if (l.trim() === '' && head.length === 0) continue;
      else break;
    }
    const text = head.join('\n');
    if (!/\bport(?:s|ed)?\b/i.test(text)) continue;
    for (const m of text.matchAll(cite)) {
      const legacy = m[1].includes('/legacy/') ? lineage.find((r) => r.dest !== null && m[1].endsWith(r.dest)) : undefined;
      const name = legacy ? base(legacy.source) : m[2];
      const cited = lineage.filter((r) => base(r.source) === name);
      if (cited.length > 0 && !cited.some((r) => names(file, r))) out.add(`${file} cites ${name}`);
    }
    for (const m of text.matchAll(rowId)) {
      const r = ids.has(m[1]) ? lineage.find((x) => x.id === m[1]) : undefined;
      if (r && !names(file, r)) out.add(`${file} names ${r.id}`);
    }
  }
  return [...out].sort();
}

const SKIP_DIRS = new Set(['node_modules', 'dist', 'legacy', 'out', 'expected']);
function codeUnder(dir, out = []) {
  if (!existsSync(root + dir)) return out;
  for (const e of readdirSync(root + dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) codeUnder(p, out);
    else if (/\.(ts|mjs|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

test('every port header in the packages, designs, references and core records its original', () => {
  const dirs = [...readdirSync(root + 'packages').flatMap((p) => ['src', 'scenes'].map((d) => `packages/${p}/${d}`)), 'designs', 'reference', 'core/src'];
  const found = unrecordedPorts(dirs.flatMap((d) => codeUnder(d)), (f) => readFileSync(root + f, 'utf8'), rows);
  assert.deepEqual(found, [...UNRECORDED_2026_10_08].sort());
});

test('the port scan names a dropped row, a bare cite and a cited row id', () => {
  const r = (id, source, dest, fixes = []) => ({ id, source, dest, fixes, kind: 'canonical', sha256: '0' });
  const lineage = [r('a.b/one', '/o/x/collar.html', 'designs/c/build.ts'), r('a.b/two', '/o/y/part6.js', null, ['ui/hit.ts: hit test'])];
  const files = {
    'designs/c/build.ts': '// A port of collar.html lines 1 to 9.\nexport {};\n',
    'ui/hit.ts': '// Ported from part6.js (lineage a.b/two).\nexport {};\n',
    'ui/other.ts': '// A port of the slab planner (collar.html) and lineage a.b/two.\nexport {};\n',
    'ui/plain.ts': '// Reads collar.html as data.\nexport {};\n',
  };
  assert.deepEqual(unrecordedPorts(Object.keys(files), (f) => files[f], lineage), ['ui/other.ts cites collar.html', 'ui/other.ts names a.b/two']);
  // drop the row that records the port and the scan names it
  assert.deepEqual(unrecordedPorts(['designs/c/build.ts'], (f) => files[f], [r('a.b/one', '/o/x/collar.html', null)]), ['designs/c/build.ts cites collar.html']);
});

// D-156 names the COLLAR filament template as a fix the collar row carries.
// The repo template was harvested from the gold save, not ported from
// COLLAR, so the row records the claim and this check holds it: every one of
// COLLAR's static keys is in the template with its slot 0 value.
test('COLLAR FILAMENT_TEMPLATE keys equal slot 0 of the repo template', () => {
  const row = rows.find((r) => r.id === 'collar.bench/collar-7');
  assert.ok(row.fixes.some((f) => f.includes('FILAMENT_TEMPLATE')), 'collar.bench/collar-7 carries no template fix');
  const html = readFileSync(root + row.dest, 'utf8');
  assert.equal(sha(root + row.dest), row.sha256, `${row.dest} is not the collar-7 file`);
  const m = html.match(/^const FILAMENT_TEMPLATE = (\{.*\});$/m);
  assert.ok(m, `${row.dest} has no FILAMENT_TEMPLATE line`);
  const collar = JSON.parse(m[1]);
  const { keys } = JSON.parse(readFileSync(root + 'packages/3mf/data/filament_template.json', 'utf8'));
  assert.ok(Object.keys(collar).length > 0);
  for (const [k, v] of Object.entries(collar)) {
    assert.ok(k in keys, `COLLAR key ${k} missing from filament_template.json`);
    const slot0 = Array.isArray(keys[k]) ? keys[k][0] : keys[k];
    assert.deepEqual(slot0, v, `COLLAR key ${k} differs from slot 0`);
  }
  // The rest of the 127 are the keys COLLAR sets per slot in projectSettings.
  const start = html.indexOf('function projectSettings(');
  assert.ok(start > 0, `${row.dest} has no projectSettings`);
  const body = html.slice(start, html.indexOf('\n}\n', start));
  for (const k of Object.keys(keys).filter((x) => !(x in collar))) {
    assert.ok(new RegExp(`\\b${k}\\s*:`).test(body), `template key ${k} is neither static nor set in COLLAR projectSettings`);
  }
});

function tables(md) {
  const out = [];
  let cur = null;
  for (const line of md.split('\n')) {
    if (!line.startsWith('|')) { cur = null; continue; }
    const cells = line.slice(1, line.endsWith('|') ? -1 : undefined).split('|').map((c) => c.trim());
    if (!cur) { cur = { head: cells, rows: [] }; out.push(cur); continue; }
    if (cells.every((c) => /^-+$/.test(c))) continue;
    cur.rows.push(cells);
  }
  return out;
}

const unquote = (c) => c.replace(/^`(.*)`$/, '$1');

test('README lineage tables equal the rows', () => {
  for (const [subject, readme] of Object.entries(MIRRORS)) {
    const md = readFileSync(root + readme, 'utf8');
    const table = tables(md).find((t) => t.head.join(',') === FIELDS.join(','));
    assert.ok(table, `${readme} has no lineage table with columns ${FIELDS.join(', ')}`);
    const fromReadme = table.rows.map((c) => ({
      id: c[0],
      kind: c[1],
      source: unquote(c[2]),
      sha256: c[3],
      fixes: c[4] === '[]' ? [] : c[4].split('; '),
      dest: c[5] === 'null' ? null : unquote(c[5]),
    }));
    const want = rows.filter((r) => r.id.split('/')[0] === subject);
    assert.deepEqual(fromReadme, want, `${readme} lineage table differs from lineage.json`);
  }
});

test('mesh seed fixture scripts match the sha256 in the README', () => {
  const dir = root + 'packages/mesh/seed/';
  const md = readFileSync(dir + 'README.md', 'utf8');
  const table = tables(md).find((t) => t.head[0] === 'file' && t.head[1] === 'sha256');
  assert.ok(table, 'packages/mesh/seed/README.md has no fixture table');
  assert.ok(table.rows.length > 0);
  for (const c of table.rows) assert.equal(sha(dir + unquote(c[0])), c[1], `${c[0]} sha256`);
});

// M07-T15 step 4 (D-156): every kernel the step names has a lineage row
// whose dest is the file it was ported to (or, for the cutfiles.py
// stitching, the oracle that runs it in place), under the subject of its
// canonical original, and that file names the kernel. The kernel names are
// read from the card, so a kernel added to the step without a row fails,
// and a row whose dest moves fails.
const M07_PORTS = {
  nest: ['slug.nest', 'packages/nest/src/shelf.ts', 'nest()'],
  packOne: ['ogee16.packone', 'packages/nest/src/maxrects.ts', 'packOne'],
  autoGap: ['ogee16.autogap', 'packages/nest/src/autogap.ts', 'autoGap'],
  'cutfiles.py': ['ogee16.cutfiles', 'packages/nest/src/profile.ts', 'compensate()'],
  'cutfiles.py stitching': ['ogee16.cutfiles', 'designs/ogee16/legacy/tools/connect-record.py', 'rings_from_dxf'],
  'cutfiles.py connectivity': ['ogee16.cutfiles', 'packages/nest/src/connect.ts', 'check_connected()'],
  nestOnce: ['gusset.bench', 'packages/nest/src/maxrects.ts', 'nestOnce'],
  laserDXF: ['cotter.kit', 'packages/nest/src/dxf.ts', 'laserDXF'],
  'audit_dxf.py': ['cotter.audit-dxf', 'tools/py/audit_dxf.py', 'audit_dxf.py'],
  fitArcs: ['sketch.bench', 'packages/nest/src/arcs.ts', 'fitArcs'],
  wholeCircle: ['sketch.bench', 'packages/nest/src/arcs.ts', 'wholeCircle'],
  'kin_block.js': ['ogee16.kin-block', 'packages/motion/src/kinematics/ogee.ts', 'kin_block.js'],
  'DERRICK FK': ['derrick.build', 'packages/motion/src/kinematics/derrick.ts', 'arm_build.py'],
  'DAVIT chain': ['davit.chain', 'packages/motion/src/kinematics/davit.ts', 'chain()'],
  planSpeeds: ['detent.plot', 'packages/motion/src/planners/detent-steps.ts', 'planSpeeds'],
  solveH: ['detent.plot', 'packages/motion/src/calibrate.ts', 'solveH'],
  planChainPen: ['washer.app', 'packages/motion/src/planners/washer-mm.ts', 'planChainPen'],
};

test('every kernel M07-T15 step 4 names has a row whose dest is its port', { skip: PLAN_SKIP }, () => {
  const card = planCard('M07-motion-nest.md');
  const section = card.split(/^## /m).find((s) => s.startsWith('M07-T15 '));
  assert.ok(section, 'M07-motion-nest.md has no M07-T15 section');
  const step = section.match(/^4\. lineage\.json rows for every kernel ported:([\s\S]*?)(?=^\d+\. )/m);
  assert.ok(step, 'M07-T15 step 4 not found');
  const text = step[1].replace(/\s+/g, ' ');
  const named = [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  for (const bare of ['DERRICK FK', 'DAVIT chain']) if (text.includes(bare)) named.push(bare);
  assert.ok(named.length >= 15, `step 4 names ${named.length} kernels`);
  for (const k of named) assert.ok(M07_PORTS[k], `step 4 names ${k}, which has no entry in M07_PORTS`);
  for (const k of Object.keys(M07_PORTS)) {
    const base = k.split(' ')[0];
    assert.ok(named.includes(k) || named.includes(base), `M07_PORTS entry ${k} is not named by step 4`);
  }
  for (const [k, [subject, dest, cite]] of Object.entries(M07_PORTS)) {
    const row = rows.find((r) => r.id.split('/')[0] === subject && r.dest === dest);
    assert.ok(row, `${k}: no ${subject} row has dest ${dest}`);
    assert.ok(rows.some((r) => r.id.split('/')[0] === subject && r.kind === 'canonical'), `${k}: subject ${subject} has no canonical row`);
    assert.ok(readFileSync(root + dest, 'utf8').includes(cite), `${k}: ${dest} does not name ${cite}`);
  }
});

// M05-T17 step 2 (D-156): every group the step names (router, nodal
// solver, read models, vinyl helpers, ladder and weedability) has rows for
// each original it names, and each row names the file the original was
// ported to as dest or in fixes; that file cites the original. Groups and
// their originals are read from the card, so a group or original added to
// the step without an entry here fails, and a row that drops its port
// fails.
const GEN = ['keyway', 'quadrant', 'spline', 'tessera', 'vernier', 'fret', 'stave'];
const M05_PORTS = {
  router: {
    'PIP canonical': [['router', 'pip-controller/src/router.js', 'packages/copper/src/route/negotiated.ts', 'router.js']],
    TOGGLE: [['router', 'toggle/files/src/src/part2c.js', 'packages/copper/src/route/manhattan.ts', 'part2c.js'],
      ['toggle.build', 'toggle/files/src/src/part2d.js', 'packages/copper/src/route/search.ts', 'part2d.js']],
    BOSS: [['router', 'boss-src/src/boss.js', 'designs/blocks/src/route-seat.ts', 'src/boss.js']],
    'BAFFLE copies': [['router', 'baffle-bench-src/part2.js', 'packages/copper/src/route/manhattan.ts', 'BAFFLE']],
  },
  'nodal solver': {
    'BOSS sim.js': [['blocks.sim', 'blocks/files/src-extracted/sim.js', 'packages/circuit/src/dc/nodal.ts', 'sim.js']],
  },
  'read models': {
    'PIP model.js': [['pip.model', 'pip-controller/src/model.js', 'packages/circuit/src/read/charge-release.ts', 'model.js']],
  },
  'vinyl helpers': {
    'KEYWAY family svgpath.py': [['svgpath', 'keyway/files/svgpath.py', 'packages/copper/src/vinyl/svgpath.ts', 'svgpath.py']],
    'gen_*.py': [
      ...GEN.map((g) => [`${g}.generator`, `${g}/files/gen_${g}.py`, 'packages/copper/src/vinyl/draft.ts', 'gen_keyway.py']),
      ['keyway.generator', 'keyway/files/gen_keyway.py', 'packages/copper/src/vinyl/helpers.ts', 'gen_keyway.py'],
      ['quadrant.generator', 'quadrant/files/gen_quadrant.py', 'packages/copper/src/vinyl/lanes.ts', 'gen_quadrant.py'],
    ],
  },
  'ladder and weedability': {
    'SPLICE rev C': [['splice.readme', 'splice/files/README-trunnion.md', 'packages/copper/src/vinyl/ladder.ts', 'SPLICE rev C'],
      ['splice.readme', 'splice/files/README-trunnion.md', 'packages/copper/src/vinyl/weed.ts', 'SPLICE rev C']],
  },
};

export function m05StepGroups(card) {
  const section = card.split(/^## /m).find((s) => s.startsWith('M05-T17 '));
  if (!section) return null;
  const step = section.match(/^2\. lineage\.json rows:([\s\S]*?)(?=^\d+\. )/m);
  if (!step) return null;
  const text = step[1].replace(/\s+/g, ' ');
  return Object.fromEntries([...text.matchAll(/([a-z][a-z ]*?) \(([^)]*)\)/g)]
    .map((m) => [m[1].trim(), m[2].split(/, | and (?=gen_)/).map((s) => s.trim())]));
}

test('every port M05-T17 step 2 names has a row naming the file it landed in', { skip: PLAN_SKIP }, () => {
  const groups = m05StepGroups(planCard('M05-circuit-copper.md'));
  assert.ok(groups, 'M05-T17 step 2 not found');
  assert.deepEqual(Object.keys(groups).sort(), Object.keys(M05_PORTS).sort(), 'step 2 groups differ from M05_PORTS');
  for (const [group, originals] of Object.entries(groups)) {
    assert.deepEqual([...originals].sort(), Object.keys(M05_PORTS[group]).sort(), `step 2 ${group} originals differ from M05_PORTS`);
  }
  for (const [group, byOriginal] of Object.entries(M05_PORTS)) {
    for (const [original, needs] of Object.entries(byOriginal)) {
      for (const [subject, source, file, cite] of needs) {
        const row = rows.find((r) => r.id.split('/')[0] === subject && r.source.endsWith(source)
          && (r.dest === file || r.fixes.some((f) => f.includes(file))));
        assert.ok(row, `${group} ${original}: no ${subject} row from ${source} names ${file}`);
        assert.ok(rows.some((r) => r.id.split('/')[0] === subject && r.kind === 'canonical'), `${group}: subject ${subject} has no canonical row`);
        assert.ok(readFileSync(root + file, 'utf8').includes(cite), `${group} ${original}: ${file} does not cite ${cite}`);
      }
    }
  }
});

// Every proven archetype and typed mechanism is a port (D-222); its lineage row names the file it
// landed in as dest (lineage.schema.json: "repo path where the port or copy lands"), never only in fixes prose.
// Def files are read as text so the check needs no build.
const CANON = { 'packages/archetypes': 'proven', 'packages/mechanisms': 'typed' };

/** Each def file of a canon package at the port status, with the sha256 of every original it names. */
export function portedDefs() {
  const out = [];
  for (const [pkg, status] of Object.entries(CANON)) {
    const dir = `${pkg}/src/defs`;
    for (const f of readdirSync(root + dir).filter((n) => n.endsWith('.ts')).sort()) {
      const text = readFileSync(`${root}${dir}/${f}`, 'utf8');
      if (!new RegExp(`\\bstatus: "${status}"`).test(text)) continue;
      const original = text.slice(text.indexOf('original: ['));
      const shas = [...original.slice(0, original.indexOf('\n  ]')).matchAll(/sha256: "([0-9a-f]{64})"/g)].map((m) => m[1]);
      out.push({ pkg, file: `${dir}/${f}`, shas });
    }
  }
  return out;
}

test('every proven archetype and typed mechanism has a lineage row whose dest lies in its package', () => {
  const defs = portedDefs();
  // 11 proven and 19 typed (computed, M06 registry at the audit of 2026-10-11)
  assert.ok(defs.length >= 30, `ported defs found: ${defs.length}`);
  const missing = [];
  for (const d of defs) {
    assert.ok(d.shas.length > 0, `${d.file} names no original sha256`);
    const hit = rows.some((r) => d.shas.includes(r.sha256) && typeof r.dest === 'string' && r.dest.startsWith(`${d.pkg}/`) && existsSync(root + r.dest));
    if (!hit) missing.push(d.file);
  }
  assert.deepEqual(missing, []);
});

// M10-T01 acceptance (D-222, D-156): for each design of the M10 card's
// "Original UX of record" table, the canonical lineage row is the file
// knowledge/designs/INDEX.md names for that design's record slug: its
// source is originals/<slug>/files/<file>, its sha256 is the INDEX sha256,
// and its dest is a repo copy with those bytes. The eight slugs are read
// from the card, the file and sha256 from INDEX.md.
export function uxOfRecordSlugs(card) {
  const section = card.split(/^## /m).find((s) => s.startsWith('Original UX of record'));
  if (!section) return null;
  return [...section.matchAll(/^\| [A-Z]+ \| `knowledge\/designs\/([a-z0-9-]+)\.md`/gm)].map((m) => m[1]);
}

export function indexCanonical(index, slug) {
  const row = index.split('\n').find((l) => l.startsWith(`| **${slug}** |`));
  if (!row) return null;
  const file = row.match(/file `files\/([^`]+)`/);
  const hash = row.match(/\| `([0-9a-f]{64})` \|/);
  return file && hash ? { file: file[1], sha256: hash[1] } : null;
}

test('each M10 design has a canonical row at its INDEX.md original, copied into the repo (M10-T01)', { skip: PLAN_SKIP }, () => {
  const slugs = uxOfRecordSlugs(planCard('M10-chase.md'));
  assert.ok(slugs, 'M10-chase.md has no "Original UX of record" section');
  assert.equal(slugs.length, 8, `the UX of record table names ${slugs.length} designs: ${slugs.join(', ')}`);
  const index = readFileSync(root + 'knowledge/designs/INDEX.md', 'utf8');
  for (const slug of slugs) {
    const want = indexCanonical(index, slug);
    assert.ok(want, `knowledge/designs/INDEX.md has no file and sha256 for ${slug}`);
    const row = rows.find((r) => r.kind === 'canonical' && r.source === `${ORIGINALS_OF_RECORD}${slug}/files/${want.file}`);
    assert.ok(row, `${slug}: no canonical lineage row has source originals/${slug}/files/${want.file}`);
    assert.equal(row.sha256, want.sha256, `${row.id} sha256 differs from INDEX.md ${slug}`);
    const copy = row.dest === null ? null : bytesAt(root + row.dest);
    const held = row.dest === null ? null : heldSha(root, row.dest);
    assert.ok(copy !== null || held !== null, `${row.id} points at no repo copy (dest ${row.dest})`);
    if (copy !== null) assert.equal(shaOf(copy), want.sha256, `${row.id} dest ${row.dest} is not the original's bytes`);
    else assert.ok(held.length >= 12 && want.sha256.startsWith(held), `${row.id} held dest ${row.dest} records ${held}, not the original's sha256`);
  }
});

test('the M10 slug and INDEX readers name what they read', () => {
  const card = '## Original UX of record\n\n| design | record |\n|---|---|\n| KNURL | `knowledge/designs/knurl.md` section 6 |\n| PIP | `knowledge/designs/pip.md` section 6 |\n\n## Next\n| X | `knowledge/designs/x.md` |\n';
  assert.deepEqual(uxOfRecordSlugs(card), ['knurl', 'pip']);
  const index = `| **pip** | haft (9).html; file \`files/haft.html\` | \`${'a'.repeat(64)}\` | x |\n`;
  assert.deepEqual(indexCanonical(index, 'pip'), { file: 'haft.html', sha256: 'a'.repeat(64) });
  assert.equal(indexCanonical(index, 'knurl'), null);
});
