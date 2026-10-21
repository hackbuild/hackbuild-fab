// Plan drift found by the third audit (2026-10-11, honesty-drift lens): plan text, milestone
// reports and the decision log that kept numbers or open questions the M06 and M08 builds had
// already moved. Each test reads the plan text and the thing it describes (counts.json, the
// reference tree, the HANDOFF environment table) and fails when they disagree. The notes
// directory is gitignored and HANDOFF.md lives in the sibling fab-knowledge folder, so a test
// that needs one of them skips where it is absent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const kb = join(root, "..", "fab-knowledge");
const read = (p) => readFileSync(join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));

const DECISIONS = read("docs/plan/DECISIONS.md");
const MILESTONES = read("docs/plan/MILESTONES.md");
const CANONS = read("docs/plan/CANONS.md");
const M06 = read("docs/plan/milestones/M06-canons.md");
const M08 = read("docs/plan/milestones/M08-board-catalog.md");
const M10 = read("docs/plan/milestones/M10-chase.md");
const counts = json("tools/reports/counts.json");

const HANDOFF_PATH = join(kb, "HANDOFF.md");
const M08_REPORT = join(root, ".hbf-notes", "m08-report.md");

/** The `### D-NNN` entry of the living log, heading to the next heading. */
function decision(id) {
  const start = DECISIONS.indexOf(`\n### ${id} `);
  assert.ok(start >= 0, `${id} has a heading`);
  const next = DECISIONS.slice(start + 1).search(/\n### |\n## /);
  return DECISIONS.slice(start, next < 0 ? undefined : start + 1 + next);
}
const indexRow = (id) => DECISIONS.split("\n").find((l) => l.startsWith(`| ${id} |`)) ?? "";
const milestoneRow = (id) => MILESTONES.split("\n").find((l) => l.startsWith(`| ${id} |`)) ?? "";

/** The section of a card from `## <id>` to the next `## `. */
function cardSection(md, id) {
  const start = md.indexOf(`\n## ${id} `);
  assert.ok(start >= 0, `section ${id} present`);
  const next = md.indexOf("\n## ", start + 4);
  return md.slice(start, next < 0 ? undefined : next);
}

test("the M06 exit split reads counts.json under a decision that refines D-203", () => {
  const { mechanisms, archetypes } = counts.canon;
  const row = milestoneRow("M06");
  assert.ok(row, "MILESTONES.md 1.1 has an M06 row");
  // The row may state a split only if it is the generated one.
  for (const m of row.matchAll(/typed (\d+)/g)) assert.equal(+m[1], mechanisms.byStatus.typed, `M06 row: ${m[0]}`);
  for (const m of row.matchAll(/proven (\d+)/g)) assert.equal(+m[1], archetypes.byStatus.proven, `M06 row: ${m[0]}`);
  const refining = [...DECISIONS.matchAll(/^### (D-\d{3}) .*$/gm)]
    .map((m) => m[1])
    .filter((id) => /refines D-203/.test(decision(id)));
  assert.ok(refining.length > 0, "a decision refines D-203 (exit splits read from counts.json)");
  const id = refining.at(-1);
  assert.match(decision(id), /counts\.json/, `${id} names counts.json`);
  assert.match(indexRow("D-203"), new RegExp(`refined by [^|]*${id}`), `D-203 Index row says refined by ${id}`);
  assert.match(row, new RegExp(id), `MILESTONES.md M06 row cites ${id}`);
  for (const m of CANONS.matchAll(/Expected split at M06 exit[^\n]*(?:\n[^\n]+){0,6}/g))
    assert.match(m[0], new RegExp(`${id}[^\\n]*|counts\\.json`), `CANONS.md "${m[0].slice(0, 60)}" points at counts.json`);
  const exitRows = M06.split("\n").filter((l) => /^\| (24 seeded mechanisms|29 seeded archetypes)/.test(l) && /split/.test(l));
  assert.equal(exitRows.length, 2, "two M06 Exit split rows");
  for (const r of exitRows) assert.match(r, new RegExp(`counts\\.json[^|]*${id}|${id}[^|]*counts\\.json`), `M06 Exit row cites counts.json and ${id}: ${r.slice(0, 60)}`);
});

test("M10 Inputs name only reference folders an earlier milestone made, or say they do not exist yet", () => {
  const lines = M10.split("\n");
  let inInputs = false;
  const missing = [];
  for (const l of lines) {
    if (/^Inputs:/.test(l)) inInputs = true;
    else if (/^(Steps|Goal|Files to create|Acceptance):|^## /.test(l)) inInputs = false;
    if (!inInputs || !l.startsWith("- ")) continue;
    // A producer from M00 to M08 means the folder should already be on disk.
    if (!/\(M0[0-8]\b/.test(l)) continue;
    if (/do(es)? not exist yet/.test(l)) continue;
    for (const m of l.matchAll(/reference\/([a-z0-9-]+)\/([a-z0-9-]+)((?:,? and [a-z0-9-]+)*)/g)) {
      const more = [...m[3].matchAll(/and ([a-z0-9-]+)/g)].map((x) => x[1]);
      for (const leaf of [m[2], ...more]) {
        const p = `reference/${m[1]}/${leaf}`;
        if (!existsSync(join(root, p))) missing.push(p);
      }
    }
  }
  assert.deepEqual(missing, [], "M10 Inputs name reference folders that do not exist; say so on the line and give a step that makes them");
});

test("M10-T08 makes geneva-3 and detent-strip and promotes the two KNURL mechanisms", () => {
  const t08 = cardSection(M10, "M10-T08");
  const files = t08.slice(t08.indexOf("Files to create:"), t08.indexOf("Acceptance:"));
  for (const leaf of ["geneva-3", "detent-strip"]) {
    if (existsSync(join(root, "reference/mechanisms", leaf))) continue;
    assert.match(files, new RegExp(`reference/mechanisms/${leaf}`), `M10-T08 Files to create lists reference/mechanisms/${leaf}`);
    assert.match(t08.slice(t08.indexOf("Acceptance:")), new RegExp(`hbf parity reference/mechanisms/${leaf}`), `M10-T08 Acceptance reruns parity on ${leaf}`);
  }
  for (const id of ["geneva-external", "count-wheel-detent"])
    assert.match(t08.slice(t08.indexOf("Steps:")), new RegExp(`${id}[^.]*typed|typed[^.]*${id}`), `an M10-T08 step promotes ${id} to typed`);
});

test("the wiring parity target M08 built is a recorded decision, not an open owner pick", () => {
  const built = ["wiring-tang-r5", "wiring-supermini"].filter((d) => existsSync(join(root, "reference/boards", d)));
  if (!built.includes("wiring-tang-r5")) return;
  const ids = [...DECISIONS.matchAll(/^### (D-\d{3}) .*[Ww]iring parity.*$/gm)].map((m) => m[1]);
  assert.equal(ids.length, 1, "one decision names the wiring parity target");
  const id = ids[0];
  assert.match(decision(id), /TANG R5/, `${id} names TANG R5`);
  const row = milestoneRow("M08");
  assert.doesNotMatch(row, /owner picks/, "MILESTONES.md 1.1 M08 row still says the owner picks");
  assert.match(row, new RegExp(id), `M08 row cites ${id}`);
  const open = MILESTONES.split("\n").find((l) => l.startsWith("| wiring parity target"));
  if (open) {
    assert.doesNotMatch(open, /no decision names the target|owner picks/, "MILESTONES.md 1.4 wiring row is still open");
    assert.match(open, new RegExp(id), `MILESTONES.md 1.4 wiring row cites ${id}`);
  }
  const step4 = M08.split("\n").find((l) => /^4\. Parity: three candidates/.test(l)) ?? "";
  assert.match(step4, new RegExp(id), `M08-T13 step 4 cites ${id}`);
});

test("the M08 report and card give the Playwright reason HANDOFF section 5 records", { skip: !existsSync(HANDOFF_PATH) && "HANDOFF absent" }, () => {
  const env = readFileSync(HANDOFF_PATH, "utf8").split("\n").find((l) => l.startsWith("| Playwright |")) ?? "";
  if (!/executablePath/.test(env)) return;
  const texts = [["M08 card", M08]];
  if (existsSync(M08_REPORT)) texts.push(["m08-report", readFileSync(M08_REPORT, "utf8")]);
  for (const [where, t] of texts)
    assert.doesNotMatch(t.replace(/\s+/g, " "), /Playwright( 1\.63)? refuses macOS 12/, `${where} says Playwright refuses macOS 12, against HANDOFF 5 (executablePath on the system Chrome)`);
});

test("every owner question in the M05 to M08 Blockers tables carries a decision id", () => {
  for (const card of ["M05-circuit-copper.md", "M06-canons.md", "M07-motion-nest.md", "M08-board-catalog.md"]) {
    const md = read(`docs/plan/milestones/${card}`);
    for (const l of md.split("\n").filter((x) => x.startsWith("| "))) {
      const cells = l.split("|").map((c) => c.trim());
      assert.doesNotMatch(cells[2] ?? "", /^card question/, `${card}: "${cells[1]}" is an owner question with no D-id`);
    }
  }
});

test("the M08 report summary names the rows that fail as recorded", { skip: !existsSync(M08_REPORT) && ".hbf-notes absent" }, () => {
  const r = readFileSync(M08_REPORT, "utf8");
  const summary = r.slice(0, r.indexOf("Evidence roots"));
  assert.doesNotMatch(summary.replace(/\s+/g, " "), /Every locally runnable M08 Exit row passes as amended/, "summary calls failing rows passing");
  const shunt = M08.split("\n").find((l) => l.startsWith("| SHUNT floating nets expect set")) ?? "";
  const id = shunt.match(/D-\d{3}/)?.[0];
  assert.ok(id, "the SHUNT floating set row carries a D-id");
  for (const d of ["D-249", id]) assert.ok(summary.includes(d), `summary names ${d}`);
});
