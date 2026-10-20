// Status claims in the milestone reports (.hbf-notes) and in the HANDOFF status table must agree
// with the card Exit tables and with the rows the same report marks not run. Added by the
// implementation audit of 2026-10-06: HANDOFF said M-S 'exit A green' while the card's Done when
// needs CI and a person read of the section PNGs, and the M00 report said every M00-T01 to
// M00-T15 Exit row passes while its own T14 and T15 rows were not run and the card has no T01 or
// T04 row. The notes directory is gitignored and HANDOFF.md lives in the sibling fab-knowledge
// folder, so each test skips where its file is absent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const notes = join(root, ".hbf-notes");
const handoff = join(root, "..", "fab-knowledge", "HANDOFF.md");
const milestones = join(root, "docs", "plan", "milestones");

const STATUS_VALUES = ["not started", "in progress", "exit A green", "green", "blocked", "superseded"];

const reports = () =>
  existsSync(notes)
    ? readdirSync(notes)
        .filter((n) => n.endsWith("-report.md"))
        .sort()
        .map((n) => ({ name: n, text: readFileSync(join(notes, n), "utf8") }))
    : [];

/** Table rows of a markdown text as arrays of trimmed cells. */
const rows = (md) =>
  md
    .split("\n")
    .filter((l) => l.startsWith("| ") && !/^\|[-| ]+\|$/.test(l))
    .map((l) => l.slice(1, -1).split(" | ").map((c) => c.trim()));

/** Text from `## <prefix>` to the next `## `, or "" when absent. */
function section(md, prefix) {
  const start = md.indexOf(`\n## ${prefix}`);
  if (start < 0) return "";
  const next = md.indexOf("\n## ", start + 4);
  return md.slice(start, next < 0 ? undefined : next);
}

/** Card numbers a cell names: 'M00-T07/T08/T14' gives [7, 8, 14], 'T09' gives [9]. */
const cardNumbers = (cell) => [...cell.matchAll(/T(\d+)/g)].map((m) => Number(m[1]));

/** Card numbers in a milestone card's `## Exit` table, keyed by milestone id (M-1, M-S, M00). */
function exitCards(milestone) {
  const file = readdirSync(milestones).find((n) => n.startsWith(`${milestone}-`) && n.endsWith(".md"));
  assert.ok(file, `card file for ${milestone}`);
  const exit = section(readFileSync(join(milestones, file), "utf8"), "Exit");
  assert.ok(exit, `${file} has an Exit section`);
  const [head, ...body] = rows(exit);
  const col = head.indexOf("card");
  assert.ok(col >= 0, `${file} Exit table has a card column`);
  return new Set(body.flatMap((r) => cardNumbers(r[col] ?? "")));
}

/** Report Exit-table rows for one milestone that did not pass: a cell says 'not run', or the pass column starts with 'no' or names a step still due. */
function unpassedRows(report, milestone) {
  const table = section(report, "Exit table");
  const [head, ...body] = rows(table);
  if (!head) return [];
  const pass = head.indexOf("pass");
  const short = milestone === "M-S" || milestone === "M-1";
  return body
    .filter((r) => (short ? new RegExp(`^(?:${milestone}-)?T\\d`).test(r[0]) : r[0].startsWith(`${milestone}-`)))
    .filter((r) => r.slice(2).some((c) => /\bnot run\b/.test(c)) || (pass >= 0 && /^no\b|\bdue\b/.test(r[pass] ?? "")));
}

/** Every 'every <M>-T<a> to <M>-T<b> Exit row passes' claim in a text. */
const rangeClaims = (text) =>
  [...text.matchAll(/[Ee]very (M-?[0-9S]+|M-1)-T(\d+) to (?:\1-)?T(\d+) Exit row passes/g)].map((m) => ({
    claim: m[0],
    milestone: m[1],
    from: Number(m[2]),
    to: Number(m[3]),
  }));

const sources = () => [
  ...reports(),
  ...(existsSync(handoff) ? [{ name: "HANDOFF.md", text: readFileSync(handoff, "utf8") }] : []),
];

