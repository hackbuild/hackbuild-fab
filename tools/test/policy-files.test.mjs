// USE.md, SECURITY.md and TRADEMARKS.md hold the policy PLAN.md section 5
// and boundaries.md section 4 set (R1-rails-public-15). Each prohibited
// category must sit on its own bullet under "What you may not make", so
// deleting one bullet fails the test even when the word appears elsewhere.
// The settings rows SECURITY.md describes are read from
// .claude/settings.json, so the doc and the file cannot drift apart.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");
/** The text with every whitespace run as one space, for phrases that wrap. */
const flat = (text) => text.replace(/\s+/g, " ");

/** The body of the "## <heading>" section of a markdown text, up to the next "## " heading. */
export function section(text, heading) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith("## "));
  return (end < 0 ? rest : rest.slice(0, end)).join("\n");
}

/** Top-level bullets of a markdown block, continuation lines joined. */
export function bullets(block) {
  const out = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("- ")) out.push(line.slice(2));
    else if (/^\s+\S/.test(line) && out.length > 0) out[out.length - 1] += ` ${line.trim()}`;
  }
  return out;
}

// boundaries.md 4, rows one to three, and PLAN.md 5 bullet 4.
const PROHIBITED = [
  { id: "firearm parts", re: /\bfirearm/i },
  { id: "weapon components", re: /\bweapon/i },
  { id: "suppressors", re: /\bsuppressor/i },
  { id: "parts made to injure", re: /\binjure\b/i },
  { id: "restraints", re: /\brestraint/i },
  { id: "traps", re: /^traps?\b/i },
  { id: "marks the person does not own", re: /marks you do not own/i },
];

test("USE.md names each prohibited category on a bullet of its own section", () => {
  const block = section(read("USE.md"), "What you may not make");
  assert.ok(block, "USE.md lacks a '## What you may not make' section");
  const items = bullets(block);
  for (const { id, re } of PROHIBITED) {
    assert.ok(items.some((b) => re.test(b)), `USE.md names no bullet for ${id}`);
  }
});

test("USE.md states the gate, safety, key, provenance and warranty rules", () => {
  const use = read("USE.md");
  const safety = section(use, "Safety-critical parts");
  assert.ok(safety, "USE.md lacks a '## Safety-critical parts' section");
  for (const term of ["load on a person", "medical", "vehicle", "mains"]) {
    assert.ok(flat(safety).includes(term), `USE.md safety-critical scope lacks "${term}"`);
  }
  assert.match(safety, /exports as unproven until a person\s+enters a coupon/);
  const gate = section(use, "The export gate");
  assert.ok(gate, "USE.md lacks a '## The export gate' section");
  assert.match(gate, /person\s+only/);
  assert.match(gate, /covers\s+building,\s+never\s+exporting/);
  assert.match(section(use, "API keys") ?? "", /memory/);
  const prov = flat(section(use, "Provenance") ?? "");
  for (const field of ["design hash", "plugin", "partner tools", "inferred", "agent or a person"]) {
    assert.ok(prov.includes(field), `USE.md provenance lacks "${field}"`);
  }
  assert.ok(section(use, "No warranty"), "USE.md lacks a '## No warranty' section");
  assert.match(use, /No technical filter stops a determined person\s+\(inferred\)/);
});

test("SECURITY.md gives the report path, versions and the plugin threat model", () => {
  const sec = read("SECURITY.md");
  assert.match(section(sec, "Reporting a vulnerability") ?? "", /private vulnerability reporting on\s+hackbuild\/hackbuild-fab/);
  assert.match(section(sec, "Supported versions") ?? "", /No version has been released/);
  const plugins = section(sec, "Plugins and scripts") ?? "";
  assert.match(plugins, /sha256/);
  assert.match(plugins, /QuickJS with no file system, no network and no process/);
  assert.match(plugins, /cannot remove a check or ungate an exporter/);
  assert.match(plugins, /release 3/);
});

test("SECURITY.md names the settings rows that guard the gate, and they exist", () => {
  const gate = section(read("SECURITY.md"), "The export gate") ?? "";
  const { permissions } = JSON.parse(read(".claude/settings.json"));
  const denied = permissions.deny.filter((r) => r.startsWith("Read(./.hbf/")).map((r) => r.slice("Read(./".length, -1));
  assert.ok(denied.includes(".hbf/gate.key"), "settings no longer denies reads of .hbf/gate.key");
  for (const file of denied) assert.ok(gate.includes(`\`${file}\``), `SECURITY.md does not name the denied ${file}`);
  assert.ok(permissions.ask.some((r) => r.includes("export.run")), "settings no longer asks on export.run");
  assert.ok(permissions.ask.some((r) => r.includes("export_run")), "settings no longer asks on the export_run tool");
  assert.match(gate, /asks before every `export.run`/);
});

test("TRADEMARKS.md carries the inlay rule", () => {
  const block = section(read("TRADEMARKS.md"), "Marks on inlays");
  assert.ok(block, "TRADEMARKS.md lacks a '## Marks on inlays' section");
  assert.match(block, /marks you own or hold a\s+licence/);
  assert.match(block, /art source/);
  assert.match(block, /USE\.md/);
});

// PLAN.md 5: the policy is linked from the README, the skill and the print
// card. Rows marked pending wait for the item named; that item flips them.
const LINKS = [
  { file: "README.md" },
  { file: "CLAUDE.md" },
  { file: null, what: "print card template", pending: "engine print card item; template path not yet fixed" },
];

/** True when the text links USE.md as a markdown link or a bare path. */
export function linksUse(text) {
  return /\]\((?:\.\/)?USE\.md(?:#[^)]*)?\)/.test(text) || /(^|[\s`(])USE\.md\b/m.test(text);
}

for (const row of LINKS) {
  const name = row.file ?? row.what;
  test(`${name} links USE.md`, (t) => {
    const present = row.file !== null && existsSync(join(root, row.file));
    if (present && linksUse(read(row.file))) return;
    if (row.pending) {
      t.todo(`pending: ${row.pending}`);
      return;
    }
    assert.fail(`${name} does not link USE.md`);
  });
}

test("linksUse reads markdown links and bare paths, and rejects other names", () => {
  assert.ok(linksUse("see [the use policy](USE.md)."));
  assert.ok(linksUse("see [policy](./USE.md#safety-critical-parts)"));
  assert.ok(linksUse("policy: `USE.md`"));
  assert.ok(!linksUse("see MISUSE.md and USER.md"));
});
