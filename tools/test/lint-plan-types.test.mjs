import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scanText, specExports } from '../lint-plan-types.mjs';


// every temp folder this file makes is removed when the file's tests end
const TEMPS = [];
const keep = (d) => {
  TEMPS.push(d);
  return d;
};
after(() => {
  for (const d of TEMPS) fs.rmSync(d, { recursive: true, force: true });
});
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = path.join(repo, 'tools/lint-plan-types.mjs');
const FENCE = '`'.repeat(3);

function scratch(docs) {
  const dir = keep(fs.mkdtempSync(path.join(os.tmpdir(), 'hbf-plan-types-')));
  for (const [name, text] of Object.entries(docs)) fs.writeFileSync(path.join(dir, name), text);
  return dir;
}

const run = (dir, ...flags) => {
  const report = path.join(dir, 'report.txt');
  const r = spawnSync(process.execPath, [script, ...flags, '--report', report, dir], { encoding: 'utf8' });
  return { ...r, report: fs.existsSync(report) ? fs.readFileSync(report, 'utf8') : null };
};

const restating = [
  '# checks',
  '',
  FENCE + 'ts',
  'export interface CheckResult {',
  '  id: string;',
  '}',
  FENCE,
  '',
].join('\n');

const linking = [
  '# checks',
  '',
  'A check returns `spec/checks.ts` (`CheckResult`).',
  '',
  FENCE + 'ts',
  'const r: CheckResult = run(part);',
  FENCE,
  '',
].join('\n');

test('spec exports include CheckResult from checks.ts', () => {
  assert.equal(specExports(path.join(repo, 'spec')).get('CheckResult'), 'checks.ts');
});

test('a doc restating CheckResult fails and names file, line, name and spec file', () => {
  const dir = scratch({ 'restate.md': restating });
  const r = run(dir);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /restate\.md:4 CheckResult spec\/checks\.ts/);
  assert.match(r.report, /restate\.md:4 CheckResult spec\/checks\.ts/);
});

test('warn mode exits 0 and still writes the hit list', () => {
  const dir = scratch({ 'restate.md': restating });
  const r = run(dir, '--warn');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.report, /CheckResult spec\/checks\.ts/);
});

test('a doc linking to spec/checks.ts passes', () => {
  const dir = scratch({ 'link.md': linking });
  const r = run(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.report, /link\.md:/);
});

test('the three declaration forms hit inside a fence and not outside it', () => {
  const names = new Map([['Net', 'circuit.ts'], ['Fix', 'checks.ts'], ['Part', 'part-ir.ts']]);
  const text = [
    'type Net = { id: string }',
    FENCE,
    'type Net = { id: string }',
    'interface Fix<T> extends Base {',
    'Part {',
    'type Other = Net;',
    'const p: Part = make();',
    FENCE,
    'interface Fix {',
  ].join('\n');
  assert.deepEqual(scanText(text, names), [
    { line: 3, name: 'Net' },
    { line: 4, name: 'Fix' },
    { line: 5, name: 'Part' },
  ]);
});

test('a longer outer fence holds a shorter inner fence line', () => {
  const names = new Map([['Net', 'circuit.ts']]);
  const text = ['````md', FENCE, 'type Net = {}', FENCE, '````', 'type Net = {}'].join('\n');
  assert.deepEqual(scanText(text, names), [{ line: 3, name: 'Net' }]);
});

test('an unknown flag exits 2', () => {
  const r = spawnSync(process.execPath, [script, '--nope'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
});

test('the committed tools/reports/plan-types.txt equals a fresh run over the plan docs', () => {
  const dir = keep(fs.mkdtempSync(path.join(os.tmpdir(), 'hbf-plan-types-')));
  const report = path.join(dir, 'report.txt');
  const r = spawnSync(process.execPath, [script, '--warn', '--report', report], { cwd: repo, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(repo, 'tools/reports/plan-types.txt'), 'utf8'), fs.readFileSync(report, 'utf8'));
});