test("an 'every Tn to Tm Exit row passes' claim names only cards with Exit rows that ran", { skip: !existsSync(notes) && ".hbf-notes absent" }, () => {
  const bad = [];
  const byMilestone = Object.fromEntries(reports().map((r) => [r.name.replace(/-report\.md$/, "").toUpperCase(), r.text]));
  for (const { name, text } of sources()) {
    for (const c of rangeClaims(text)) {
      const cards = exitCards(c.milestone);
      for (let n = c.from; n <= c.to; n++) if (!cards.has(n)) bad.push(`${name}: '${c.claim}' but the card has no T${String(n).padStart(2, "0")} Exit row`);
      const report = byMilestone[c.milestone] ?? "";
      for (const r of unpassedRows(report, c.milestone)) {
        if (cardNumbers(r[0]).some((n) => n >= c.from && n <= c.to)) bad.push(`${name}: '${c.claim}' but row ${r[0]} did not pass`);
      }
    }
  }
  assert.deepEqual(bad, []);
});

test("report headlines do not call an exit green while a row of that exit did not pass or CI did not run", { skip: !existsSync(notes) && ".hbf-notes absent" }, () => {
  const bad = [];
  for (const { name, text } of reports()) {
    const milestone = name.replace(/-report\.md$/, "").toUpperCase();
    const head = text.split("\n## ")[0];
    const claimsGreen = /Status: (?:exit A )?green\b|Status: exit A green/.test(head);
    if (!claimsGreen) continue;
    if (/Not run: CI\b|CI \(no push/.test(head)) bad.push(`${name}: headline says green while CI did not run`);
    const exitA = milestone === "M-S" ? (r) => cardNumbers(r[0]).every((n) => n <= 9) : () => true;
    for (const r of unpassedRows(text, milestone).filter(exitA)) bad.push(`${name}: headline says green while row ${r[0]} did not pass`);
  }
  for (const { name, text } of reports()) {
    if (/M-S exit A (?:stays|is) green/.test(text)) {
      if (/Not run: CI\b|CI \(no push/.test(text)) bad.push(`${name}: says M-S exit A green while CI did not run`);
      const ms = reports().find((r) => r.name === "m-s-report.md");
      if (ms && unpassedRows(ms.text, "M-S").some((r) => cardNumbers(r[0]).every((n) => n <= 9))) bad.push(`${name}: says M-S exit A green while an M-S exit A row did not pass`);
    }
  }
  assert.deepEqual(bad, []);
});

test("HANDOFF status cells use a defined value and claim no green the evidence does not carry", { skip: !existsSync(handoff) && "HANDOFF.md absent" }, () => {
  const text = readFileSync(handoff, "utf8");
  const status = section(text, "6. Implementation status");
  assert.ok(status, "HANDOFF section 6 present");
  const [head, ...body] = rows(status);
  const col = head.indexOf("status");
  assert.ok(col >= 0, "status column");
  const bad = [];
  for (const r of body) {
    const cell = r[col];
    const value = STATUS_VALUES.filter((v) => cell === v || cell.startsWith(`${v}:`) || cell.startsWith(`${v} `)).sort((a, b) => b.length - a.length)[0];
    if (!value) {
      bad.push(`${r[0]}: status '${cell.slice(0, 40)}' is not one of ${STATUS_VALUES.join(", ")}`);
      continue;
    }
    if (value === "exit A green" && r[0] !== "M-S") bad.push(`${r[0]}: exit A green is for M-S only`);
    if (value === "exit A green" || value === "green") {
      if (/not run: CI\b|CI \(no push\)|no push/.test(cell)) bad.push(`${r[0]}: ${value} while CI did not run`);
      const ms = reports().find((x) => x.name === "m-s-report.md");
      if (r[0] === "M-S" && ms && unpassedRows(ms.text, "M-S").some((x) => cardNumbers(x[0]).every((n) => n <= 9))) bad.push("M-S: exit A green while an exit A row in m-s-report.md did not pass");
    }
  }
  assert.deepEqual(bad, []);
});
