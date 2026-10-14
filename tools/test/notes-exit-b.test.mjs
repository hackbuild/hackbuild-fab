// The owner steps in the milestone reports (.hbf-notes) must agree with the generated print card
// in reference/keys/flex-pair/README.md, and a report must not keep calling a test 'Not fixed'
// once the line that runs it passes. Added by the implementation audit of 2026-10-06: after the
// PIP-faithful rebuild (D-223) m-s-report.md still sent the owner to a 178600 byte file with
// three filaments, and m-1-report.md still said the lint-voice T03 test was not fixed and the
// machine exit was not green with no later update. The notes directory is gitignored, so each
// test skips where its file is absent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const notes = join(root, ".hbf-notes");
const readme = join(root, "reference", "keys", "flex-pair", "README.md");

const reports = () =>
  existsSync(notes)
    ? readdirSync(notes)
        .filter((n) => n.endsWith("-report.md"))
        .sort()
        .map((n) => ({ name: n, text: readFileSync(join(notes, n), "utf8") }))
    : [];

/** Text from `## <prefix>` to the next `## `, or "" when absent. */
function section(md, prefix) {
  const start = md.indexOf(`\n## ${prefix}`);
  if (start < 0) return "";
  const next = md.indexOf("\n## ", start + 4);
  return md.slice(start, next < 0 ? undefined : next);
}

/** sha256 and slot count the generated print card gives. */
function printCard() {
  const card = section(readFileSync(readme, "utf8"), "Print card");
  assert.ok(card, "README has a Print card section");
  const file = card.match(/^- file: \S+, (\d+) bytes, sha256 ([0-9a-f]{64})$/m);
  assert.ok(file, "print card names the file bytes and sha256");
  const slots = card.split("\n").filter((l) => /^\| \d+ \|/.test(l)).length;
  assert.ok(slots > 0, "print card has a slot table");
  return { bytes: Number(file[1]), sha256: file[2], slots };
}

/** An Exit B section that opens with 'Superseded by' keeps its history; the banner must point at the print card. */
const superseded = (sec) => /^Superseded by D-\d+:/.test(sec.split("\n").slice(2).find((l) => l.trim()) ?? "");

test("Exit B owner steps name the print card sha256 and slot count, or carry a superseded banner", { skip: (!existsSync(notes) || !existsSync(readme)) && ".hbf-notes or the flex-pair README absent" }, () => {
  const card = printCard();
  const bad = [];
  for (const { name, text } of reports()) {
    {
      const sec = section(text, "Exit B, owner steps");
      if (!sec) continue;
      if (superseded(sec)) {
        if (!/README\.md, section\s+"Print card"/.test(sec)) bad.push(`${name}: superseded banner does not point at the README print card`);
        continue;
      }
      for (const [sha] of sec.matchAll(/\b[0-9a-f]{64}\b/g)) {
        if (sha !== card.sha256) bad.push(`${name}: Exit B names sha256 ${sha.slice(0, 8)}... but the print card gives ${card.sha256.slice(0, 8)}...`);
      }
      for (const m of sec.matchAll(/filaments on slots 1 to (\d+)/g)) {
        if (Number(m[1]) !== card.slots) bad.push(`${name}: Exit B says slots 1 to ${m[1]} but the print card has ${card.slots} slots`);
      }
    }
  }
  assert.deepEqual(bad, []);
});

test("a superseded Exit B keeps no unmarked step that contradicts the print card slot count", { skip: (!existsSync(notes) || !existsSync(readme)) && ".hbf-notes or the flex-pair README absent" }, () => {
  const card = printCard();
  const bad = [];
  for (const { name, text } of reports()) {
    const sec = section(text, "Exit B, owner steps");
    if (!sec || !superseded(sec)) continue;
    for (const line of sec.split("\n")) {
      for (const m of line.matchAll(/filaments on slots 1 to (\d+)/g)) {
        if (Number(m[1]) !== card.slots && !/superseded by D-\d+/i.test(line)) bad.push(`${name}: step '${line.slice(0, 60)}' gives slots 1 to ${m[1]} with no superseded note`);
      }
    }
  }
  assert.deepEqual(bad, []);
});

test("m-1-report does not call the lint-voice T03 test unfixed while lint-voice passes", { skip: !existsSync(join(notes, "m-1-report.md")) && "m-1-report.md absent" }, () => {
  const text = readFileSync(join(notes, "m-1-report.md"), "utf8");
  const r = spawnSync(process.execPath, ["--test", join(root, "tools", "test", "lint-voice.test.mjs")], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) return; // the test still fails, so 'Not fixed' is true
  const bad = [];
  for (const line of text.split("\n")) {
    if (/\bNot fixed\b/.test(line) && /lint-voice/.test(line) && !/\bfixed \d{4}-\d{2}-\d{2}\b/.test(line)) bad.push(`'Not fixed' with no dated fix: ${line.slice(0, 80)}`);
    if (/word lists equal the M-1-T03 rule table/.test(line) && /\| no \|$/.test(line)) bad.push(`row marked 'no' with no dated fix: ${line.slice(0, 80)}`);
  }
  const status = section(text, "Status");
  if (/Machine exit: not green/.test(status) && !/^Update \d{4}-\d{2}-\d{2}.*lint-voice T03 test is fixed/m.test(status)) bad.push("Status says 'Machine exit: not green' with no dated update that the T03 test is fixed");
  assert.deepEqual(bad, []);
});
