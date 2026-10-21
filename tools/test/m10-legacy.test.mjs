// M10-T01 (D-142, D-156, D-222): the legacy folders of the M10 designs. The
// folder list is read from the card's "Files to create" line and the hashes
// from its "Legacy inputs and their hashes" table, so a folder or an input
// added to the card without its copy fails here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planCard, planSkip } from '../test-support/plan-root.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const { heldList } = await import(new URL('../legacy/held.mjs', import.meta.url).href);
const { isStored, readStored, storedEntries, writeStored } = await import(new URL('../legacy/stored-zip.mjs', import.meta.url).href);
// The plan cards come from the plan archive (tools/test-support/plan-root.mjs); a test that
// reads them skips as not run on a runner without it.
const SKIP = planSkip();
const card = SKIP === false ? planCard('M10-chase.md') : '';
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

/** The design folders of the M10-T01 "Files to create" brace list. */
export function legacyFolders(text) {
  const section = text.split(/^## /m).find((s) => s.startsWith('M10-T01 '));
  const m = section?.match(/^- designs\/\{([a-z0-9,-]+)\}\/legacy\/ \(files above\) and each SHA256SUMS$/m);
  return m ? m[1].split(',') : null;
}

/** Rows of the "Legacy inputs and their hashes" table: design, input cell, sha256, bytes. */
export function legacyInputs(text) {
  const section = text.split(/^## /m).find((s) => s.startsWith('Legacy inputs and their hashes'));
  if (!section) return null;
  return [...section.matchAll(/^\| ([^|]+) \| (.+) \| ([0-9a-f]{64}) \| (\d+) \|$/gm)]
    .map((m) => ({ design: m[1].trim(), input: m[2].trim(), sha256: m[3], bytes: Number(m[4]) }));
}

/** SHA256SUMS lines as [sha256, path relative to the folder]. */
const sums = (dir) => readFileSync(path.join(dir, 'SHA256SUMS'), 'utf8').split('\n').filter(Boolean)
  .map((l) => { const m = l.match(/^([0-9a-f]{64}) {2}(.+)$/); assert.ok(m, `${dir}/SHA256SUMS line "${l}"`); return [m[1], m[2]]; });

const folders = legacyFolders(card);
// Copies held out of git (D-286) are absent on hosted runners; the byte checks then report not run.
const absent = (folders ?? []).flatMap((d) => sums(path.join(root, 'designs', d, 'legacy')).map(([, rel]) => `designs/${d}/legacy/${rel}`)).filter((f) => !existsSync(path.join(root, f)));
const heldNote = `not run: ${absent.length} legacy copies held out of git (D-286) are absent`;

test('the card names ten legacy folders, each with a lineage README and a SHA256SUMS that verifies', { skip: SKIP }, (t) => {
  assert.ok(folders, 'M10-T01 "Files to create" names no designs/{...}/legacy/ list');
  assert.equal(folders.length, 10, folders.join(', '));
  for (const d of folders) {
    const dir = path.join(root, 'designs', d, 'legacy');
    assert.ok(existsSync(path.join(dir, 'README.md')), `designs/${d}/legacy/README.md missing`);
    const lines = sums(dir);
    assert.ok(lines.length > 0, `designs/${d}/legacy/SHA256SUMS is empty`);
    for (const [want, rel] of lines) if (existsSync(path.join(dir, rel))) assert.equal(sha(path.join(dir, rel)), want, `designs/${d}/legacy/${rel}`);
  }
  // An absent copy must be one the .gitignore held block names, never a lost file.
  const held = new Set(heldList(root));
  assert.deepEqual(absent.filter((f) => !held.has(f)), [], 'absent legacy copies the held block does not name');
  if (absent.length > 0) t.diagnostic(heldNote);
});

test('every input of the hashes table is in a legacy folder with its sha256 and size', { skip: SKIP }, (t) => {
  if (absent.length > 0) { t.skip(heldNote); return; }
  const rows = legacyInputs(card);
  assert.ok(rows && rows.length >= 40, `hashes table rows: ${rows?.length}`);
  const have = new Map();
  const add = (file) => have.set(sha(file), statSync(file).size);
  for (const d of folders) {
    const dir = path.join(root, 'designs', d, 'legacy');
    for (const [, rel] of sums(dir)) {
      add(path.join(dir, rel));
      // A page kept as a stored zip member (tools/legacy/stored-zip.mjs) counts by the member's bytes.
      if (rel.endsWith('.zip')) {
        let members = null;
        try { members = readStored(readFileSync(path.join(dir, rel))); } catch { members = null; }
        for (const data of members?.values() ?? []) have.set(createHash('sha256').update(data).digest('hex'), data.length);
      }
    }
  }
  // KEYWAY's generator inputs stay where M05-T13 put them (M10-T01 step 1).
  const keyway = path.join(root, 'reference/copper/keyway/legacy');
  for (const f of readdirSync(keyway)) add(path.join(keyway, f));
  // The PIP replica bar is a hackbuild-ui page M10-T14 reads in place; M10-T01 copies no file for it.
  const copied = rows.filter((r) => !r.input.startsWith('`hackbuild-ui/'));
  assert.equal(rows.length - copied.length, 1, 'one row (the PIP replica bar) is read in place');
  for (const r of copied) {
    assert.ok(have.has(r.sha256), `${r.design} ${r.input}: no legacy copy with sha256 ${r.sha256}`);
    assert.equal(have.get(r.sha256), r.bytes, `${r.design} ${r.input}: size`);
  }
});

test('no file under designs/ names the quarantined mockups (D-222)', () => {
  const needle = Buffer.from('fab-knowledge/mockups');
  const hits = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (readFileSync(p).includes(needle)) hits.push(path.relative(root, p));
    }
  };
  walk(path.join(root, 'designs'));
  assert.deepEqual(hits, []);
});

test('every stored zip in the legacy folders rebuilds byte for byte from its members', { skip: SKIP }, (t) => {
  if (absent.length > 0) { t.skip(heldNote); return; }
  let n = 0;
  for (const d of folders) {
    const dir = path.join(root, 'designs', d, 'legacy');
    for (const [, rel] of sums(dir).filter(([, r]) => r.endsWith('.zip'))) {
      const buf = readFileSync(path.join(dir, rel));
      if (!isStored(buf)) continue;
      n++;
      assert.ok(writeStored(storedEntries(buf)).equals(buf), `designs/${d}/legacy/${rel} does not rebuild from its members`);
    }
  }
  assert.ok(n >= 3, `stored zips found: ${n}`);
});

test('the card readers name what they read', () => {
  const text = '## M10-T01 Legacy\n\nFiles to create:\n- designs/{a,b-c}/legacy/ (files above) and each SHA256SUMS\n\n## Legacy inputs and their hashes\n\n| design | input | sha256 | size |\n|---|---|---|---|\n'
    + `| KNURL | \`x/knurl.html\` | ${'b'.repeat(64)} | 12 |\n\n## Next\n| Y | \`y\` | ${'c'.repeat(64)} | 3 |\n`;
  assert.deepEqual(legacyFolders(text), ['a', 'b-c']);
  assert.deepEqual(legacyInputs(text), [{ design: 'KNURL', input: '`x/knurl.html`', sha256: 'b'.repeat(64), bytes: 12 }]);
  assert.equal(legacyFolders('## M10-T02 x\n- designs/{a}/legacy/ (files above) and each SHA256SUMS\n'), null);
});
