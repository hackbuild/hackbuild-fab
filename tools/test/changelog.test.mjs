// R1-rails-public-17: CHANGELOG.md keeps the Keep a Changelog form. The top
// section is Unreleased; below it one entry per milestone, newest first,
// whose id and name come from the docs/plan/MILESTONES.md 1.1 table (M-1 to
// M10) and whose date is the date git records for the commit the entry
// cites. Without that commit in the clone (a shallow checkout) the date
// test skips with its reason, which counts as not run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const text = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
const lines = text.split('\n');

const KINDS = new Set(['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security']);
const ENTRY = /^## \[(M-1|M-S|M\d\d)\] (.+), (\d{4}-\d{2}-\d{2})$/;

function sections() {
  const out = [];
  for (const [i, line] of lines.entries()) {
    if (line.startsWith('## ')) out.push({ heading: line, line: i + 1, body: [] });
    else if (out.length > 0) out.at(-1).body.push(line);
  }
  return out;
}

function milestoneRows() {
  const md = readFileSync(join(root, 'docs/plan/MILESTONES.md'), 'utf8');
  const start = md.indexOf('### 1.1 The table');
  const end = md.indexOf('### 1.2', start);
  assert.ok(start >= 0 && end > start, 'MILESTONES.md has no 1.1 table');
  const rows = [];
  for (const line of md.slice(start, end).split('\n')) {
    const m = /^\| (M-1|M-S|M\d\d) \| ([^|]+?) \|/.exec(line);
    if (m) rows.push({ id: m[1], name: m[2] });
  }
  const last = rows.findIndex((r) => r.id === 'M10');
  assert.ok(last >= 0, 'MILESTONES.md 1.1 has no M10 row');
  return rows.slice(0, last + 1);
}

test('the top section is Unreleased', () => {
  const all = sections();
  assert.ok(all.length > 0, 'CHANGELOG.md has no ## section');
  assert.equal(all[0].heading, '## [Unreleased]');
  assert.equal(all.filter((s) => s.heading === '## [Unreleased]').length, 1, 'one Unreleased section');
});

test('every heading below Unreleased names a milestone and a date', () => {
  for (const s of sections().slice(1)) {
    const m = ENTRY.exec(s.heading);
    assert.ok(m, `line ${s.line}: "${s.heading}" is not "## [id] name, yyyy-mm-dd"`);
    const d = new Date(`${m[3]}T00:00:00Z`);
    assert.equal(d.toISOString().slice(0, 10), m[3], `line ${s.line}: ${m[3]} is not a calendar date`);
  }
});

test('entries are the MILESTONES.md rows M-1 to M10, newest first, dates not rising', () => {
  const entries = sections().slice(1).map((s) => ENTRY.exec(s.heading)).filter(Boolean);
  const want = milestoneRows().reverse();
  assert.deepEqual(entries.map((m) => m[1]), want.map((r) => r.id));
  assert.deepEqual(entries.map((m) => m[2]), want.map((r) => r.name));
  for (let i = 1; i < entries.length; i++) {
    assert.ok(entries[i][3] <= entries[i - 1][3], `${entries[i][1]} ${entries[i][3]} is later than ${entries[i - 1][1]} ${entries[i - 1][3]}`);
  }
});

test('subsections use the Keep a Changelog change types', () => {
  for (const [i, line] of lines.entries()) {
    const m = /^### (.+)$/.exec(line);
    if (m) assert.ok(KINDS.has(m[1]), `line ${i + 1}: "${m[1]}" is not a Keep a Changelog type`);
  }
});

const cited = sections().slice(1).map((s) => {
  const m = ENTRY.exec(s.heading);
  const c = s.body.map((l) => /^Commit: ([0-9a-f]{7,40})$/.exec(l)).find(Boolean);
  return { id: m?.[1], date: m?.[3], sha: c?.[1] };
});
const git = (...args) => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
const missing = cited.filter((e) => e.sha && git('cat-file', '-e', `${e.sha}^{commit}`).status !== 0);
const skip = missing.length > 0 ? `commits ${missing.map((e) => e.sha).join(', ')} are not in this clone` : false;

test('every milestone entry cites one commit', () => {
  for (const e of cited) assert.ok(e.sha, `${e.id} has no "Commit: <sha>" line`);
});

test('each entry date is the author date of the commit it cites', { skip }, () => {
  for (const e of cited) {
    const r = git('log', '-1', '--format=%ad', '--date=short', e.sha);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), e.date, `${e.id} cites ${e.sha}`);
  }
});
