// Every `references/<x>.md` and `scripts/<x>` that a knowledge reference copy names resolves.
// Finding (2026-10-20, R1-designs-reach-17): board-forge-SKILL.md lines 21 and 29 named a
// references/sensor-surfaces.md that no copy held, and board-forge/datasheets.md pointed at the
// datasheet-forge build and scaffold scripts that were never shipped (PLAN v9.1 section 3.4).
// A reference resolves inside its own skill folder: knowledge/references/<skill>-SKILL.md and
// every file in knowledge/references/<skill>/ read references/<x>.md as
// knowledge/references/<skill>/<x>.md. A script resolves to the repo file that holds this
// repo's version of it (SCRIPT_HOMES), and a name with no repo copy is listed in EXTERNAL with
// a reason. The board-forge and *-SKILL.md copies are kept out of git (.gitignore, owner
// archive), so a fresh checkout checks the tracked folders only and says so.
// Run: node --test knowledge/test/references-links.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const refs = join(root, "knowledge", "references");

// Repo homes of the skill scripts, read from `git ls-files` on 2026-10-20. The repo copies are
// the same files or newer versions (fab-knowledge:sources/downloads/skills-2026-10-06.md 3.2).
const SCRIPT_HOMES = {
  "board-forge": {
    "scripts/check3d.mjs": "packages/board/seed/check3d.mjs",
    "scripts/kicad_fetch.py": "tools/py/board/kicad_fetch.py",
    "scripts/price.py": "tools/py/board/price.py",
    "scripts/step2mesh.mjs": "packages/board/seed/step2mesh.mjs",
    "scripts/wrl.py": "tools/py/board/wrl.py",
  },
  "print-forge": {
    "scripts/build_bench.py": "tools/py/bench/build_bench.py",
    "scripts/build_orca3mf_js.py": "tools/py/build_orca3mf_js.py",
    "scripts/demo_coin.py": "tools/py/demo_coin.py",
    "scripts/filament_template.json": "packages/3mf/data/filament_template.json",
    "scripts/harvest_filament_keys.py": "tools/py/harvest_filament_keys.py",
    "scripts/orca3mf.py": "tools/py/orca3mf.py",
    "scripts/smoke_bench.py": "tools/py/bench/smoke_bench.py",
    "scripts/validate_3mf.py": "tools/py/validate_3mf.py",
  },
};

// Names no copy in the repo or the owner archive holds, each with the reason it stays named.
const EXTERNAL = {
  conduyt: {
    "references/flashing.md": "the installed conduyt skill is SKILL.md only; its three references were never copied anywhere (owner work outside the repo)",
    "references/patterns.md": "the installed conduyt skill is SKILL.md only; its three references were never copied anywhere (owner work outside the repo)",
    "references/sdk-api.md": "the installed conduyt skill is SKILL.md only; its three references were never copied anywhere (owner work outside the repo)",
  },
};

const TOKEN = /(?<![\w./:-])(references\/[\w.-]+\.md|scripts\/[\w.-]*\w)/g;

function mdFiles(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) mdFiles(p, out);
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

// The skill a reference copy belongs to: the stem of <skill>-SKILL.md, or its folder name.
function skillOf(file) {
  const rel = relative(refs, file).split("/");
  return rel.length === 1 ? basename(file).replace(/-SKILL\.md$/, "") : rel[0];
}

function mentions() {
  const out = [];
  for (const file of mdFiles(refs)) {
    const skill = skillOf(file);
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const m of line.matchAll(TOKEN)) out.push({ file: relative(root, file), line: i + 1, skill, name: m[1] });
    });
  }
  return out;
}

function resolves({ skill, name }) {
  if (name.startsWith("references/")) {
    if (existsSync(join(refs, skill, name.slice("references/".length)))) return "file";
  } else {
    const home = SCRIPT_HOMES[skill]?.[name];
    if (home) return existsSync(join(root, home)) ? "home" : `home ${home} missing`;
  }
  return EXTERNAL[skill]?.[name] ? "external" : null;
}

test("every references/ and scripts/ name in knowledge/references resolves or is external with a reason", (t) => {
  const all = mentions();
  assert.ok(all.length > 0, "no reference names found under knowledge/references");
  const bad = [];
  for (const m of all) {
    const r = resolves(m);
    if (r === null || r.startsWith("home ")) bad.push(`${m.file} line ${m.line}: ${m.name} ${r ?? `not in knowledge/references/${m.skill}/ and not listed`}`);
  }
  assert.deepEqual(bad, [], `unresolved names:\n${bad.join("\n")}`);
  const held = existsSync(join(refs, "board-forge-SKILL.md"));
  t.diagnostic(`${all.length} names in ${new Set(all.map((m) => m.file)).size} files resolved; board-forge archive copies ${held ? "present" : "absent, tracked folders only"}`);
});

test("every script home and external entry is still used and still needed", () => {
  const all = mentions();
  // An entry can only be judged stale when that skill's SKILL.md copy is on disk; a fresh
  // checkout holds only the tracked folders, which name a subset.
  const present = new Set(Object.keys({ ...SCRIPT_HOMES, ...EXTERNAL }).filter((s) => existsSync(join(refs, `${s}-SKILL.md`))));
  const stale = [];
  for (const [skill, table] of [...Object.entries(SCRIPT_HOMES), ...Object.entries(EXTERNAL)]) {
    if (!present.has(skill)) continue;
    for (const name of Object.keys(table)) {
      if (!all.some((m) => m.skill === skill && m.name === name)) stale.push(`${skill} ${name}: named by no copy`);
    }
  }
  for (const [skill, table] of Object.entries(EXTERNAL)) {
    for (const name of Object.keys(table)) {
      if (name.startsWith("references/") && existsSync(join(refs, skill, name.slice("references/".length)))) stale.push(`${skill} ${name}: listed external but the copy exists`);
    }
  }
  assert.deepEqual(stale, [], `stale entries:\n${stale.join("\n")}`);
});

test("the token pattern takes skill-relative names and skips repo paths", () => {
  const take = (s) => [...s.matchAll(TOKEN)].map((m) => m[1]);
  assert.deepEqual(take("read `references/vinyl-copper.md` and run scripts/price.py."), ["references/vinyl-copper.md", "scripts/price.py"]);
  assert.deepEqual(take("knowledge/references/board-forge/x.md and fab-knowledge:evidence/references/y.md"), []);
});
