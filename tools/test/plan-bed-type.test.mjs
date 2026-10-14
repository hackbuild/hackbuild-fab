// Plan drift for the 3MF scalar keys and the build plate (D-226). The writers
// shipped curr_bed_type as a ninth scalar key while CHECKS.md, the M00-T07 card
// and PROFILE.md 8.1 still named eight and no bed type; each test reads the plan
// text and the code or data it describes and fails when they disagree.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));
const flat = (s) => s.replace(/\s+/g, " ");

const WORDS = { eight: 8, nine: 9, ten: 10, eleven: 11 };

/** Quoted strings of the first `<name> = [...]` or `<name> = (...)` list in a source text. */
function keyList(src, re, what) {
  const m = src.match(re);
  assert.ok(m, `${what}: SCALAR_KEYS list found`);
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]).sort();
}

const tsKeys = keyList(read("packages/3mf/src/writer/settings.ts"), /export const SCALAR_KEYS = \[([^\]]*)\]/, "settings.ts");
const pyKeys = keyList(read("tools/py/orca3mf.py"), /^SCALAR_KEYS = \(([^)]*)\)/m, "orca3mf.py");
const templateKeys = Object.keys(json("packages/3mf/data/filament_template.json").keys).length;

/** One `## <prefix>` section of a Markdown text up to the next `## `. */
function section(md, prefix) {
  const start = md.indexOf(`\n## ${prefix}`);
  assert.ok(start >= 0, `section ${prefix} present`);
  const next = md.indexOf("\n## ", start + 4);
  return md.slice(start, next < 0 ? undefined : next);
}

/** Names in an English list "a, b, c and d", backticks and trailing values removed. */
function namesOf(list) {
  return list.split(/,\s*|\s+and\s+/).map((s) => s.replace(/`/g, "").trim().split(/\s/)[0]).filter(Boolean).sort();
}

test("the TypeScript and Python writers declare the same scalar keys, curr_bed_type among them", () => {
  assert.deepEqual(pyKeys, tsKeys);
  assert.ok(tsKeys.includes("curr_bed_type"));
});

test("CHECKS.md CHK-3MF-03 note lists exactly the writer scalar keys and the per-export key count", () => {
  const checks = flat(read("docs/plan/CHECKS.md"));
  const m = checks.match(/CHK-3MF-03 under `--export`: outside the (\d+) template keys the writer writes exactly ([^(]+?) \(M00-T07 step 2/);
  assert.ok(m, "CHK-3MF-03 note present");
  assert.equal(+m[1], templateKeys, "template key count");
  assert.deepEqual(namesOf(m[2]), tsKeys);
  const n = checks.match(/curr_bed_type from MachinePreset\.slicer\.bedType, D-(\d{3})\), (\d+) keys per export \((\d+) \+ (\d+),/);
  assert.ok(n, "bed type source and key count in the note");
  assert.deepEqual([+n[2], +n[3], +n[4]], [templateKeys + tsKeys.length, templateKeys, tsKeys.length]);
  assert.match(read("docs/plan/DECISIONS.md"), new RegExp(`^### D-${n[1]} Build plate in the machine preset$`, "m"));
});

test("M00-T07 step 2, its acceptance and the validator row name every scalar key and the right count", () => {
  const m00 = read("docs/plan/milestones/M00-foundation.md");
  const t07 = flat(section(m00, "M00-T07"));
  const step2 = t07.slice(t07.indexOf("Outside the 127 template keys"), t07.indexOf("The 97-key seed"));
  assert.ok(step2.length > 0, "step 2 scalar key sentence");
  for (const k of tsKeys) assert.ok(step2.includes(`\`${k}\``), `step 2 names ${k}`);
  assert.ok(step2.includes(`127 + ${tsKeys.length} = ${templateKeys + tsKeys.length} keys`), "step 2 key count");
  const counts = [...flat(m00).matchAll(/(\w+) scalar keys of (?:M00-T07 )?step 2/g)];
  assert.ok(counts.length >= 2, "acceptance and validator row");
  for (const c of counts) assert.equal(WORDS[c[1]] ?? +c[1], tsKeys.length, c[0]);
});

test("PROFILE.md 8.1 bed type column equals the machine preset bedType", () => {
  const presets = json("packages/profile/data/machines.json");
  const rows = new Map();
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      if (typeof v.id === "string" && v.slicer) rows.set(v.id, v.slicer.bedType);
      Object.values(v).forEach(walk);
    }
  };
  walk(presets);
  const profile = read("docs/plan/PROFILE.md");
  const sec = profile.slice(profile.indexOf("### 8.1 Presets"), profile.indexOf("### 8.3"));
  const lines = sec.split("\n").filter((l) => l.startsWith("| "));
  const head = lines.find((l) => l.startsWith("| preset id | nozzle |"));
  assert.ok(head, "preset table header");
  const col = head.split("|").map((c) => c.trim()).indexOf("bed type");
  assert.ok(col > 0, "bed type column");
  let seen = 0;
  for (const l of lines) {
    const cells = l.split("|").map((c) => c.trim());
    const id = cells[1]?.replace(/`/g, "");
    if (!rows.has(id) || cells.length !== head.split("|").length) continue;
    seen++;
    assert.equal(cells[col].replace(/\s*\(owner\)$/, ""), rows.get(id), `${id} bed type`);
  }
  assert.ok(seen >= 2, "both ffc5p presets in the table");
});

test("spec/profile.ts cites the decision on bedType", () => {
  const spec = read("spec/profile.ts");
  const doc = spec.slice(spec.indexOf("Build plate written as project_settings curr_bed_type"), spec.indexOf("readonly bedType?"));
  assert.match(doc, /D-226/);
});
