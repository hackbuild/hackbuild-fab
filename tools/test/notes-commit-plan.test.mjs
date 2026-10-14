// Proposed commit subjects in the milestone reports under .hbf-notes must pass the real
// commit-msg hook, so a proposal the hook would refuse (m-s-report proposal 23 was exactly
// 60 characters) cannot sit in a report until commit time. Added by the implementation audit
// of 2026-10-06. The notes directory is gitignored, so the test skips where it is absent.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";


// every temp folder this file makes is removed when the file's tests end
const TEMPS = [];
const keep = (d) => {
  TEMPS.push(d);
  return d;
};
after(() => {
  for (const d of TEMPS) rmSync(d, { recursive: true, force: true });
});
const root = join(import.meta.dirname, "..", "..");
const notes = join(root, ".hbf-notes");
const hook = join(root, ".githooks", "commit-msg");
const present = existsSync(notes);

/** Rows shaped `| <n> | \`<subject>\` | ... |` from every report in .hbf-notes. */
function proposals() {
  const out = [];
  for (const f of readdirSync(notes).filter((n) => n.endsWith(".md")).sort()) {
    for (const line of readFileSync(join(notes, f), "utf8").split("\n")) {
      const m = line.match(/^\| (\d+) \| `([^`]+)` \|/);
      if (m) out.push({ file: f, n: Number(m[1]), subject: m[2] });
    }
  }
  return out;
}

test("every proposed commit subject in .hbf-notes passes the commit-msg hook", { skip: !present && ".hbf-notes absent" }, () => {
  const rows = proposals();
  assert.ok(rows.length >= 39, `found ${rows.length} proposals, expected at least 39`);
  const dir = keep(mkdtempSync(join(tmpdir(), "notes-commit-plan-")));
  const refused = [];
  for (const { file, n, subject } of rows) {
    const msg = join(dir, `${file}-${n}.txt`);
    writeFileSync(msg, `${subject}\n`);
    const r = spawnSync("sh", [hook, msg], { cwd: root, encoding: "utf8" });
    if (r.status !== 0) refused.push(`${file} #${n} (${subject.length} chars): ${r.stderr.trim()}`);
  }
  assert.deepEqual(refused, [], "proposals the hook refuses");
});

test("proposal numbers run 1..N with no gap or repeat across the reports", { skip: !present && ".hbf-notes absent" }, () => {
  const ns = proposals().map((p) => p.n).sort((a, b) => a - b);
  assert.deepEqual(ns, ns.map((_, i) => i + 1));
});
